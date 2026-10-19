/**
 * Regras puras de redefinição de senha.
 *
 * Este módulo NÃO importa Firebase e pode ser usado tanto no cliente
 * (para filtrar a lista exibida) quanto no servidor (para autorizar a rota).
 */

export const TEMPORARY_PASSWORD = "123456";

export const STAFF_ROLES = ["admin", "secretario"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type ResetTargetRole = "professor" | "secretario";

const LOGIN_EMAIL_DOMAIN = "@labschool.app";

/**
 * O app não possui papel "coordenador" separado: `admin` é o Coordenador.
 */
export function isStaffRole(role: unknown): role is StaffRole {
  return role === "admin" || role === "secretario";
}

/**
 * Papéis que cada ator pode redefinir.
 * - admin (Coordenador): professores e secretarias
 * - secretary (Secretaria): somente professores
 * - qualquer outro: nenhum
 */
export function allowedTargetRoles(callerRole: unknown): ResetTargetRole[] {
  if (callerRole === "admin") return ["professor", "secretario"];
  if (callerRole === "secretario") return ["professor"];
  return [];
}

export function canResetPassword(callerRole: unknown, targetRole: unknown): boolean {
  if (typeof targetRole !== "string") return false;
  return allowedTargetRoles(callerRole).some((role) => role === targetRole);
}

/**
 * O login do app é a parte local do e-mail sintético `<login>@labschool.app`.
 * Retorna `null` para e-mails ausentes ou fora desse domínio.
 */
export function loginFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(LOGIN_EMAIL_DOMAIN)) return null;
  const login = normalized.slice(0, -LOGIN_EMAIL_DOMAIN.length);
  return login.length > 0 ? login : null;
}

/**
 * UIDs do Firebase Auth são alfanuméricos. A validação evita paths estranhos
 * no Firestore e chamadas desnecessárias ao Admin SDK.
 */
export function isValidTargetUid(uid: unknown): boolean {
  if (typeof uid !== "string") return false;
  const trimmed = uid.trim();
  return trimmed.length > 0 && trimmed.length <= 128 && /^[A-Za-z0-9]+$/.test(trimmed);
}
