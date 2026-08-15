"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import {
  format,
  startOfToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isWeekend,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Monitor,
  Wrench,
  Bot,
  Clock,
  Check,
  ShieldAlert,
  CheckCircle2,
  LockKeyhole,
  Globe,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Tv,
  AlertCircle,
  Menu,
  X,
  LogOut,
  Users,
  HelpCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tour } from "@/components/Tour";
import type { TourStep } from "@/components/Tour";

type Laboratory = "LabTec" | "Manutec" | "Robotica";
type Shift = "Matutino" | "Vespertino" | "Noturno";

interface Schedule {
  id?: string;
  professorId: string;
  professorName: string;
  laboratory: Laboratory;
  date: string;
  shift: Shift;
  classHours: number[];
  hasTv?: boolean;
  createdBySecretario?: boolean;
  createdByName?: string;
}

const SHIFTS: Shift[] = ["Matutino", "Vespertino", "Noturno"];
const CLASSES = [1, 2, 3, 4, 5];

const PROFESSOR_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo(a) ao AgendaLab!",
    emoji: "👋",
    description:
      "Vamos fazer um rápido tour para você aprender a agendar aulas nos laboratórios, escolher TV, trocar o tema e alterar sua senha. Leva menos de um minuto.",
  },
  {
    id: "labs",
    title: "Escolha o Laboratório",
    emoji: "🖥️",
    target: "tour-labs",
    description:
      "Aqui você escolhe o laboratório que deseja reservar: LabTec (Tecnologia), Manutec (Manutenção) ou Robótica.",
  },
  {
    id: "calendar",
    title: "Selecione o Dia",
    emoji: "📅",
    target: "tour-calendar",
    description:
      "Toque no dia desejado no calendário mensal. Use as setas para navegar entre os meses e o botão \"Hoje\" para voltar ao dia atual.",
  },
  {
    id: "slots",
    title: "Escolha o Turno e as Aulas",
    emoji: "⏰",
    target: "tour-slots",
    description:
      "Toque nas aulas (1º a 5º) do turno desejado: Matutino, Vespertino ou Noturno. As células vermelhas já estão ocupadas por outro professor.",
  },
  {
    id: "tv",
    title: "Precisa de TV?",
    emoji: "📺",
    description:
      "Após selecionar as aulas, aparece uma barra na parte inferior da tela. Marque a opção \"Precisa de TV?\" se a aula usar televisão e depois toque em \"Confirmar Reserva\".",
  },
  {
    id: "theme",
    title: "Modo Claro e Escuro",
    emoji: "🌙",
    target: "tour-theme",
    description:
      "Toque aqui para alternar entre o modo claro e o modo escuro do aplicativo, de acordo com a sua preferência.",
  },
  {
    id: "password",
    title: "Alterar sua Senha",
    emoji: "🔒",
    target: "tour-password",
    description:
      "Sempre que quiser trocar sua senha de acesso, toque neste botão \"Trocar Senha\" no topo da tela.",
  },
];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
  const [selectedLab, setSelectedLab] = useState<Laboratory>("LabTec");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([]);

  // Dynamic Weekly Quota from Firestore (defaults to 4)
  const [maxWeeklyHours, setMaxWeeklyHours] = useState<number>(4);
  const [hideWeekends, setHideWeekends] = useState<boolean>(false);
  const [secretaryQuotaOverride, setSecretaryQuotaOverride] = useState<boolean>(true);

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [hasTv, setHasTv] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [targetProfessorName, setTargetProfessorName] = useState("");
  const [professorsList, setProfessorsList] = useState<{ id: string; name: string }[]>([]);
  const [allowSecretaryOverride, setAllowSecretaryOverride] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/");
      else if (user.mustChangePassword) router.push("/change-password");
    }
  }, [user, loading, router]);

  // Show the onboarding tour the first time a professor opens the dashboard
  useEffect(() => {
    if (!user || user.role !== "professor" || user.mustChangePassword) return;
    try {
      let forced = false;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tour") === "1") {
          forced = true;
          params.delete("tour");
          const clean = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          window.history.replaceState(null, "", clean);
        }
      }
      const seen = localStorage.getItem(`agendalab-tour-${user.uid}`);
      if (forced || !seen) setShowTour(true);
    } catch {
      setShowTour(true);
    }
  }, [user]);

  // Listen to global settings for weekly quota in real time
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.weeklyQuota === "number" && data.weeklyQuota > 0) {
          setMaxWeeklyHours(data.weeklyQuota);
        }
        if (typeof data.hideWeekends === "boolean") {
          setHideWeekends(data.hideWeekends);
        }
        if (typeof data.secretaryQuotaOverride === "boolean") {
          setSecretaryQuotaOverride(data.secretaryQuotaOverride);
        }
      }
    });

    return () => unsubSettings();
  }, []);

  // Load ALL professors list (from allowed_users and active users) for secretary/admin
  useEffect(() => {
    if (!user || (user.role !== "secretario" && user.role !== "admin")) return;

    const allowedMap = new Map<string, string>();
    const usersMap = new Map<string, string>();

    const updateCombinedList = () => {
      const combined = new Map<string, string>();
      allowedMap.forEach((name) => combined.set(name.toLowerCase(), name));
      usersMap.forEach((name) => combined.set(name.toLowerCase(), name));

      const sorted = Array.from(combined.values())
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((name, idx) => ({ id: `prof-${idx}`, name }));

      setProfessorsList(sorted);
    };

    // 1. Listen to allowed_users (contains all pre-registered / imported teachers)
    const unsubAllowed = onSnapshot(
      collection(db, "allowed_users"),
      (snapshot) => {
        allowedMap.clear();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name && (data.role === "professor" || !data.role)) {
            allowedMap.set(docSnap.id, data.name.trim());
          }
        });
        updateCombinedList();
      },
      (error) => {
        console.warn("Aviso ao ler allowed_users:", error.message);
      }
    );

    // 2. Listen to users (contains active logged-in teachers)
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        usersMap.clear();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name && (data.role === "professor" || !data.role)) {
            usersMap.set(docSnap.id, data.name.trim());
          }
        });
        updateCombinedList();
      },
      (error) => {
        console.warn("Aviso ao ler users:", error.message);
      }
    );

    return () => {
      unsubAllowed();
      unsubUsers();
    };
  }, [user]);

  // Listen to schedules for the whole month view to display indicators & compute weekly quota
  useEffect(() => {
    if (!user) return;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDateStr = format(startOfWeek(monthStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const endDateStr = format(endOfWeek(monthEnd, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const q = query(
      collection(db, "schedules"),
      where("date", ">=", startDateStr),
      where("date", "<=", endDateStr)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Schedule[] = [];
        snapshot.forEach((docSnapshot) => {
          data.push({ id: docSnapshot.id, ...docSnapshot.data() } as Schedule);
        });
        setMonthSchedules(data);
      },
      (error) => {
        console.warn("Erro ao ler schedules do mês", error);
      }
    );

    return () => unsubscribe();
  }, [currentMonth, user]);

  // Listen to schedules for the selected date & lab
  useEffect(() => {
    if (!user || !selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const q = query(
      collection(db, "schedules"),
      where("date", "==", formattedDate),
      where("laboratory", "==", selectedLab)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Schedule[] = [];
        snapshot.forEach((docSnapshot) => {
          data.push({ id: docSnapshot.id, ...docSnapshot.data() } as Schedule);
        });
        setSchedules(data);
      },
      (error) => {
        console.warn("Erro ao ler do Firebase", error);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, selectedLab, user]);

  // Calculate calendar days grid for the month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Compute professor weekly quota in real-time
  const effectiveProfName = useMemo(() => {
    if (user?.role === "secretario") {
      return targetProfessorName.trim();
    }
    return user?.name || "";
  }, [user, targetProfessorName]);

  const weeklyUsage = useMemo(() => {
    if (!selectedDate || !effectiveProfName) {
      return { used: 0, schedules: [], weekStartFormatted: "", weekEndFormatted: "" };
    }
    const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const profLower = effectiveProfName.toLowerCase();
    const profWeekSchedules = monthSchedules.filter((s) => {
      const inWeek = s.date >= weekStart && s.date <= weekEnd;
      const isProf =
        (s.professorName && s.professorName.toLowerCase() === profLower) ||
        (user?.role === "professor" && s.professorId === user.uid);
      return inWeek && isProf;
    });

    const usedHours = profWeekSchedules.reduce((acc, curr) => acc + (curr.classHours?.length || 0), 0);
    return {
      used: usedHours,
      schedules: profWeekSchedules,
      weekStartFormatted: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM"),
      weekEndFormatted: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM"),
    };
  }, [selectedDate, effectiveProfName, monthSchedules, user]);

  // Filter suggestions when user types in the input box
  const professorSuggestions = useMemo(() => {
    if (!targetProfessorName.trim() || professorsList.length === 0) return [];
    const q = targetProfessorName.toLowerCase().trim();
    // Don't show suggestions if targetProfessorName exactly matches one
    const exactMatch = professorsList.some((p) => p.name.toLowerCase() === q);
    if (exactMatch) return [];
    return professorsList.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [targetProfessorName, professorsList]);

  const toggleClassSelection = (shift: Shift, classHour: number) => {
    if (selectedShift && selectedShift !== shift) {
      setSelectedShift(shift);
      setSelectedClasses([classHour]);
      return;
    }

    setSelectedShift(shift);
    if (selectedClasses.includes(classHour)) {
      const newClasses = selectedClasses.filter((c) => c !== classHour);
      if (newClasses.length === 0) setSelectedShift(null);
      setSelectedClasses(newClasses);
    } else {
      setSelectedClasses([...selectedClasses, classHour].sort());
    }
  };

  const handleSaveSchedule = async () => {
    if (!user || !selectedShift || selectedClasses.length === 0 || !selectedDate) return;

    let finalProfName = user.name;
    const isSec = user.role === "secretario";

    if (isSec) {
      if (!targetProfessorName.trim()) {
        alert("Por favor, informe ou selecione o nome do professor que usará o laboratório.");
        return;
      }
      finalProfName = targetProfessorName.trim();
    }

    // Weekly limit validation using dynamic maxWeeklyHours
    const totalAfterBooking = weeklyUsage.used + selectedClasses.length;
    if (user.role === "professor" && totalAfterBooking > maxWeeklyHours) {
      alert(
        `Limite Semanal Excedido!\n\nCada professor pode agendar no máximo ${maxWeeklyHours} aulas por semana.\n` +
        `Você já utilizou ${weeklyUsage.used} de ${maxWeeklyHours} aulas na semana (${weeklyUsage.weekStartFormatted} a ${weeklyUsage.weekEndFormatted}) e está tentando agendar mais ${selectedClasses.length} ${selectedClasses.length === 1 ? "aula" : "aulas"}.`
      );
      return;
    }

    if (isSec && totalAfterBooking > maxWeeklyHours) {
      const canOverride = secretaryQuotaOverride && allowSecretaryOverride;
      if (!canOverride) {
        alert(
          secretaryQuotaOverride
            ? `Limite Semanal Excedido para o Prof. ${finalProfName}!\n\n` +
              `O professor já possui ${weeklyUsage.used} de ${maxWeeklyHours} aulas agendadas nesta semana (${weeklyUsage.weekStartFormatted} a ${weeklyUsage.weekEndFormatted}).\n` +
              `Para liberar essa reserva como exceção, marque a opção "Autorização Especial da Secretaria".`
            : `Limite Semanal Excedido para o Prof. ${finalProfName}!\n\n` +
              `O professor já possui ${weeklyUsage.used} de ${maxWeeklyHours} aulas agendadas nesta semana (${weeklyUsage.weekStartFormatted} a ${weeklyUsage.weekEndFormatted}).\n` +
              `A autorização da secretaria para ultrapassar a cota dos professores está desativada pelo coordenador.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "schedules"), {
        professorId: user.uid,
        professorName: finalProfName,
        laboratory: selectedLab,
        date: format(selectedDate, "yyyy-MM-dd"),
        shift: selectedShift,
        classHours: selectedClasses,
        hasTv: hasTv,
        createdBySecretario: isSec,
        createdByName: isSec ? user.name : null,
        createdAt: serverTimestamp(),
      });

      // Log the action
      const dayOfWeek = format(selectedDate, "EEEE", { locale: ptBR });
      const hoursStr =
        selectedClasses.map((h) => `${h}º`).join(" e ") +
        (selectedClasses.length > 1 ? " horários" : " horário");
      const dateStr = format(selectedDate, "dd/MM");
      const tvStr = hasTv ? " (com TV 📺)" : " (sem TV)";

      const logDetails = isSec
        ? `(Secretaria) agendou para o Prof. ${finalProfName}${tvStr} no ${selectedLab} para a ${dayOfWeek} no ${hoursStr} no dia ${dateStr}`
        : `registrou agenda${tvStr} no ${selectedLab} para a ${dayOfWeek} no ${hoursStr} no dia ${dateStr}`;

      await addDoc(collection(db, "logs"), {
        professorId: user.uid,
        professorName: user.name,
        action: "create",
        details: logDetails,
        timestamp: serverTimestamp(),
      });

      setSuccessMsg("Agendamento salvo com sucesso!");
      setSelectedClasses([]);
      setSelectedShift(null);
      setHasTv(false);
      if (isSec) {
        setTargetProfessorName("");
        setAllowSecretaryOverride(false);
      }

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      alert("Erro ao salvar agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async (scheduleId: string) => {
    if (!user) return;
    const targetSchedule = schedules.find((s) => s.id === scheduleId);
    if (!targetSchedule) return;

    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    try {
      await deleteDoc(doc(db, "schedules", scheduleId));

      const dayOfWeek = format(selectedDate, "EEEE", { locale: ptBR });
      const hoursStr =
        targetSchedule.classHours.map((h) => `${h}º`).join(" e ") +
        (targetSchedule.classHours.length > 1 ? " horários" : " horário");
      const dateStr = format(selectedDate, "dd/MM");

      const logDetails =
        user.role === "secretario"
          ? `(Secretaria) cancelou o agendamento do Prof. ${targetSchedule.professorName} no ${targetSchedule.laboratory} da ${dayOfWeek} (${hoursStr}) no dia ${dateStr}`
          : `cancelou seu agendamento no ${targetSchedule.laboratory} da ${dayOfWeek} (${hoursStr}) no dia ${dateStr}`;

      await addDoc(collection(db, "logs"), {
        professorId: user.uid,
        professorName: user.name,
        action: "cancel",
        details: logDetails,
        timestamp: serverTimestamp(),
      });

      setSuccessMsg("Agendamento cancelado com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      alert("Erro ao cancelar o agendamento.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const getSlotOccupier = (shift: Shift, classHour: number) => {
    return schedules.find(
      (s) => s.shift === shift && s.classHours && s.classHours.includes(classHour)
    );
  };

  // Check how many schedules exist on a given calendar day for the selected lab
  const getDayScheduleCount = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return monthSchedules.filter((s) => s.date === dayStr && s.laboratory === selectedLab).length;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const roleBadge = () => {
    switch (user.role) {
      case "admin":
        return (
          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800">
            Coordenador / Admin
          </span>
        );
      case "secretario":
        return (
          <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800">
            Secretaria Escolar
          </span>
        );
      default:
        return (
          <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
            Professor(a)
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24 transition-colors">
      {/* HEADER */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* LOGO & USER INFO */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-md shadow-blue-500/20 shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">AgendaLab</h1>
                  <div className="hidden xs:inline-flex">{roleBadge()}</div>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[130px] sm:max-w-[240px]">
                  Olá, <strong className="text-gray-700 dark:text-gray-200">{user.name}</strong>
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS CONTAINER */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* TROCAR SENHA: ALWAYS OUTSIDE THE SANDWICH (MOBILE & DESKTOP) */}
              <button
                onClick={() => router.push("/change-password")}
                className="flex items-center justify-center gap-1.5 h-10 w-10 sm:w-auto sm:px-4 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0"
                title="Alterar Senha"
                data-tour-id="tour-password"
              >
                <LockKeyhole className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                <span className="hidden sm:inline">Trocar Senha</span>
              </button>

              {/* MOBILE THEME TOGGLE: ALWAYS OUTSIDE THE SANDWICH (MD:HIDDEN) */}
              <span className="md:hidden" data-tour-id="tour-theme">
                <ThemeToggle variant="icon" />
              </span>

              {/* DESKTOP NAVIGATION (MD AND UP) */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => router.push("/logs")}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                >
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Histórico & Ranking
                </button>

                <button
                  onClick={() => router.push("/calendario")}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                >
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Painel Público
                </button>

                {user.role === "professor" && (
                  <button
                    onClick={() => setShowTour(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-sky-700 dark:hover:text-sky-400 bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                    title="Reiniciar tour guiado"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Tour Guiado
                  </button>
                )}

                {user.role === "admin" && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl transition-all shadow-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Painel do Coordenador
                  </button>
                )}

                {/* DESKTOP THEME TOGGLE */}
                <span data-tour-id="tour-theme" className="inline-flex">
                  <ThemeToggle variant="icon" />
                </span>

                <button
                  onClick={handleLogout}
                  className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>

              {/* MOBILE HAMBURGER BUTTON (MD:HIDDEN) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden h-10 w-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                  isMobileMenuOpen
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                aria-label="Abrir menu de navegação"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SLIDE-DOWN DRAWER / SANDWICH MENU */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/98 backdrop-blur-md px-4 py-3 space-y-2.5 animate-fade-in shadow-2xl">
            <div className="pb-2 mb-1 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Menu do Sistema
              </span>
              <div>{roleBadge()}</div>
            </div>

            {user.role === "professor" && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowTour(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 rounded-lg">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span>Tour Guiado (Como usar)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/logs");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Histórico & Ranking Geral</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/calendario");
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <span>Painel Público de Horários</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            {user.role === "admin" && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push("/admin");
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors border border-amber-200 dark:border-amber-700 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-lg">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span>Painel do Coordenador</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </button>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-red-100 dark:border-red-900/60"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN BODY */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-5 sm:space-y-6">
        
        {/* SUCCESS MESSAGE BANNER */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LABORATORY SELECTOR TABS (GRID 3 COLUMNS ON MOBILE & DESKTOP) */}
        <section data-tour-id="tour-labs" className="bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 grid grid-cols-3 gap-1 sm:gap-2 transition-colors">
          <button
            type="button"
            onClick={() => { setSelectedLab("LabTec"); setSelectedClasses([]); setSelectedShift(null); }}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              selectedLab === "LabTec"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.01]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            }`}
          >
            <Monitor className="w-4 h-4 shrink-0" />
            <span className="truncate">LabTec</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedLab("Manutec"); setSelectedClasses([]); setSelectedShift(null); }}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              selectedLab === "Manutec"
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/20 scale-[1.01]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="truncate">Manutec</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedLab("Robotica"); setSelectedClasses([]); setSelectedShift(null); }}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              selectedLab === "Robotica"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-[1.01]"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span className="truncate">Robótica</span>
          </button>
        </section>

        {/* SECRETARY SPECIAL BOOKING CONTROLS */}
        {user.role === "secretario" && (
          <section className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-600 rounded-xl text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950 dark:text-purple-100">
                  Painel de Delegação da Secretaria
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  Como secretária, você pode agendar aulas em nome de qualquer um dos professores cadastrados na base.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-purple-950 dark:text-purple-200 mb-1.5 flex items-center justify-between">
                  <span>Selecionar Professor Cadastrado</span>
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    {professorsList.length} professores na base
                  </span>
                </label>
                <select
                  value={targetProfessorName}
                  onChange={(e) => setTargetProfessorName(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold p-3 bg-white dark:bg-gray-900 border-2 border-purple-300 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-gray-950 dark:text-white shadow-xs cursor-pointer"
                >
                  <option value="" className="text-gray-500 dark:text-gray-400 font-normal">-- Escolha um professor da lista ({professorsList.length} disponíveis) --</option>
                  {professorsList.map((p) => (
                    <option key={p.id} value={p.name} className="text-gray-950 dark:text-white font-bold bg-white dark:bg-gray-900 py-1">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-purple-950 dark:text-purple-200 mb-1.5 flex items-center justify-between">
                  <span>Ou Digite o Nome do Professor</span>
                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">Busca em tempo real</span>
                </label>
                <input
                  type="text"
                  list="professors-datalist"
                  placeholder="Ex: Digite o nome para buscar na base..."
                  value={targetProfessorName}
                  onChange={(e) => setTargetProfessorName(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold p-3 bg-white dark:bg-gray-900 border-2 border-purple-300 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
                />
                <datalist id="professors-datalist">
                  {professorsList.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>

                {/* INTERACTIVE MATCHING PILLS */}
                {professorSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-800 rounded-2xl shadow-xl z-30 p-2 space-y-1 animate-fade-in">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider px-2 block">
                      Sugestões encontradas na base ({professorSuggestions.length}):
                    </span>
                    {professorSuggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTargetProfessorName(p.name)}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-gray-900 dark:text-gray-100 hover:bg-purple-100 dark:hover:bg-purple-950/60 hover:text-purple-950 dark:hover:text-purple-200 rounded-xl transition-colors flex items-center justify-between border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                      >
                        <span>{p.name}</span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-md">
                          Selecionar ↵
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {targetProfessorName.trim() && (
              <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-purple-900 dark:text-purple-200 font-semibold">
                  Cota de <strong>{targetProfessorName}</strong> nesta semana ({weeklyUsage.weekStartFormatted} a {weeklyUsage.weekEndFormatted}):{" "}
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    weeklyUsage.used >= maxWeeklyHours ? "bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300" : "bg-purple-200 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200"
                  }`}>
                    {weeklyUsage.used} / {maxWeeklyHours} {maxWeeklyHours === 1 ? "aula utilizada" : "aulas utilizadas"}
                  </span>
                </div>

                {secretaryQuotaOverride ? (
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-950 dark:text-purple-200 cursor-pointer bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={allowSecretaryOverride}
                      onChange={(e) => setAllowSecretaryOverride(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Autorização Especial da Secretaria (Liberar acima da cota)</span>
                  </label>
                ) : (
                  <span className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/60 shadow-2xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Coordenador desativou a autorização para ultrapassar a cota dos professores.
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {/* MONTHLY CALENDAR CARD */}
        <section data-tour-id="tour-calendar" className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          {/* MONTH HEADER CONTROLS */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 bg-gray-50/70 dark:bg-gray-800/60">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/80 p-2 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300">Selecione um dia do mês para visualizar ou realizar agendamentos</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = startOfToday();
                  setCurrentMonth(today);
                  setSelectedDate(today);
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-700 rounded-xl transition-colors shadow-2xs"
              >
                Hoje
              </button>

              <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* MONTH GRID */}
          <div className="p-4 sm:p-6">
            {/* DAY NAMES HEADER */}
            <div className={`grid ${hideWeekends ? "grid-cols-5" : "grid-cols-7"} gap-1 sm:gap-2 mb-2 text-center`}>
              {(hideWeekends ? ["Seg", "Ter", "Qua", "Qui", "Sex"] : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]).map((d, i) => (
                <div key={d} className={`text-[11px] font-bold uppercase tracking-wider py-1.5 ${
                  !hideWeekends && i >= 5 ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"
                }`}>
                  {d}
                </div>
              ))}
            </div>

            {/* DAYS CELLS */}
            <div className={`grid ${hideWeekends ? "grid-cols-5" : "grid-cols-7"} gap-1 sm:gap-2`}>
              {calendarDays.filter(day => !hideWeekends || !isWeekend(day)).map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                const isWeekendDay = isWeekend(day);
                const dayStr = format(day, "yyyy-MM-dd");

                // Count schedules on this day for the selected lab
                const reservationsCount = getDayScheduleCount(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={dayStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedClasses([]);
                      setSelectedShift(null);
                    }}
                    className={`
                      relative flex flex-col items-center justify-between p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all min-h-[48px] sm:min-h-[78px] text-left
                      ${!isCurrentMonth ? "opacity-30 dark:opacity-20 bg-gray-50/50 dark:bg-gray-950/40 border-transparent hover:opacity-70" : ""}
                      ${isWeekendDay && isCurrentMonth ? "bg-gray-50/60 dark:bg-gray-950/50 border-gray-100 dark:border-gray-800/80 text-gray-400 dark:text-gray-500" : ""}
                      ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02] z-10"
                          : isCurrentDay
                          ? "border-blue-400 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 hover:border-blue-500"
                          : !isWeekendDay && isCurrentMonth
                          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-gray-700 shadow-2xs"
                          : ""
                      }
                    `}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className={`text-xs sm:text-sm font-extrabold ${
                        isSelected
                          ? "text-white"
                          : isCurrentDay
                          ? "text-blue-600 dark:text-blue-300"
                          : isWeekendDay
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-800 dark:text-gray-100"
                      }`}>
                        {format(day, "d")}
                      </span>

                      {isCurrentDay && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                      )}
                    </div>

                    {/* RESERVATIONS INDICATOR */}
                    <div className="w-full flex items-center justify-center mt-1">
                      {reservationsCount > 0 ? (
                        <>
                          {/* Desktop Badge com texto completo */}
                          <span className={`hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 rounded-full items-center gap-1 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : selectedLab === "LabTec"
                              ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700/60"
                              : selectedLab === "Manutec"
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700/60"
                              : "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/60"
                          }`}>
                            <span className="w-1 h-1 rounded-full bg-current"></span>
                            {reservationsCount} {reservationsCount === 1 ? "reserva" : "reservas"}
                          </span>

                          {/* Mobile: Apenas ponto discreto centralizado */}
                          <span className={`sm:hidden w-1.5 h-1.5 rounded-full ${
                            isSelected
                              ? "bg-white"
                              : selectedLab === "LabTec"
                              ? "bg-blue-500"
                              : selectedLab === "Manutec"
                              ? "bg-amber-500"
                              : "bg-purple-500"
                          }`} />
                        </>
                      ) : (
                        <span className="text-[10px] text-transparent select-none hidden sm:inline">-</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* PROFESSOR WEEKLY QUOTA WIDGET (4 HOURS LIMIT) */}
        {(user.role === "professor" || (user.role === "secretario" && targetProfessorName.trim())) && (
          <section className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cota Semanal de Agendamentos</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                    (Semana: {weeklyUsage.weekStartFormatted} a {weeklyUsage.weekEndFormatted})
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {user.role === "secretario" ? `Uso do(a) Prof. ${effectiveProfName}` : "Seu Limite Semanal"}
                </h3>
              </div>

              <div className="flex flex-col sm:items-end gap-1 min-w-[200px]">
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold">
                  <span className="text-gray-500 dark:text-gray-400">Aulas Utilizadas:</span>
                  <span
                    className={`text-sm ${
                      weeklyUsage.used >= maxWeeklyHours
                        ? "text-red-600 dark:text-red-400 font-extrabold"
                        : weeklyUsage.used >= maxWeeklyHours - 1
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {weeklyUsage.used} / {maxWeeklyHours}
                  </span>
                </div>

                {/* PROGRESS BAR */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200 dark:border-gray-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weeklyUsage.used >= maxWeeklyHours
                        ? "bg-red-500"
                        : weeklyUsage.used >= maxWeeklyHours - 1
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (weeklyUsage.used / maxWeeklyHours) * 100)}%` }}
                  />
                </div>

                {weeklyUsage.used >= maxWeeklyHours ? (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Limite semanal atingido!
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    {maxWeeklyHours - weeklyUsage.used} {maxWeeklyHours - weeklyUsage.used === 1 ? "aula disponível" : "aulas disponíveis"}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TIME SLOTS GRID FOR THE SELECTED DAY */}
        <section data-tour-id="tour-slots" className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-50/70 dark:bg-gray-800/60">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase">
                {selectedLab}{" "}
                <span className="text-gray-500 dark:text-gray-300 font-medium ml-2">
                  — {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-300">
                <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-500"></div> Livre
              </span>
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-500"></div> Selecionado
              </span>
              <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                <div className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800"></div> Ocupado
              </span>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-8">
            {SHIFTS.map((shift) => (
              <div key={shift} className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
                  <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {shift}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {CLASSES.map((classHour) => {
                    const occupier = getSlotOccupier(shift, classHour);
                    const isOccupied = !!occupier;
                    const isSelected = selectedShift === shift && selectedClasses.includes(classHour);
                    const isMyOwnOccupier =
                      occupier?.professorId === user.uid ||
                      (user.role === "secretario" && occupier?.createdByName === user.name);
                    const canCancel = isMyOwnOccupier || user.role === "admin" || user.role === "secretario";

                    return (
                      <button
                        key={`${shift}-${classHour}`}
                        disabled={isOccupied && !canCancel}
                        onClick={() => {
                          if (canCancel && occupier?.id) {
                            handleCancelReservation(occupier.id);
                          } else {
                            toggleClassSelection(shift, classHour);
                          }
                        }}
                        className={`
                          relative group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 outline-none focus:outline-none min-h-[110px]
                          ${
                            isOccupied
                              ? canCancel
                                ? "bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/60 hover:border-red-300 dark:hover:border-red-700 transition-colors shadow-sm"
                                : "bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 cursor-not-allowed opacity-90"
                              : isSelected
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg transform scale-[1.02]"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-gray-700 shadow-sm"
                          }
                        `}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                            isOccupied
                              ? canCancel
                                ? "text-amber-800 dark:text-amber-300 group-hover:text-red-700 dark:group-hover:text-red-400"
                                : "text-gray-600 dark:text-gray-300"
                              : isSelected
                              ? "text-blue-100"
                              : "text-gray-500 dark:text-gray-300"
                          }`}
                        >
                          Aula {classHour}
                        </span>

                        {isOccupied ? (
                          <div className="flex flex-col items-center gap-1 mt-1 w-full">
                            {canCancel ? (
                              <div className="hidden group-hover:flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold">
                                <Trash2 className="w-3.5 h-3.5" /> Cancelar
                              </div>
                            ) : null}

                            <div className={`flex flex-col items-center text-center ${canCancel ? "group-hover:hidden" : ""}`}>
                              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                                {occupier?.professorName}
                              </span>
                              {occupier?.createdBySecretario && (
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                  via Secretaria
                                </span>
                              )}
                              {occupier?.hasTv && (
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                  <Tv className="w-3 h-3" /> TV
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            {isSelected ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700/50 px-2.5 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" /> Selecionado
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                Disponível
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOOKING FLOATING BAR */}
        {selectedShift && selectedClasses.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 inset-x-2 sm:inset-x-0 z-40 max-w-4xl mx-auto px-2 sm:px-4 animate-fade-in-up">
            <div className="bg-gray-900/95 dark:bg-gray-950/98 backdrop-blur-md text-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-gray-700 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-blue-600 p-2.5 sm:p-3 rounded-2xl shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>{selectedLab}</span>
                    <span className="text-blue-400">— {selectedShift}</span>
                  </h4>
                  <p className="text-xs text-gray-300">
                    Aulas selecionadas: <strong>{selectedClasses.join(", ")}</strong> ({selectedClasses.length} {selectedClasses.length === 1 ? "aula" : "aulas"})
                  </p>
                </div>
              </div>

              {/* TV RESOURCE SELECTION & CONFIRM BUTTON */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
                {/* TV TOGGLE */}
                <button
                  type="button"
                  onClick={() => setHasTv(!hasTv)}
                  className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    hasTv
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/30"
                      : "bg-gray-800 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>{hasTv ? "Sala COM TV 📺" : "Precisa de TV?"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedClasses([]); setSelectedShift(null); setHasTv(false); }}
                  className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Desmarcar
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveSchedule}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Reserva</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {showTour && user && user.role === "professor" && (
        <Tour
          steps={PROFESSOR_TOUR_STEPS}
          storageKey={`agendalab-tour-${user.uid}`}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
