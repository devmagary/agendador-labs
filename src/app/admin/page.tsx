"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { ShieldAlert, Users, Plus, Trash2, ArrowLeft, Building2, Clock, FileText, CheckCircle2, Sparkles, UserPlus, SlidersHorizontal, Save, Check } from "lucide-react";

interface AllowedUser {
  id: string; // The username (matricula)
  name: string;
  role?: string;
}

interface UserDoc {
  id: string; // The Firebase UID
  name: string;
  role: string;
}

interface ParsedBulkUser {
  username: string;
  name: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserDoc[]>([]);

  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // System Settings state (Weekly Quota)
  const [weeklyQuotaInput, setWeeklyQuotaInput] = useState<number>(4);
  const [savedWeeklyQuota, setSavedWeeklyQuota] = useState<number>(4);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // Single form states
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"professor" | "secretario">("professor");

  // Bulk form states
  const [bulkText, setBulkText] = useState("");
  const [bulkRole, setBulkRole] = useState<"professor" | "secretario">("professor");
  const [isImporting, setIsImporting] = useState(false);

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/");
      else if (user.role !== "admin") router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    // Listen to settings/general
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.weeklyQuota === "number") {
          setWeeklyQuotaInput(data.weeklyQuota);
          setSavedWeeklyQuota(data.weeklyQuota);
        }
      }
    });

    // Listen to allowed_users
    const unsubAllowed = onSnapshot(collection(db, "allowed_users"), (snapshot) => {
      const data: AllowedUser[] = [];
      snapshot.forEach(doc => {
        const val = doc.data();
        data.push({ id: doc.id, name: val.name || "", role: val.role });
      });
      setAllowedUsers(data);
    });

    // Listen to registered users (professores and secretarios)
    const q = query(collection(db, "users"), where("role", "in", ["professor", "secretario"]));
    const unsubRegistered = onSnapshot(q, (snapshot) => {
      const data: UserDoc[] = [];
      snapshot.forEach(doc => {
        const val = doc.data();
        data.push({ id: doc.id, name: val.name || "", role: val.role || "professor" });
      });
      setRegisteredUsers(data);
    }, () => {
      // Fallback query if "in" index is building
      const unsubAll = onSnapshot(collection(db, "users"), (snap) => {
        const data: UserDoc[] = [];
        snap.forEach(d => {
          const val = d.data();
          if (val.role !== "admin") {
            data.push({ id: d.id, name: val.name || "", role: val.role || "professor" });
          }
        });
        setRegisteredUsers(data);
      });
      return unsubAll;
    });

    return () => {
      unsubSettings();
      unsubAllowed();
      unsubRegistered();
    }
  }, [user]);

  // Handler to update global system settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (weeklyQuotaInput < 1) {
      setError("A cota semanal deve ser de pelo menos 1 aula.");
      return;
    }
    setIsSavingSettings(true);
    setSettingsMsg("");
    setError("");
    try {
      await setDoc(doc(db, "settings", "general"), {
        weeklyQuota: Number(weeklyQuotaInput),
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || "Coordenador",
      }, { merge: true });
      setSettingsMsg(`Cota semanal atualizada para ${weeklyQuotaInput} aulas por professor!`);
      setTimeout(() => setSettingsMsg(""), 4000);
    } catch {
      setError("Erro ao salvar configuração de cota no banco de dados.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper to generate clean unique username
  const generateUsernameFromName = (fullName: string, existingUsernames: Set<string>): string => {
    const cleanStr = fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const parts = cleanStr.split(/\s+/).filter(p => p.length > 2 || !['de', 'da', 'do', 'dos', 'das', 'e'].includes(p));
    
    let base = "usuario";
    if (parts.length === 1) {
      base = parts[0].replace(/[^a-z0-9]/g, "");
    } else if (parts.length >= 2) {
      const first = parts[0].replace(/[^a-z0-9]/g, "");
      const last = parts[parts.length - 1].replace(/[^a-z0-9]/g, "");
      base = `${first}.${last}`;
    }

    if (!base) base = "usuario";

    let candidate = base;
    let counter = 2;
    while (existingUsernames.has(candidate)) {
      candidate = `${base}${counter}`;
      counter++;
    }

    existingUsernames.add(candidate);
    return candidate;
  };

  // Helper to extract teacher names from text/PDF report
  const parsedBulkUsers = useMemo<ParsedBulkUser[]>(() => {
    if (!bulkText.trim()) return [];

    const existingSet = new Set<string>(allowedUsers.map(u => u.id.toLowerCase()));
    const lines = bulkText.split("\n");
    const results: ParsedBulkUser[] = [];
    const seenNames = new Set<string>();

    const ignoreKeywords = [
      "componente curricular", "relatório de carga", "secretaria da educação",
      "sistema integrado", "total de cada ch", "alocações inativas", "total de vínculos",
      "nte 21", "cruz das almas", "centro territorial", "legenda", "sigeduc",
      "ch", "chs", "cha", "total ch", "exibindo detalhamento"
    ];

    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (ignoreKeywords.some(kw => lower.includes(kw))) continue;

      // Remove leading registration numbers (e.g., 85200201/1 or 92175094/99)
      line = line.replace(/^\d+(\/\d+)?\s*/, '').trim();

      // If line is numeric or too short, skip
      if (/^\d+$/.test(line) || line.length < 3) continue;

      // If line contains colon or headers, skip
      if (line.includes(":") || line.includes("Emitido") || line.includes("Página")) continue;

      // Check if it resembles a real person's name (at least 2 words, mostly letters)
      const words = line.split(/\s+/).filter(w => w.length > 1);
      if (words.length < 2) continue;

      // Ensure it contains reasonable characters
      if (!/^[a-zA-ZÀ-ÿ\s\.\-']+$/.test(line)) continue;

      // Normalize name casing (Capitalize Each Word)
      const formattedName = line
        .toLowerCase()
        .split(" ")
        .filter(w => w.length > 0)
        .map((w) => {
          if (['de', 'da', 'do', 'dos', 'das', 'e'].includes(w)) return w;
          return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");

      if (seenNames.has(formattedName.toLowerCase())) continue;
      seenNames.add(formattedName.toLowerCase());

      const generatedUsername = generateUsernameFromName(formattedName, existingSet);
      results.push({
        username: generatedUsername,
        name: formattedName
      });
    }

    return results;
  }, [bulkText, allowedUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!newUsername.trim() || !newName.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase().replace(/\s+/g, "");

    try {
       await setDoc(doc(db, "allowed_users", cleanUsername), {
          name: newName.trim(),
          role: newRole
       });
       const roleLabel = newRole === "secretario" ? "Secretário(a)" : "Professor(a)";
       setMsg(`Permissão criada para ${newName.trim()} (${roleLabel}) acessar com o usuário '${cleanUsername}' e senha '123456'.`);
       setNewUsername("");
       setNewName("");
       setNewRole("professor");
    } catch {
       setError("Erro ao salvar permissão.");
    }
  };

  const handleBulkImport = async () => {
    if (parsedBulkUsers.length === 0) return;
    setError("");
    setMsg("");
    setIsImporting(true);

    try {
      const batch = writeBatch(db);
      for (const u of parsedBulkUsers) {
        const docRef = doc(db, "allowed_users", u.username);
        batch.set(docRef, {
          name: u.name,
          role: bulkRole
        });
      }

      await batch.commit();
      const roleLabel = bulkRole === "secretario" ? "Secretário(a)s" : "Professor(a)es";
      setMsg(`Sucesso! ${parsedBulkUsers.length} ${roleLabel} foram cadastrados em lote. Todos usarão a senha padrão '123456' no primeiro acesso.`);
      setBulkText("");
    } catch {
      setError("Erro ao importar em lote no banco de dados.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRevokeAllowed = async (id: string) => {
    try { await deleteDoc(doc(db, "allowed_users", id)); } catch {}
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm("Atenção: Você tem certeza que deseja remover este usuário da lista de ativos?")) return;
    try { await deleteDoc(doc(db, "users", id)); } catch {}
  };

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-amber-50 border-b border-amber-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-amber-600 p-2.5 rounded-xl text-white">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Painel do Coordenador</h1>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Gestão de Regras e Usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.push("/logs")}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-emerald-100/50 border border-emerald-300 rounded-lg text-sm font-semibold transition-colors text-emerald-800"
              >
                <Clock className="w-4 h-4" /> Histórico & Ranking
              </button>
              <button 
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-amber-100/50 border border-amber-300 rounded-lg text-sm font-semibold transition-colors text-amber-800"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao Calendário
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* GLOBAL SYSTEM SETTINGS CARD */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" /> Configuração Geral do Sistema
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    Ativo agora: <strong className="text-gray-900 font-bold">{savedWeeklyQuota} aulas/semana</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Limite Geral de Aulas Semanais por Professor
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Defina a quantidade máxima de aulas que cada professor poderá agendar semanalmente (de segunda a domingo) somando todos os laboratórios. Quando alterado aqui, todos os painéis e regras são atualizados instantaneamente em tempo real.
                </p>
              </div>

              {/* QUOTA CONTROLLER */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-4 min-w-[280px]">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cota Semanal Global</span>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWeeklyQuotaInput((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                    title="Diminuir cota"
                  >
                    -
                  </button>

                  <div className="text-center px-4">
                    <div className="text-3xl font-black text-amber-600 tracking-tight">
                      {weeklyQuotaInput}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">aulas/sem</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWeeklyQuotaInput((prev) => Math.min(30, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                    title="Aumentar cota"
                  >
                    +
                  </button>
                </div>

                {/* QUICK PRESETS */}
                <div className="flex items-center gap-1.5">
                  {[2, 4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWeeklyQuotaInput(num)}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
                        weeklyQuotaInput === num
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {num} {num === 1 ? "aula" : "aulas"}
                    </button>
                  ))}
                </div>

                {/* SAVE BUTTON */}
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={isSavingSettings || weeklyQuotaInput === savedWeeklyQuota}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    weeklyQuotaInput === savedWeeklyQuota
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                      : "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-amber-600/20 shadow-md"
                  }`}
                >
                  {isSavingSettings ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : weeklyQuotaInput === savedWeeklyQuota ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Cota em Vigor
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Salvar Nova Cota ({weeklyQuotaInput} {weeklyQuotaInput === 1 ? "aula" : "aulas"})
                    </>
                  )}
                </button>

                {settingsMsg && (
                  <div className="w-full text-center py-1 px-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium animate-fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {settingsMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ADD FORM SECTION WITH TABS */}
            <section className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    
                    {/* TAB SWITCHER */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setActiveTab("single"); setError(""); setMsg(""); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("bulk"); setError(""); setMsg(""); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === "bulk" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-500" /> Em Lote (Relatório)
                      </button>
                    </div>

                    {error && <p className="text-xs text-red-500 bg-red-50 p-3 border border-red-100 rounded-lg font-medium">{error}</p>}
                    {msg && <p className="text-xs text-green-700 bg-green-50 p-3 border border-green-200 rounded-lg font-medium">{msg}</p>}

                    {/* SINGLE USER FORM */}
                    {activeTab === "single" ? (
                      <form onSubmit={handleAddUser} className="space-y-4">
                          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                             <Plus className="text-amber-500 w-4 h-4" /> Cadastrar Usuário Único
                          </h2>
                          
                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700">Nome Completo</label>
                             <input 
                               type="text" 
                               placeholder="Ex: Maria dos Santos Silva" 
                               value={newName} 
                               onChange={e => {
                                 setNewName(e.target.value);
                                 if (!newUsername) {
                                   const clean = e.target.value
                                     .normalize("NFD")
                                     .replace(/[\u0300-\u036f]/g, "")
                                     .toLowerCase()
                                     .replace(/[^a-z0-9]/g, ".");
                                   setNewUsername(clean);
                                 }
                               }}
                               className="w-full text-sm font-semibold p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs" 
                             />
                          </div>

                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700">Usuário de Acesso (Matrícula ou Login)</label>
                             <input 
                               type="text" 
                               placeholder="Ex: maria.silva ou 1234567" 
                               value={newUsername} 
                               onChange={e => setNewUsername(e.target.value)}
                               className="w-full text-sm font-semibold p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs" 
                             />
                             <p className="text-[11px] text-gray-500">Usado no campo &quot;Usuário / Matrícula&quot; na tela de login.</p>
                          </div>

                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700">Tipo de Perfil</label>
                             <select
                               value={newRole}
                               onChange={(e) => setNewRole(e.target.value as "professor" | "secretario")}
                               className="w-full text-sm font-bold p-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs cursor-pointer"
                             >
                               <option value="professor" className="text-gray-900 font-semibold bg-white">Professor(a)</option>
                               <option value="secretario" className="text-gray-900 font-semibold bg-white">Secretário(a) / Gestor(a)</option>
                             </select>
                          </div>

                          <button 
                            type="submit" 
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                          >
                             <Plus className="w-4 h-4" /> Autorizar Novo Usuário
                          </button>
                      </form>
                    ) : (
                      /* BULK IMPORT FORM */
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                             <Sparkles className="text-amber-500 w-4 h-4" /> Importação em Lote via Relatório
                          </h2>
                          <p className="text-xs text-gray-600 mt-1">
                            Abra o arquivo PDF/relatório do Sigeduc ou quadro de horários, selecione todo o texto (<kbd className="bg-gray-100 px-1 rounded border">Ctrl+A</kbd>), copie (<kbd className="bg-gray-100 px-1 rounded border">Ctrl+C</kbd>) e cole aqui.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700">Perfil para os Usuários Importados</label>
                          <select
                            value={bulkRole}
                            onChange={(e) => setBulkRole(e.target.value as "professor" | "secretario")}
                            className="w-full text-sm font-bold p-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs cursor-pointer"
                          >
                            <option value="professor" className="text-gray-900 font-semibold bg-white">Professores (Padrão)</option>
                            <option value="secretario" className="text-gray-900 font-semibold bg-white">Secretários / Gestores</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700">Cole o Conteúdo do Relatório / PDF:</label>
                          <textarea
                            rows={6}
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder="Cole o texto copiado do relatório ou PDF aqui..."
                            className="w-full text-xs font-mono p-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs"
                          ></textarea>
                        </div>

                        {/* PREVIEW OF PARSED USERS */}
                        {parsedBulkUsers.length > 0 && (
                          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-900">
                                ✨ {parsedBulkUsers.length} professores identificados
                              </span>
                              <span className="text-amber-700 text-[11px]">Pré-visualização</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {parsedBulkUsers.map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-100 text-xs">
                                  <span className="font-medium text-gray-800 truncate mr-2">{u.name}</span>
                                  <span className="font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">{u.username}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button 
                          type="button" 
                          onClick={handleBulkImport}
                          disabled={parsedBulkUsers.length === 0 || isImporting}
                          className={`w-full py-3 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                            parsedBulkUsers.length > 0 && !isImporting
                              ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-amber-600/20"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {isImporting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Cadastrar {parsedBulkUsers.length} Usuários em Lote
                            </>
                          )}
                        </button>
                      </div>
                    )}
                </div>
            </section>

            {/* USERS LISTS */}
            <section className="lg:col-span-2 space-y-8">
                 
                 {/* ALLOWED USERS */}
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                       <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                         <Building2 className="w-4 h-4 text-indigo-500" /> Usuários com Acesso Pré-Autorizado
                       </h2>
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                         {allowedUsers.length} autorizados
                       </span>
                    </div>
                    <div className="p-0">
                        {allowedUsers.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 text-center">Nenhum usuário pré-autorizado ainda.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                  <tr>
                                     <th className="px-6 py-3">Login / Matrícula</th>
                                     <th className="px-6 py-3">Nome</th>
                                     <th className="px-6 py-3">Perfil</th>
                                     <th className="px-6 py-3 text-right">Ação</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {allowedUsers.map(u => (
                                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                          <td className="px-6 py-4 font-bold text-indigo-600">{u.id}</td>
                                          <td className="px-6 py-4 text-gray-600">{u.name}</td>
                                          <td className="px-6 py-4">
                                             <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'secretario' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                               {u.role === 'secretario' ? 'Secretário(a)' : 'Professor(a)'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleRevokeAllowed(u.id)} className="text-red-500 hover:text-red-700 font-medium px-3 py-1 bg-red-50 rounded-md">
                                                 Revogar
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                               </tbody>
                            </table></div>
                        )}
                    </div>
                 </div>

                 {/* REGISTERED USERS */}
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                       <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                         <Users className="w-4 h-4 text-green-500" /> Usuários Ativos na Escola
                       </h2>
                       <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                         {registeredUsers.length} ativos
                       </span>
                    </div>
                    <div className="p-0">
                        {registeredUsers.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 text-center">Nenhum usuário ativo encontrado no banco de dados.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                  <tr>
                                     <th className="px-6 py-3">Nome</th>
                                     <th className="px-6 py-3">Perfil</th>
                                     <th className="px-6 py-3">Status</th>
                                     <th className="px-6 py-3 text-right">Remoção</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {registeredUsers.map(u => (
                                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                          <td className="px-6 py-4 font-bold text-gray-900">{u.name}</td>
                                          <td className="px-6 py-4">
                                             <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'secretario' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                               {u.role === 'secretario' ? 'Secretário(a)' : 'Professor(a)'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-emerald-600 font-medium text-xs">Ativo e Autenticado</td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-md transition-colors">
                                                 <Trash2 className="w-4 h-4 inline" /> Excluir Vínculo
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                               </tbody>
                            </table></div>
                        )}
                    </div>
                 </div>

            </section>
        </div>
      </main>
    </div>
  );
}
