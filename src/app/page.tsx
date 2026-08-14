"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <CalendarClock className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Agendamento de Labs</h1>
          <p className="text-blue-100 text-sm mt-2">Acesso do Professor</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm transition-all duration-300 ease-in-out font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nome ou Matrícula</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-gray-900 placeholder-gray-400 bg-white w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="Ex: Carlos Silva"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-gray-900 placeholder-gray-400 bg-white w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="Sua senha"
            />
            <p className="text-xs text-gray-400 mt-1">Dica: No primeiro acesso, use a senha padrão &quot;123456&quot;</p>
          </div>

          <button
            disabled={loadingAction}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center transform active:scale-95"
          >
            {loadingAction ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "Entrar ou Criar Acesso Primeira Vez"}
          </button>
        </form>
      </div>
    </main>
  );
}
