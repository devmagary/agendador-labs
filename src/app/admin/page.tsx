"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
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
  Globe,
  Monitor,
  Wrench,
  Bot,
  Star,
  UserCheck,
  RotateCcw,
  Edit3,
  FlaskConical,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PwaInstallButton } from "@/components/PwaInstallButton";

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

interface CustomQuotaDoc {
  id: string;
  professorName: string;
  weeklyQuota?: number;
  quotaPerLab?: {
    LabTec?: number;
    Manutec?: number;
    Robotica?: number;
    Biologia?: number;
  };
  updatedAt?: unknown;
  updatedBy?: string;
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

  // System Settings state (Weekly Quota & Per-Lab Quotas)
  const [weeklyQuotaInput, setWeeklyQuotaInput] = useState<number>(4);
  const [savedWeeklyQuota, setSavedWeeklyQuota] = useState<number>(4);
  const [usePerLabQuotaInput, setUsePerLabQuotaInput] = useState<boolean>(false);
  const [savedUsePerLabQuota, setSavedUsePerLabQuota] = useState<boolean>(false);
  const [labQuotasInput, setLabQuotasInput] = useState<{ LabTec: number; Manutec: number; Robotica: number; Biologia: number }>({
    LabTec: 2,
    Manutec: 2,
    Robotica: 2,
    Biologia: 2,
  });
  const [savedLabQuotas, setSavedLabQuotas] = useState<{ LabTec: number; Manutec: number; Robotica: number; Biologia: number }>({
    LabTec: 2,
    Manutec: 2,
    Robotica: 2,
    Biologia: 2,
  });
  const [hideWeekendsInput, setHideWeekendsInput] = useState<boolean>(false);
  const [savedHideWeekends, setSavedHideWeekends] = useState<boolean>(false);
  const [secretaryOverrideInput, setSecretaryOverrideInput] = useState<boolean>(true);
  const [savedSecretaryOverride, setSavedSecretaryOverride] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  // Custom Per-Teacher Individual Quotas State
  const [customQuotasList, setCustomQuotasList] = useState<CustomQuotaDoc[]>([]);
  const [targetCustomProfName, setTargetCustomProfName] = useState("");
  const [customWeeklyQuotaInput, setCustomWeeklyQuotaInput] = useState<number>(4);
  const [customLabQuotasInput, setCustomLabQuotasInput] = useState<{ LabTec: number; Manutec: number; Robotica: number; Biologia: number }>({
    LabTec: 2,
    Manutec: 2,
    Robotica: 2,
    Biologia: 2,
  });
  const [isSavingCustomQuota, setIsSavingCustomQuota] = useState(false);
  const [customQuotaMsg, setCustomQuotaMsg] = useState("");

  const isSettingsDirty = useMemo(() => {
    if (usePerLabQuotaInput !== savedUsePerLabQuota) return true;
    if (usePerLabQuotaInput) {
      if (
        labQuotasInput.LabTec !== savedLabQuotas.LabTec ||
        labQuotasInput.Manutec !== savedLabQuotas.Manutec ||
        labQuotasInput.Robotica !== savedLabQuotas.Robotica
      ) return true;
    } else {
      if (weeklyQuotaInput !== savedWeeklyQuota) return true;
    }
    if (hideWeekendsInput !== savedHideWeekends) return true;
    if (secretaryOverrideInput !== savedSecretaryOverride) return true;
    return false;
  }, [
    usePerLabQuotaInput,
    savedUsePerLabQuota,
    labQuotasInput,
    savedLabQuotas,
    weeklyQuotaInput,
    savedWeeklyQuota,
    hideWeekendsInput,
    savedHideWeekends,
    secretaryOverrideInput,
    savedSecretaryOverride,
  ]);

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
        if (typeof data.usePerLabQuota === "boolean") {
          setUsePerLabQuotaInput(data.usePerLabQuota);
          setSavedUsePerLabQuota(data.usePerLabQuota);
        }
        if (data.quotaPerLab && typeof data.quotaPerLab === "object") {
          const qLabTec = Number(data.quotaPerLab.LabTec) || 2;
          const qManutec = Number(data.quotaPerLab.Manutec) || 2;
          const qRobotica = Number(data.quotaPerLab.Robotica) || 2;
          const qBiologia = Number(data.quotaPerLab.Biologia) || 2;
          setLabQuotasInput({ LabTec: qLabTec, Manutec: qManutec, Robotica: qRobotica, Biologia: qBiologia });
          setSavedLabQuotas({ LabTec: qLabTec, Manutec: qManutec, Robotica: qRobotica, Biologia: qBiologia });
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

    // Listen to custom_quotas collection
    const unsubCustomQuotas = onSnapshot(collection(db, "custom_quotas"), (snapshot) => {
      const list: CustomQuotaDoc[] = [];
      snapshot.forEach((docSnap) => {
        const val = docSnap.data();
        list.push({
          id: docSnap.id,
          professorName: val.professorName || docSnap.id,
          weeklyQuota: typeof val.weeklyQuota === "number" ? val.weeklyQuota : undefined,
          quotaPerLab: val.quotaPerLab && typeof val.quotaPerLab === "object" ? val.quotaPerLab : undefined,
          updatedAt: val.updatedAt,
          updatedBy: val.updatedBy,
        });
      });
      setCustomQuotasList(list);
    });

    return () => {
      unsubSettings();
      unsubAllowed();
      unsubRegistered();
      unsubCustomQuotas();
    };
  }, [user]);
  const allProfessorsList = useMemo(() => {
    const combined = new Map<string, string>();
    allowedUsers.forEach(u => combined.set(u.name.toLowerCase().trim(), u.name.trim()));
    registeredUsers.forEach(u => combined.set(u.name.toLowerCase().trim(), u.name.trim()));
    return Array.from(combined.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allowedUsers, registeredUsers]);

  const existingCustomQuotaForSelected = useMemo(() => {
    if (!targetCustomProfName.trim()) return null;
    const targetLower = targetCustomProfName.trim().toLowerCase();
    return customQuotasList.find(c => c.professorName.toLowerCase() === targetLower || c.id === targetLower) || null;
  }, [targetCustomProfName, customQuotasList]);

  // When a professor is selected for custom quota, load their current values into form
  const handleSelectProfForCustomQuota = (profName: string) => {
    const existing = customQuotasList.find(c => c.professorName.toLowerCase() === profName.toLowerCase() || c.id === profName.toLowerCase());
    setTargetCustomProfName(profName);
    if (existing) {
      if (typeof existing.weeklyQuota === "number") setCustomWeeklyQuotaInput(existing.weeklyQuota);
      if (existing.quotaPerLab) {
        setCustomLabQuotasInput({
          LabTec: Number(existing.quotaPerLab.LabTec) || 2,
          Manutec: Number(existing.quotaPerLab.Manutec) || 2,
          Robotica: Number(existing.quotaPerLab.Robotica) || 2,
          Biologia: Number(existing.quotaPerLab.Biologia) || 2,
        });
      }
    } else {
      setCustomWeeklyQuotaInput(weeklyQuotaInput);
      setCustomLabQuotasInput(labQuotasInput);
    }
  };

  const handleSaveCustomQuota = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const profNameClean = targetCustomProfName.trim();
    if (!profNameClean) {
      setError("Por favor, selecione ou informe o nome do professor.");
      return;
    }
    const docId = profNameClean.toLowerCase();

    setIsSavingCustomQuota(true);
    setCustomQuotaMsg("");
    setError("");

    try {
      await setDoc(doc(db, "custom_quotas", docId), {
        professorName: profNameClean,
        weeklyQuota: Number(customWeeklyQuotaInput),
        quotaPerLab: {
          LabTec: Number(customLabQuotasInput.LabTec),
          Manutec: Number(customLabQuotasInput.Manutec),
          Robotica: Number(customLabQuotasInput.Robotica),
          Biologia: Number(customLabQuotasInput.Biologia),
        },
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || "Coordenador",
      });

      if (user) {
        const detailsStr = usePerLabQuotaInput
          ? `(LabTec: ${customLabQuotasInput.LabTec}, Manutec: ${customLabQuotasInput.Manutec}, Robótica: ${customLabQuotasInput.Robotica}, Biologia: ${customLabQuotasInput.Biologia})`
          : `(${customWeeklyQuotaInput} aulas/sem)`;

        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "custom_quota_update",
          performedBy: { uid: user.uid, name: user.name, role: user.role },
          details: `definiu cota personalizada para o Prof. ${profNameClean} ${detailsStr}`,
          timestamp: serverTimestamp(),
        });
      }

      setCustomQuotaMsg(`Cota personalizada salva com sucesso para ${profNameClean}!`);
      setTimeout(() => setCustomQuotaMsg(""), 4000);
    } catch {
      setError("Erro ao salvar cota personalizada no banco de dados.");
    } finally {
      setIsSavingCustomQuota(false);
    }
  };

  const handleRemoveCustomQuota = async (docId: string, profName: string) => {
    if (!confirm(`Tem certeza que deseja restaurar a cota de ${profName} para o padrão do sistema?`)) return;
    setError("");
    try {
      await deleteDoc(doc(db, "custom_quotas", docId));
      if (user) {
        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "custom_quota_remove",
          performedBy: { uid: user.uid, name: user.name, role: user.role },
          details: `restaurou a cota do Prof. ${profName} para o padrão do sistema`,
          timestamp: serverTimestamp(),
        });
      }
      if (targetCustomProfName.trim().toLowerCase() === docId || targetCustomProfName.trim() === profName) {
        setTargetCustomProfName("");
      }
      setCustomQuotaMsg(`Cota de ${profName} restaurada para o padrão!`);
      setTimeout(() => setCustomQuotaMsg(""), 4000);
    } catch {
      setError("Erro ao remover cota personalizada.");
    }
  };

  // Handler to update global system settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usePerLabQuotaInput && weeklyQuotaInput < 1) {
      setError("A cota semanal global deve ser de pelo menos 1 aula.");
      return;
    }
    if (usePerLabQuotaInput) {
      if (labQuotasInput.LabTec < 1 || labQuotasInput.Manutec < 1 || labQuotasInput.Robotica < 1 || labQuotasInput.Biologia < 1) {
        setError("A cota de cada laboratório deve ser de pelo menos 1 aula.");
        return;
      }
    }
    setIsSavingSettings(true);
    setSettingsMsg("");
    setError("");
    try {
      await setDoc(doc(db, "settings", "general"), {
        weeklyQuota: Number(weeklyQuotaInput),
        usePerLabQuota: usePerLabQuotaInput,
        quotaPerLab: {
          LabTec: Number(labQuotasInput.LabTec),
          Manutec: Number(labQuotasInput.Manutec),
          Robotica: Number(labQuotasInput.Robotica),
          Biologia: Number(labQuotasInput.Biologia),
        },
        hideWeekends: hideWeekendsInput,
        secretaryQuotaOverride: secretaryOverrideInput,
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || "Coordenador",
      }, { merge: true });

      if (user) {
        const quotaSummary = usePerLabQuotaInput
          ? `Cotas Isoladas por Lab (LabTec: ${labQuotasInput.LabTec}, Manutec: ${labQuotasInput.Manutec}, Robótica: ${labQuotasInput.Robotica}, Biologia: ${labQuotasInput.Biologia})`
          : `Cota Global: ${weeklyQuotaInput} aulas`;

        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "settings_update",
          performedBy: {
            uid: user.uid,
            name: user.name,
            role: user.role,
          },
          details: `alterou as configurações do sistema (${quotaSummary}, Ocultar Fins de Semana: ${hideWeekendsInput ? "Sim" : "Não"})`,
          changes: {
            weeklyQuota: Number(weeklyQuotaInput),
            usePerLabQuota: usePerLabQuotaInput,
            quotaPerLab: labQuotasInput,
            hideWeekends: hideWeekendsInput,
            secretaryQuotaOverride: secretaryOverrideInput,
          },
          timestamp: serverTimestamp(),
        });
      }

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
       if (user) {
         await addDoc(collection(db, "logs"), {
           professorId: user.uid,
           professorName: user.name,
           action: "user_authorization_create",
           performedBy: { uid: user.uid, name: user.name, role: user.role },
           details: `autorizou o acesso para ${newName.trim()} (${newRole}) com o usuário '${cleanUsername}'`,
           timestamp: serverTimestamp(),
         });
       }
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
      if (user) {
        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "user_authorization_bulk",
          performedBy: { uid: user.uid, name: user.name, role: user.role },
          details: `importou em lote ${parsedBulkUsers.length} usuários autorizados`,
          timestamp: serverTimestamp(),
        });
      }
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
    try {
      await deleteDoc(doc(db, "allowed_users", id));
      if (user) {
        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "user_authorization_revoke",
          performedBy: { uid: user.uid, name: user.name, role: user.role },
          details: `revogou a autorização do usuário '${id}'`,
          timestamp: serverTimestamp(),
        });
      }
    } catch {}
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm("Atenção: Você tem certeza que deseja remover este usuário da lista de ativos?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      if (user) {
        await addDoc(collection(db, "logs"), {
          professorId: user.uid,
          professorName: user.name,
          action: "user_delete",
          performedBy: { uid: user.uid, name: user.name, role: user.role },
          details: `excluiu o cadastro ativo do usuário '${id}'`,
          timestamp: serverTimestamp(),
        });
      }
    } catch {}
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
                className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-amber-800 dark:hover:text-amber-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-amber-300/80 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0"
                title="Alterar Senha"
              >
                <LockKeyhole className="w-4 h-4 text-gray-600 dark:text-gray-300 shrink-0" />
                <span className="hidden sm:inline">Trocar Senha</span>
              </button>

              {/* MOBILE THEME TOGGLE: ALWAYS OUTSIDE THE SANDWICH (MD:HIDDEN) */}
              <span className="md:hidden">
                <ThemeToggle variant="icon" />
              </span>

              {/* DESKTOP NAVIGATION BUTTONS */}
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={() => router.push("/logs")}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors text-emerald-800 dark:text-emerald-300 bg-white dark:bg-gray-800"
                >
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> Histórico & Ranking
                </button>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors text-amber-900 dark:text-amber-300 bg-white dark:bg-gray-800 shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" /> Voltar ao Calendário
                </button>
                <ThemeToggle variant="icon" />
              </div>

              {/* MOBILE HAMBURGER BUTTON (MD:HIDDEN) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden h-9 w-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                  isMobileMenuOpen
                    ? "bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-700"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-amber-200 dark:border-gray-700 hover:bg-amber-100 dark:hover:bg-gray-700"
                }`}
                aria-label="Menu do Coordenador"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/dashboard");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors border border-amber-200 dark:border-gray-700 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span>Voltar ao Calendário de Reservas</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/logs");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors border border-emerald-200 dark:border-gray-700 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Histórico & Ranking Geral</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/calendario");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors border border-indigo-200 dark:border-gray-700 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <span>Painel Público de Horários</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </button>

            {/* PWA INSTALL BUTTON */}
            <div className="pt-1">
              <PwaInstallButton />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* GLOBAL SYSTEM SETTINGS CARD */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Configuração Geral do Sistema
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    Ativo agora:{" "}
                    <strong className="text-gray-900 dark:text-white font-bold">
                      {savedUsePerLabQuota
                        ? `Cotas Isoladas (LabTec: ${savedLabQuotas.LabTec}, Manutec: ${savedLabQuotas.Manutec}, Robótica: ${savedLabQuotas.Robotica} aulas/sem)`
                        : `${savedWeeklyQuota} aulas/semana (Global)`}
                    </strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Limite e Regras de Agendamento por Professor
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Controle a quantidade máxima de aulas que cada professor poderá reservar semanalmente (de segunda a domingo). Ao salvar, as alterações são aplicadas instantaneamente em tempo real para todos os professores e secretaria.
                </p>

                {/* OPTION 1: PER-LAB QUOTA TOGGLE */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Modo de Contabilização das Cotas
                  </h3>
                  <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePerLabQuotaInput}
                      onChange={(e) => setUsePerLabQuotaInput(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span>Ativar cotas semanais isoladas por laboratório</span>
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {usePerLabQuotaInput
                      ? "✅ Cotas Isoladas Ativas: Cada laboratório possui um limite semanal próprio. Agendar uma aula no LabTec consumirá apenas a cota do LabTec, sem diminuir o saldo do Manutec ou da Robótica."
                      : "ℹ️ Cota Global Unificada: A cota semanal é compartilhada entre todos os laboratórios somados."}
                  </p>
                </div>

                {/* OPTION 2: CALENDAR WEEKENDS */}
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

                {/* OPTION 3: SECRETARY OVERRIDE */}
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

              {/* QUOTA CONTROLLER CONTAINER */}
              <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-5 min-w-[300px] lg:max-w-[380px] w-full">
                
                {/* 1. SE COTA ISOLADA POR LAB ESTIVER ATIVA */}
                {usePerLabQuotaInput ? (
                  <div className="space-y-4">
                    <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        Cotas Isoladas por Laboratório
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Defina o limite semanal individual para cada espaço:
                      </p>
                    </div>

                    {/* LABTEC INPUT */}
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> LabTec
                        </span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                          {labQuotasInput.LabTec} {labQuotasInput.LabTec === 1 ? "aula" : "aulas"}/sem
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, LabTec: Math.max(1, prev.LabTec - 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">
                            {labQuotasInput.LabTec}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, LabTec: Math.min(20, prev.LabTec + 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLabQuotasInput(prev => ({ ...prev, LabTec: n }))}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                labQuotasInput.LabTec === n
                                  ? "bg-blue-600 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* MANUTEC INPUT */}
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Manutec
                        </span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          {labQuotasInput.Manutec} {labQuotasInput.Manutec === 1 ? "aula" : "aulas"}/sem
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Manutec: Math.max(1, prev.Manutec - 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">
                            {labQuotasInput.Manutec}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Manutec: Math.min(20, prev.Manutec + 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLabQuotasInput(prev => ({ ...prev, Manutec: n }))}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                labQuotasInput.Manutec === n
                                  ? "bg-amber-600 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-amber-50"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ROBOTICA INPUT */}
                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Robótica
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {labQuotasInput.Robotica} {labQuotasInput.Robotica === 1 ? "aula" : "aulas"}/sem
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Robotica: Math.max(1, prev.Robotica - 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">
                            {labQuotasInput.Robotica}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Robotica: Math.min(20, prev.Robotica + 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLabQuotasInput(prev => ({ ...prev, Robotica: n }))}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                labQuotasInput.Robotica === n
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-emerald-50"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* BIOLOGIA INPUT */}
                    <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Biologia / Análise
                        </span>
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                          {labQuotasInput.Biologia} {labQuotasInput.Biologia === 1 ? "aula" : "aulas"}/sem
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Biologia: Math.max(1, prev.Biologia - 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">
                            {labQuotasInput.Biologia}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLabQuotasInput(prev => ({ ...prev, Biologia: Math.min(20, prev.Biologia + 1) }))}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLabQuotasInput(prev => ({ ...prev, Biologia: n }))}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                labQuotasInput.Biologia === n
                                  ? "bg-teal-600 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-teal-50"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. SE COTA GLOBAL UNIFICADA ESTIVER ATIVA */
                  <div className="flex flex-col items-center gap-4">
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
                  </div>
                )}

                {/* SAVE BUTTON */}
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={isSavingSettings || !isSettingsDirty}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    !isSettingsDirty
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-600"
                      : "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-amber-600/20 shadow-md cursor-pointer"
                  }`}
                >
                  {isSavingSettings ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : !isSettingsDirty ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Configurações em Vigor
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Salvar Novas Configurações
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

        {/* INDIVIDUAL CUSTOM QUOTAS CARD */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-transparent p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                    <Star className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" /> Cotas Individuais por Professor
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    Exceções ativas: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{customQuotasList.length} professores</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Definir Limites Personalizados para Professores Específicos
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Defina regras de cota diferenciadas para professores de turmas especiais, projetos ou contraturnos. Professores sem cota individual continuam seguindo a Cota Padrão da escola.
                </p>

                {/* PROFESSOR SELECTOR INPUT */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-2">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Selecione ou busque o professor:</span>
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        list="all-professors-list"
                        value={targetCustomProfName}
                        onChange={(e) => handleSelectProfForCustomQuota(e.target.value)}
                        placeholder="Digite ou selecione o nome do professor..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <datalist id="all-professors-list">
                        {allProfessorsList.map((prof) => (
                          <option key={prof} value={prof} />
                        ))}
                      </datalist>
                    </div>

                    {existingCustomQuotaForSelected && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Cota Personalizada Ativa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CUSTOM QUOTA FORM CONTROLLER */}
              <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-5 min-w-[300px] lg:max-w-[380px] w-full">
                
                {targetCustomProfName.trim() ? (
                  <>
                    <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                        Cota de {targetCustomProfName}
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {usePerLabQuotaInput
                          ? "Modo atual: Cotas Isoladas por Laboratório"
                          : "Modo atual: Cota Semanal Global"}
                      </p>
                    </div>

                    {usePerLabQuotaInput ? (
                      /* ISOLATED PER LAB INPUTS FOR SPECIFIC PROFESSOR */
                      <div className="space-y-3">
                        {/* LABTEC */}
                        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> LabTec
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, LabTec: Math.max(1, prev.LabTec - 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center hover:bg-blue-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-sm text-gray-900 dark:text-white">
                              {customLabQuotasInput.LabTec}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, LabTec: Math.min(20, prev.LabTec + 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center hover:bg-blue-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* MANUTEC */}
                        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Manutec
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Manutec: Math.max(1, prev.Manutec - 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center hover:bg-amber-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-sm text-gray-900 dark:text-white">
                              {customLabQuotasInput.Manutec}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Manutec: Math.min(20, prev.Manutec + 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center hover:bg-amber-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* ROBOTICA */}
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Robótica
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Robotica: Math.max(1, prev.Robotica - 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center hover:bg-emerald-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-sm text-gray-900 dark:text-white">
                              {customLabQuotasInput.Robotica}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Robotica: Math.min(20, prev.Robotica + 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center hover:bg-emerald-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* BIOLOGIA */}
                        <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Biologia / Análise
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Biologia: Math.max(1, prev.Biologia - 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center hover:bg-teal-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-sm text-gray-900 dark:text-white">
                              {customLabQuotasInput.Biologia}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomLabQuotasInput(prev => ({ ...prev, Biologia: Math.min(20, prev.Biologia + 1) }))}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center hover:bg-teal-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* GLOBAL INPUT FOR SPECIFIC PROFESSOR */
                      <div className="flex flex-col items-center gap-3 py-2">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Cota Semanal Individual</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setCustomWeeklyQuotaInput(prev => Math.max(1, prev - 1))}
                            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-base flex items-center justify-center text-gray-800 dark:text-gray-100"
                          >
                            -
                          </button>
                          <div className="text-center px-3">
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                              {customWeeklyQuotaInput}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">aulas/sem</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomWeeklyQuotaInput(prev => Math.min(30, prev + 1))}
                            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-base flex items-center justify-center text-gray-800 dark:text-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleSaveCustomQuota()}
                        disabled={isSavingCustomQuota}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
                      >
                        {isSavingCustomQuota ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Salvar Cota de {targetCustomProfName}
                          </>
                        )}
                      </button>

                      {existingCustomQuotaForSelected && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomQuota(existingCustomQuotaForSelected.id, existingCustomQuotaForSelected.professorName)}
                          className="w-full py-2 px-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar Cota Padrão
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-800">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      Nenhum professor selecionado
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[240px] mx-auto">
                      Busque um professor no campo ao lado ou clique em &quot;Editar&quot; na lista de exceções abaixo.
                    </p>
                  </div>
                )}

                {customQuotaMsg && (
                  <div className="w-full text-center py-1 px-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium animate-fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {customQuotaMsg}
                  </div>
                )}
              </div>
            </div>

            {/* TABLE OF ACTIVE CUSTOM QUOTAS */}
            {customQuotasList.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Professores com Cotas Personalizadas Ativas ({customQuotasList.length})
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-3">Professor</th>
                        <th className="px-4 py-3">Cota Configurada</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Registrado por</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {customQuotasList.map((cq) => (
                        <tr key={cq.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {cq.professorName}
                          </td>
                          <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">
                            {cq.quotaPerLab && usePerLabQuotaInput ? (
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                                  LabTec: {cq.quotaPerLab.LabTec ?? 2}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                                  Manutec: {cq.quotaPerLab.Manutec ?? 2}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  Robótica: {cq.quotaPerLab.Robotica ?? 2}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                                  Biologia: {cq.quotaPerLab.Biologia ?? 2}
                                </span>
                              </span>
                            ) : (
                              <span>{cq.weeklyQuota ?? weeklyQuotaInput} aulas/semana</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                            {cq.updatedBy || "Coordenador"}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSelectProfForCustomQuota(cq.professorName)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="Editar cota deste professor"
                            >
                              <Edit3 className="w-3 h-3" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomQuota(cq.id, cq.professorName)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 hover:bg-red-100 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="Restaurar cota padrão"
                            >
                              <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
