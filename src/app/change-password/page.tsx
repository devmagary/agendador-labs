"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { updatePassword } from "firebase/auth";
import { updateDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function ChangePasswordPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingAction(true);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoadingAction(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.");
      setLoadingAction(false);
      return;
    }
    
    if (newPassword === "123456") {
       setError("Por favor, escolha uma senha diferente da padrão.");
       setLoadingAction(false);
       return;
    }

    try {
      if (!auth.currentUser) throw new Error("Não autenticado");
      
      // Update Firebase Auth password
      await updatePassword(auth.currentUser, newPassword);
      
      // Update Firestore user document
      await updateDoc(doc(db, "users", user!.uid), {
        mustChangePassword: false
      });
      
      // Refresh Auth Context
      await refreshUser();
      
      // Redirect manually to dashboard
      router.push("/dashboard");
    } catch {
      setError("Erro ao alterar senha. Talvez você precise sair e entrar novamente.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Segurança</h1>
          <p className="text-amber-100 text-sm mt-2">Defina sua nova senha de acesso</p>
        </div>
        
        <form onSubmit={handleChange} className="p-8 space-y-6">
          <div className="text-sm text-gray-600 mb-4 p-4 bg-gray-50 border border-gray-100 rounded-lg text-center">
            Olá, <strong>{user.name}</strong>.<br/> Como este é o seu primeiro acesso, é obrigatório criar uma nova senha por motivos de segurança.
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="text-gray-900 placeholder-gray-400 bg-white w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-gray-900 placeholder-gray-400 bg-white w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
            />
          </div>

          <button
            disabled={loadingAction}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center transform active:scale-95 shadow-md hover:shadow-lg"
          >
            {loadingAction ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "Salvar Nova Senha"}
          </button>
        </form>
      </div>
    </main>
  );
}
