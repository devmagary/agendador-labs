"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Search,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { RoleBadge } from "@/components/RoleBadge";
import {
  allowedTargetRoles,
  isStaffRole,
} from "@/lib/password-reset-policy";

interface ManagedUser {
  id: string;
  name: string;
  role: string;
}

interface ResetResult {
  target: {
    uid: string;
    name: string;
    role: string;
    login: string | null;
  };
  temporaryPassword: string;
  warning?: string;
}

interface ResetResponse extends ResetResult {
  ok?: boolean;
  error?: string;
  code?: string;
}

export default function ResetPasswordsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }
    if (!isStaffRole(user.role)) {
      router.push("/dashboard");
      return;
    }
    if (user.mustChangePassword) {
      router.push("/change-password");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isStaffRole(user.role)) return;

    const allowed = allowedTargetRoles(user.role);
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: ManagedUser[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id === user.uid) return;
          const data = docSnap.data();
          const role = typeof data.role === "string" ? data.role : "";
          if (!allowed.some((allowedRole) => allowedRole === role)) return;
          list.push({
            id: docSnap.id,
            name:
              typeof data.name === "string" && data.name.trim()
                ? data.name.trim()
                : "Usuário",
            role,
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setManagedUsers(list);
        setLoadingUsers(false);
      },
      (snapshotError) => {
        console.error("Erro ao carregar usuários:", snapshotError);
        setError("Não foi possível carregar a lista de usuários.");
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return managedUsers;
    return managedUsers.filter((candidate) =>
      candidate.name.toLowerCase().includes(query)
    );
  }, [managedUsers, search]);

  const handleReset = async (target: ManagedUser) => {
    setError("");
    setResult(null);
    setCopied(false);

    const confirmed = window.confirm(
      `Redefinir a senha de ${target.name} para uma senha temporária?\n\n` +
        "O usuário precisará entrar novamente e será obrigado a cadastrar uma nova senha. " +
        "As reservas existentes serão preservadas."
    );
    if (!confirmed) return;

    setResettingUid(target.id);
    try {
      if (!auth.currentUser) {
        throw new Error("Sessão não encontrada. Entre novamente.");
      }
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: target.id }),
      });

      const data = (await response.json().catch(() => null)) as ResetResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/");
          return;
        }
        throw new Error(data?.error || "Não foi possível redefinir a senha.");
      }

      if (!data?.target || !data.temporaryPassword) {
        throw new Error("Resposta inválida do servidor.");
      }

      setResult({
        target: data.target,
        temporaryPassword: data.temporaryPassword,
        warning: data.warning,
      });
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Não foi possível redefinir a senha."
      );
    } finally {
      setResettingUid(null);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = [
      `Acesso: ${result.target.login ?? result.target.name}`,
      `Senha temporária: ${result.temporaryPassword}`,
      "No próximo acesso, o sistema solicitará a criação de uma nova senha.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  };

  if (loading || !user || !isStaffRole(user.role)) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
      <Header
        currentRoute="/senhas"
        title="Redefinir Senhas"
        subtitle="Gestão & Segurança"
        user={user}
        showBack
        backHref="/dashboard"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent dark:from-rose-950/40 dark:via-amber-950/20 dark:to-transparent p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/25">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Redefinição de senha de usuários
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Redefina a senha de quem esqueceu o acesso. Nenhum e-mail é necessário: o
                  usuário entra com o login/matrícula e a senha temporária{" "}
                  <strong className="text-gray-900 dark:text-white">123456</strong>, e o sistema
                  exige a criação de uma nova senha no próximo acesso.
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-1">
                  <li>As reservas e o histórico do usuário são preservados.</li>
                  <li>
                    Coordenação pode redefinir professores e secretarias; a Secretaria apenas
                    professores.
                  </li>
                  <li>
                    Contas de Coordenador/Admin não são redefinidas por esta tela — use
                    &quot;Trocar Senha&quot;.
                  </li>
                  <li>
                    Professores pré-autorizados que ainda não acessaram o sistema não aparecem
                    aqui.
                  </li>
                  <li>Toda redefinição fica registrada em Histórico &amp; Ranking.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-2xl text-sm border border-red-200 dark:border-red-900/60 font-medium flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <section
            aria-live="polite"
            className="bg-white dark:bg-gray-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm overflow-hidden transition-colors"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 border-b border-emerald-100 dark:border-emerald-900/50 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Senha redefinida para {result.target.name}
                </h2>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Repasse o acesso abaixo. A troca será obrigatória no próximo acesso.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Login
                  </span>
                  <p className="font-mono text-sm font-bold text-gray-900 dark:text-white mt-1 break-all">
                    {result.target.login ?? "(consultar cadastro)"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Senha temporária
                  </span>
                  <p className="font-mono text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {result.temporaryPassword}
                  </p>
                </div>
              </div>

              {result.warning && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3">
                  {result.warning}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copiado!" : "Copiar instruções"}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Por segurança, o usuário deve sair de outros dispositivos e entrar novamente. As
                sessões antigas são encerradas no próximo acesso.
              </p>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Usuários disponíveis
              </h2>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-900/60">
                {managedUsers.length}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Carregando usuários...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Nenhum usuário encontrado
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {search.trim()
                  ? "Tente outro nome."
                  : "Não há professores/secretarias cadastrados para o seu perfil."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[560px]">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-5 py-3">Perfil</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredUsers.map((managedUser) => (
                    <tr
                      key={managedUser.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                        {managedUser.name}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={managedUser.role} size="xs" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleReset(managedUser)}
                          disabled={resettingUid !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-[11px] transition-colors"
                        >
                          {resettingUid === managedUser.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <KeyRound className="w-3.5 h-3.5" />
                          )}
                          {resettingUid === managedUser.id
                            ? "Redefinindo..."
                            : "Redefinir senha"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
