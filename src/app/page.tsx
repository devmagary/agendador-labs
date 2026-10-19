"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { CalendarClock, X, Info, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// WhatsApp do Prof. Thauan Silva para solicitações de redefinição de senha
const WHATSAPP_THAUAN_NUMBER = "5575998645730";

const buildWhatsAppLink = (username: string) => {
  const name = username.trim();
  const message = [
    "Olá, Prof. Thauan Silva!",
    "",
    "Esqueci minha senha de acesso ao sistema de Agendamento de Labs e gostaria de solicitar a redefinição.",
    name ? `Meu usuário/matrícula: ${name}` : "Meu usuário/matrícula: (informar)",
    "",
    "Desde já, obrigado(a)!",
  ].join("\n");
  return `https://wa.me/${WHATSAPP_THAUAN_NUMBER}?text=${encodeURIComponent(message)}`;
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingAction(true);

    if (!username.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      setLoadingAction(false);
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    const email = `${cleanUsername}@labschool.app`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success, useEffect will route
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials') {
        
        // --- 1. MAGIC ADMIN CREATION ---
        if (cleanUsername === "admin" && password === "123456") {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
              name: "Coordenador Geral",
              role: "admin",
              mustChangePassword: true
            });
            return;
          } catch (createErr: unknown) {
             const cErr = createErr as Error;
             setError("Falha ao criar conta Admin inicial: " + cErr.message);
             return;
          }
        }

        // --- 2. PROFESSOR CHECK ALLOW LIST ---
        if (password === "123456") {
           try {
              const { getDoc } = await import("firebase/firestore");
              const allowedDoc = await getDoc(doc(db, "allowed_users", cleanUsername));
              
              if (allowedDoc.exists()) {
                 const allowedData = allowedDoc.data();
                 const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                 // Register in users
                 await setDoc(doc(db, "users", userCredential.user.uid), {
                   name: allowedData.name,
                   role: allowedData.role || "professor",
                   mustChangePassword: true
                 });
                 // Remove from temporary allowed list
                 const { deleteDoc } = await import("firebase/firestore");
                 await deleteDoc(doc(db, "allowed_users", cleanUsername));
              } else {
                 setError("Acesso não autorizado pelo Coordenador ou Credenciais inválidas.");
              }
           } catch(e: unknown) {
              setError("Erro ao verificar cadastro: " + (e as Error).message);
           }
        } else {
             setError("Usuário não encontrado ou senha inválida. Tente novamente.");
        }
      } else {
        setError("Erro ao fazer login: " + (authErr.message || "Erro desconhecido"));
      }
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading || user) return null; // Avoid flicker

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 transition-colors relative">
      {/* FLOATING THEME TOGGLE */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle variant="icon" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <CalendarClock className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Agendamento de Labs</h1>
          <p className="text-blue-100 text-sm mt-2">Acesso do Professor</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm transition-all duration-300 ease-in-out font-medium border border-red-100 dark:border-red-900/60">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome ou Matrícula</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="Ex: Carlos Silva"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="Sua senha"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Dica: No primeiro acesso ou após uma redefinição, use a senha padrão &quot;123456&quot;</p>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>

          <button
            disabled={loadingAction}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
          >
            {loadingAction ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "Entrar ou Criar Acesso Primeira Vez"}
          </button>
        </form>
      </div>

      {showForgotPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 id="forgot-password-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  Esqueci minha senha
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Para recuperar ou redefinir sua senha, entre em contato com o professor responsável ou procure a Recepção da Secretária.
            </p>

            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                <span className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">1.</span>
                <span>
                  Contacte o{" "}
                  <a
                    href={buildWhatsAppLink(username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-green-600 dark:text-green-400 underline decoration-green-500/50 underline-offset-2 hover:text-green-700 dark:hover:text-green-300 hover:decoration-green-500 transition-colors"
                    title="Enviar mensagem pelo WhatsApp"
                  >
                    Prof. Thauan Silva
                  </a>
                  {" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400">(abre o WhatsApp com a mensagem de solicitação)</span>
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                <span className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">2.</span>
                <span>Ou vá até a <strong className="text-gray-900 dark:text-white">Recepção da Secretária</strong> para resetar a senha</span>
              </li>
            </ul>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Após a redefinição, utilize a senha temporária padrão &quot;123456&quot; e crie uma nova senha no primeiro acesso.
            </p>

            <a
              href={buildWhatsAppLink(username)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Solicitar redefinição pelo WhatsApp
            </a>

            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="mt-3 w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
