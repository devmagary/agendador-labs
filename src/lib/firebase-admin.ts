/**
 * Inicialização do Firebase Admin SDK (somente servidor).
 *
 * IMPORTANTE: este módulo nunca deve ser importado por componentes client.
 * A inicialização é preguiçosa para não quebrar o build quando as variáveis
 * de ambiente não estiverem presentes.
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "agendalab-admin";

export class AdminConfigError extends Error {
  readonly code = "admin/not-configured";

  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

let cachedApp: App | null = null;

interface AdminEnvironment {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Normaliza valores colados na Vercel: remove espaços e aspas externas
 * (comuns ao copiar o valor de um JSON/arquivo .env).
 */
function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readAdminEnvironment(): AdminEnvironment {
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const rawPrivateKey = cleanEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  const privateKey = rawPrivateKey
    ? rawPrivateKey.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim()
    : "";

  const missing: string[] = [];
  if (!projectId) missing.push("FIREBASE_ADMIN_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new AdminConfigError(`Variáveis ausentes: ${missing.join(", ")}.`);
  }

  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (publicProjectId && publicProjectId !== projectId) {
    throw new AdminConfigError(
      "FIREBASE_ADMIN_PROJECT_ID não corresponde ao projeto configurado no app."
    );
  }

  return {
    projectId: projectId as string,
    clientEmail: clientEmail as string,
    privateKey,
  };
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const { projectId, clientEmail, privateKey } = readAdminEnvironment();

  try {
    cachedApp = initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }) },
      ADMIN_APP_NAME
    );
    return cachedApp;
  } catch (error) {
    throw new AdminConfigError(
      error instanceof Error
        ? `Falha ao inicializar o Firebase Admin: ${error.message}`
        : "Falha ao inicializar o Firebase Admin."
    );
  }
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}
