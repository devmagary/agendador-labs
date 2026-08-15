"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { 
  ShieldAlert, 
  Users, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Building2, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  UserPlus, 
  SlidersHorizontal, 
  Save, 
  Check, 
  Menu, 
  X, 
  LockKeyhole, 
  ChevronRight,
  Globe
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // System Settings state (Weekly Quota)
  const [weeklyQuotaInput, setWeeklyQuotaInput] = useState<number>(4);
  const [savedWeeklyQuota, setSavedWeeklyQuota] = useState<number>(4);
  const [hideWeekendsInput, setHideWeekendsInput] = useState<boolean>(false);
  const [savedHideWeekends, setSavedHideWeekends] = useState<boolean>(false);
  const [secretaryOverrideInput, setSecretaryOverrideInput] = useState<boolean>(true);
  const [savedSecretaryOverride, setSavedSecretaryOverride] = useState<boolean>(true);
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
        if (typeof data.hideWeekends === "boolean") {
          setHideWeekendsInput(data.hideWeekends);
          setSavedHideWeekends(data.hideWeekends);
        }
        if (typeof data.secretaryQuotaOverride === "boolean") {
          setSecretaryOverrideInput(data.secretaryQuotaOverride);
          setSavedSecretaryOverride(data.secretaryQuotaOverride);
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
        hideWeekends: hideWeekendsInput,
        secretaryQuotaOverride: secretaryOverrideInput,
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || "Coordenador",
      }, { merge: true });
      setSettingsMsg(`Configurações salvas com sucesso!`);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
      <header className="bg-amber-50/90 dark:bg-gray-900/90 border-b border-amber-200 dark:border-gray-800 sticky top-0 z-40 shadow-xs backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* LOGO & TITLE */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="bg-amber-600 p-2 sm:p-2.5 rounded-xl text-white shrink-0 shadow-md shadow-amber-600/20">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight truncate">
                  Painel do Coordenador
                </h1>
                <p className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide truncate">
                  Gestão & Regras
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* TROCAR SENHA: ALWAYS OUTSIDE THE SANDWICH */}
              <button
                onClick={() => router.push("/change-password")}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-amber-800 dark:hover:text-amber-300 bg-white dark:bg-gray-800 hover:bg-amber-100/60 dark:hover:bg-gray-750 border border-amber-300/80 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95"
                title="Alterar Senha"
              >
                <LockKeyhole className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                <span className="hidden sm:inline">Trocar Senha</span>
              </button>

              {/* DESKTOP NAVIGATION BUTTONS */}
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={() => router.push("/logs")}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors text-emerald-800 dark:text-emerald-300 bg-white dark:bg-gray-800"
                >
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Histórico & Ranking
                </button>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors text-amber-900 dark:text-amber-300 bg-white dark:bg-gray-800 shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Voltar ao Calendário
                </button>
                <ThemeToggle variant="icon" />
              </div>

              {/* MOBILE HAMBURGER BUTTON (MD:HIDDEN) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-xl border transition-all ${
                  isMobileMenuOpen
                    ? "bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-700"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-amber-200 dark:border-gray-700 hover:bg-amber-100 dark:hover:bg-gray-700"
                }`}
                aria-label="Menu do Coordenador"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SLIDE-DOWN DRAWER / SANDWICH MENU */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-amber-200 dark:border-gray-800 bg-amber-50/98 dark:bg-gray-900/98 backdrop-blur-md px-4 py-3 space-y-2.5 animate-fade-in shadow-xl">
            <span className="text-[11px] font-bold text-amber-900/60 dark:text-amber-400/60 uppercase tracking-wider block mb-1">
              Menu do Coordenador
            </span>

            {/* THEME TOGGLE INSIDE SANDWICH MENU */}
            <div className="py-1">
              <ThemeToggle variant="row" />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/dashboard");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-850 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors border border-amber-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span>📅 Voltar ao Calendário de Reservas</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/logs");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-850 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors border border-emerald-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <span>🏆 Histórico & Ranking Geral</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/calendario");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors border border-indigo-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <span>🌐 Painel Público de Horários</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* GLOBAL SYSTEM SETTINGS CARD */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Configuração Geral do Sistema
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    Ativo agora: <strong className="text-gray-900 dark:text-white font-bold">{savedWeeklyQuota} aulas/semana</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Limite Geral de Aulas Semanais por Professor
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Defina a quantidade máxima de aulas que cada professor poderá agendar semanalmente (de segunda a domingo) somando todos os laboratórios. Quando alterado aqui, todos os painéis e regras são atualizados instantaneamente em tempo real.
                </p>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Visualização do Calendário
                  </h3>
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideWeekendsInput}
                      onChange={(e) => setHideWeekendsInput(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span>Ocultar sábados e domingos das visualizações</span>
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Ao marcar esta opção, os sábados e domingos serão removidos das grades do calendário mensal (no painel do professor e no painel público), otimizando o espaço da tela em dispositivos móveis.
                  </p>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Autorização da Secretaria
                  </h3>
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secretaryOverrideInput}
                      onChange={(e) => setSecretaryOverrideInput(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span>Permitir que a secretaria ultrapasse a cota dos professores</span>
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Ao ativar, a secretaria poderá liberar reservas acima do limite semanal de qualquer professor usando a opção &quot;Autorização Especial da Secretaria&quot;. Ao desativar, o limite da cota será obrigatório também para a secretaria.
                  </p>
                </div>
              </div>

              {/* QUOTA CONTROLLER */}
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center gap-4 min-w-[280px]">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Cota Semanal Global</span>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWeeklyQuotaInput((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                    title="Diminuir cota"
                  >
                    -
                  </button>

                  <div className="text-center px-4">
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                      {weeklyQuotaInput}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">aulas/sem</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWeeklyQuotaInput((prev) => Math.min(30, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
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
                          : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
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
                  disabled={isSavingSettings || (weeklyQuotaInput === savedWeeklyQuota && hideWeekendsInput === savedHideWeekends && secretaryOverrideInput === savedSecretaryOverride)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    (weeklyQuotaInput === savedWeeklyQuota && hideWeekendsInput === savedHideWeekends && secretaryOverrideInput === savedSecretaryOverride)
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-600"
                      : "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-amber-600/20 shadow-md cursor-pointer"
                  }`}
                >
                  {isSavingSettings ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (weeklyQuotaInput === savedWeeklyQuota && hideWeekendsInput === savedHideWeekends && secretaryOverrideInput === savedSecretaryOverride) ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Configurações em Vigor
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Salvar Configurações
                    </>
                  )}
                </button>

                {settingsMsg && (
                  <div className="w-full text-center py-1 px-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium animate-fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {settingsMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ADD FORM SECTION WITH TABS */}
            <section className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6 transition-colors">
                    
                    {/* TAB SWITCHER */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setActiveTab("single"); setError(""); setMsg(""); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === "single" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("bulk"); setError(""); setMsg(""); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === "bulk" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-500" /> Em Lote (Relatório)
                      </button>
                    </div>

                    {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/40 p-3 border border-red-100 dark:border-red-900/60 rounded-lg font-medium">{error}</p>}
                    {msg && <p className="text-xs text-green-700 dark:text-emerald-400 bg-green-50 dark:bg-emerald-950/40 p-3 border border-green-200 dark:border-emerald-900/60 rounded-lg font-medium">{msg}</p>}

                    {/* SINGLE USER FORM */}
                    {activeTab === "single" ? (
                      <form onSubmit={handleAddUser} className="space-y-4">
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                             <Plus className="text-amber-500 w-4 h-4" /> Cadastrar Usuário Único
                          </h2>
                          
                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nome Completo</label>
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
                               className="w-full text-sm font-semibold p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs" 
                             />
                          </div>

                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Usuário de Acesso (Matrícula ou Login)</label>
                             <input 
                               type="text" 
                               placeholder="Ex: maria.silva ou 1234567" 
                               value={newUsername} 
                               onChange={e => setNewUsername(e.target.value)}
                               className="w-full text-sm font-semibold p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs" 
                             />
                             <p className="text-[11px] text-gray-500 dark:text-gray-400">Usado no campo &quot;Usuário / Matrícula&quot; na tela de login.</p>
                          </div>

                          <div className="space-y-1">
                             <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Tipo de Perfil</label>
                             <select
                               value={newRole}
                               onChange={(e) => setNewRole(e.target.value as "professor" | "secretario")}
                               className="w-full text-sm font-bold p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs cursor-pointer"
                             >
                               <option value="professor" className="text-gray-900 dark:text-white font-semibold bg-white dark:bg-gray-800">Professor(a)</option>
                               <option value="secretario" className="text-gray-900 dark:text-white font-semibold bg-white dark:bg-gray-800">Secretário(a) / Gestor(a)</option>
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
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                             <Sparkles className="text-amber-500 w-4 h-4" /> Importação em Lote via Relatório
                          </h2>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Abra o arquivo PDF/relatório do Sigeduc ou quadro de horários, selecione todo o texto (<kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded border dark:border-gray-700">Ctrl+A</kbd>), copie (<kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded border dark:border-gray-700">Ctrl+C</kbd>) e cole aqui.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Perfil para os Usuários Importados</label>
                          <select
                            value={bulkRole}
                            onChange={(e) => setBulkRole(e.target.value as "professor" | "secretario")}
                            className="w-full text-sm font-bold p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs cursor-pointer"
                          >
                            <option value="professor" className="text-gray-900 dark:text-white font-semibold bg-white dark:bg-gray-800">Professores (Padrão)</option>
                            <option value="secretario" className="text-gray-900 dark:text-white font-semibold bg-white dark:bg-gray-800">Secretários / Gestores</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Cole o Conteúdo do Relatório / PDF:</label>
                          <textarea
                            rows={6}
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder="Cole o texto copiado do relatório ou PDF aqui..."
                            className="w-full text-xs font-mono p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs"
                          ></textarea>
                        </div>

                        {/* PREVIEW OF PARSED USERS */}
                        {parsedBulkUsers.length > 0 && (
                          <div className="bg-amber-50/50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-900 dark:text-amber-300">
                                ✨ {parsedBulkUsers.length} professores identificados
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 text-[11px]">Pré-visualização</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {parsedBulkUsers.map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/60 text-xs">
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate mr-2">{u.name}</span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">{u.username}</span>
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
                              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
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
                 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                       <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
                         <Building2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Usuários com Acesso Pré-Autorizado
                       </h2>
                       <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/90 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                         {allowedUsers.length} autorizados
                       </span>
                    </div>
                    <div className="p-0">
                        {allowedUsers.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">Nenhum usuário pré-autorizado ainda.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 text-xs uppercase sticky top-0 border-b border-gray-100 dark:border-gray-700">
                                  <tr>
                                     <th className="px-6 py-3">Login / Matrícula</th>
                                     <th className="px-6 py-3">Nome</th>
                                     <th className="px-6 py-3">Perfil</th>
                                     <th className="px-6 py-3 text-right">Ação</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {allowedUsers.map(u => (
                                      <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                          <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{u.id}</td>
                                          <td className="px-6 py-4 text-gray-600 dark:text-gray-200">{u.name}</td>
                                          <td className="px-6 py-4">
                                             <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'secretario' ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'}`}>
                                               {u.role === 'secretario' ? 'Secretário(a)' : 'Professor(a)'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleRevokeAllowed(u.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 font-medium px-3 py-1 bg-red-50 dark:bg-red-950/50 rounded-md">
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
                 <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                       <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
                         <Users className="w-4 h-4 text-green-500 dark:text-emerald-400" /> Usuários Ativos na Escola
                       </h2>
                       <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/90 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                         {registeredUsers.length} ativos
                       </span>
                    </div>
                    <div className="p-0">
                        {registeredUsers.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">Nenhum usuário ativo encontrado no banco de dados.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 text-xs uppercase sticky top-0 border-b border-gray-100 dark:border-gray-700">
                                  <tr>
                                     <th className="px-6 py-3">Nome</th>
                                     <th className="px-6 py-3">Perfil</th>
                                     <th className="px-6 py-3">Status</th>
                                     <th className="px-6 py-3 text-right">Remoção</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {registeredUsers.map(u => (
                                      <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{u.name}</td>
                                          <td className="px-6 py-4">
                                             <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'secretario' ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'}`}>
                                               {u.role === 'secretario' ? 'Secretário(a)' : 'Professor(a)'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium text-xs">Ativo e Autenticado</td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors">
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
