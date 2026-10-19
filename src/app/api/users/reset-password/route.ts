import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import {
  AdminConfigError,
  getAdminAuth,
  getAdminFirestore,
} from "@/lib/firebase-admin";
import {
  TEMPORARY_PASSWORD,
  canResetPassword,
  isStaffRole,
  isValidTargetUid,
  loginFromEmail,
} from "@/lib/password-reset-policy";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : "";
  }
  return "";
}

function isInvalidTokenError(code: string): boolean {
  return [
    "auth/id-token-expired",
    "auth/id-token-revoked",
    "auth/invalid-id-token",
    "auth/argument-error",
    "auth/invalid-credential",
  ].includes(code);
}

interface ResetPasswordBody {
  targetUid?: unknown;
}

/**
 * POST /api/users/reset-password
 *
 * Redefine a senha de um usuário para a senha temporária, sem e-mail.
 * Somente admin (Coordenador) e secretario (Secretaria) podem chamar.
 */
export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!token) {
      return json(
        { error: "Sessão não informada. Entre novamente.", code: "UNAUTHENTICATED" },
        401
      );
    }

    let adminAuth: ReturnType<typeof getAdminAuth>;
    let adminDb: ReturnType<typeof getAdminFirestore>;
    try {
      adminAuth = getAdminAuth();
      adminDb = getAdminFirestore();
    } catch (error) {
      if (error instanceof AdminConfigError) {
        console.error("[reset-password] Firebase Admin não configurado:", error.message);
        return json(
          {
            error: "Serviço de redefinição indisponível no momento.",
            code: "NOT_CONFIGURED",
          },
          503
        );
      }
      throw error;
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch (error) {
      if (isInvalidTokenError(errorCode(error))) {
        return json(
          { error: "Sessão inválida ou expirada. Entre novamente.", code: "UNAUTHENTICATED" },
          401
        );
      }
      throw error;
    }

    const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
    if (!callerSnap.exists) {
      return json(
        { error: "Você não tem permissão para redefinir senhas.", code: "FORBIDDEN" },
        403
      );
    }
    const caller = callerSnap.data();
    if (!caller || !isStaffRole(caller.role)) {
      return json(
        { error: "Você não tem permissão para redefinir senhas.", code: "FORBIDDEN" },
        403
      );
    }
    if ((caller.mustChangePassword ?? true) === true) {
      return json(
        {
          error: "Altere a sua própria senha antes de redefinir a de outros usuários.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        403
      );
    }

    const body = (await request.json().catch(() => null)) as ResetPasswordBody | null;
    const targetUid = typeof body?.targetUid === "string" ? body.targetUid.trim() : "";
    if (!isValidTargetUid(targetUid)) {
      return json({ error: "Usuário inválido.", code: "BAD_REQUEST" }, 400);
    }
    if (targetUid === decoded.uid) {
      return json(
        {
          error: "Use a tela de Trocar Senha para alterar a sua própria senha.",
          code: "BAD_REQUEST",
        },
        400
      );
    }

    const targetSnap = await adminDb.doc(`users/${targetUid}`).get();
    if (!targetSnap.exists) {
      return json(
        { error: "Usuário não encontrado no cadastro.", code: "NOT_FOUND" },
        404
      );
    }
    const target = targetSnap.data();
    if (!target) {
      return json(
        { error: "Usuário não encontrado no cadastro.", code: "NOT_FOUND" },
        404
      );
    }
    if (!canResetPassword(caller.role, target.role)) {
      return json(
        {
          error: "Você não tem permissão para redefinir a senha deste usuário.",
          code: "FORBIDDEN",
        },
        403
      );
    }

    let authUser: UserRecord;
    try {
      authUser = await adminAuth.getUser(targetUid);
    } catch (error) {
      if (errorCode(error) === "auth/user-not-found") {
        return json(
          {
            error:
              "Este usuário não possui conta de autenticação ativa. Use o procedimento manual do Console.",
            code: "NOT_FOUND",
          },
          404
        );
      }
      throw error;
    }
    if (authUser.disabled) {
      return json(
        {
          error: "A conta deste usuário está desativada. Reative-a no Console do Firebase.",
          code: "CONFLICT",
        },
        409
      );
    }

    const callerName =
      typeof caller.name === "string" && caller.name.trim() ? caller.name.trim() : "Usuário";
    const targetName =
      typeof target.name === "string" && target.name.trim() ? target.name.trim() : "Usuário";
    const targetRole = typeof target.role === "string" ? target.role : "desconhecido";

    // Ponto crítico: a partir daqui a senha do usuário é substituída.
    await adminAuth.updateUser(targetUid, { password: TEMPORARY_PASSWORD });

    try {
      await adminDb.doc(`users/${targetUid}`).update({ mustChangePassword: true });
    } catch (error) {
      console.error("[reset-password] Falha ao marcar mustChangePassword:", error);
      return json(
        {
          error:
            "A senha foi alterada, mas não foi possível exigir a troca no próximo acesso. Tente novamente.",
          code: "PARTIAL_FAILURE",
        },
        500
      );
    }

    const warnings: string[] = [];

    try {
      await adminAuth.revokeRefreshTokens(targetUid);
    } catch (error) {
      console.error("[reset-password] Falha ao revogar refresh tokens:", error);
      warnings.push("Não foi possível encerrar as sessões antigas.");
    }

    try {
      await adminDb.collection("logs").add({
        professorId: decoded.uid,
        professorName: callerName,
        action: "password_reset",
        performedBy: { uid: decoded.uid, name: callerName, role: caller.role },
        targetProfessorId: targetUid,
        targetProfessorName: targetName,
        details: `redefiniu a senha de ${targetName} (${targetRole}) para a senha temporária. O usuário deverá trocá-la no próximo acesso.`,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("[reset-password] Falha ao registrar log:", error);
      warnings.push("Não foi possível registrar a ação no histórico.");
    }

    return json({
      ok: true,
      target: {
        uid: targetUid,
        name: targetName,
        role: targetRole,
        login: loginFromEmail(authUser.email),
      },
      temporaryPassword: TEMPORARY_PASSWORD,
      ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
    });
  } catch (error) {
    console.error("[reset-password] Erro inesperado:", error);
    return json(
      { error: "Não foi possível redefinir a senha. Tente novamente.", code: "INTERNAL" },
      500
    );
  }
}
