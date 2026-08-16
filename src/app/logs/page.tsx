"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  ArrowLeft,
  History,
  CalendarDays,
  Trophy,
  Medal,
  Award,
  Search,
  Monitor,
  Wrench,
  Bot,
  Tv,
  BarChart3,
  Flame,
  Users,
  LockKeyhole,
  Download,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import * as XLSX from "xlsx";

interface LogEntry {
  id: string;
  professorName: string;
  professorId?: string;
  action: "create" | "cancel" | "settings_update" | "user_authorization_create" | "user_authorization_bulk" | "user_authorization_revoke" | "user_delete" | string;
  performedBy?: {
    uid: string;
    name: string;
    role: string;
  };
  targetProfessorId?: string | null;
  targetProfessorName?: string;
  targetDate?: string;
  laboratory?: string;
  shift?: string;
  classHours?: number[];
  hoursCount?: number;
  hasTv?: boolean;
  isSecretaryOverride?: boolean;
  cancelledScheduleSnapshot?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  details: string;
  timestamp: { toDate?: () => Date } | null;
}

interface ScheduleDoc {
  id: string;
  professorId?: string;
  professorName: string;
  laboratory: "LabTec" | "Manutec" | "Robotica";
  date: string;
  shift: string;
  classHours: number[];
  hasTv?: boolean;
}

interface ProfessorRank {
  name: string;
  totalHours: number;
  totalReservations: number;
  labTecHours: number;
  manutecHours: number;
  roboticaHours: number;
  tvCount: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "ranking">("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Listen to logs collection
  useEffect(() => {
    const qLogs = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubLogs = onSnapshot(
      qLogs,
      (snapshot) => {
        const data: LogEntry[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as LogEntry);
        });
        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao ler logs:", error);
        setLoading(false);
      }
    );

    // Listen to all schedules to compute accurate ranking metrics
    const unsubSchedules = onSnapshot(
      collection(db, "schedules"),
      (snapshot) => {
        const data: ScheduleDoc[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ScheduleDoc);
        });
        setSchedules(data);
      },
      (error) => {
        console.error("Erro ao ler agendamentos para o ranking:", error);
      }
    );

    return () => {
      unsubLogs();
      unsubSchedules();
    };
  }, []);

  const handleExportToExcel = () => {
    if (!schedules || schedules.length === 0) {
      alert("Nenhum agendamento encontrado para exportar.");
      return;
    }

    try {
      // 1. Sort schedules chronologically by date, then laboratory, then shift
      const sortedSchedules = [...schedules].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        
        const labCompare = a.laboratory.localeCompare(b.laboratory);
        if (labCompare !== 0) return labCompare;
        
        return a.shift.localeCompare(b.shift);
      });

      // 2. Create workbook
      const wb = XLSX.utils.book_new();

      // 3. Compute summary count of classes and bookings per professor
      const profStatsMap = new Map<string, {
        professor: string;
        totalHours: number;
        totalBookings: number;
        labTecHours: number;
        manutecHours: number;
        roboticaHours: number;
        tvBookings: number;
      }>();

      sortedSchedules.forEach((s) => {
        const profName = s.professorName?.trim() || "Não informado";
        const hoursCount = s.classHours?.length || 1;

        const stat = profStatsMap.get(profName) || {
          professor: profName,
          totalHours: 0,
          totalBookings: 0,
          labTecHours: 0,
          manutecHours: 0,
          roboticaHours: 0,
          tvBookings: 0,
        };

        stat.totalHours += hoursCount;
        stat.totalBookings += 1;
        if (s.laboratory === "LabTec") stat.labTecHours += hoursCount;
        else if (s.laboratory === "Manutec") stat.manutecHours += hoursCount;
        else if (s.laboratory === "Robotica") stat.roboticaHours += hoursCount;

        if (s.hasTv) stat.tvBookings += 1;

        profStatsMap.set(profName, stat);
      });

      // Sort professors by total classes/hours descending, then bookings
      const sortedProfStats = Array.from(profStatsMap.values()).sort((a, b) => {
        if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
        return b.totalBookings - a.totalBookings;
      });

      const profStatsData = sortedProfStats.map((p) => ({
        "Professor": p.professor,
        "Total de Aulas (Horas)": p.totalHours,
        "Total de Agendamentos (Reservas)": p.totalBookings,
        "Aulas no LabTec": p.labTecHours,
        "Aulas no Manutec": p.manutecHours,
        "Aulas na Robótica": p.roboticaHours,
        "Agendamentos c/ TV": p.tvBookings,
      }));

      // Sheet 1: "Total por Professor" (Consolidated count requested)
      const wsProfStats = XLSX.utils.json_to_sheet(profStatsData);
      wsProfStats["!cols"] = [
        { wch: 26 }, // Professor
        { wch: 22 }, // Total de Aulas (Horas)
        { wch: 30 }, // Total de Agendamentos (Reservas)
        { wch: 16 }, // Aulas no LabTec
        { wch: 16 }, // Aulas no Manutec
        { wch: 18 }, // Aulas na Robótica
        { wch: 18 }, // Agendamentos c/ TV
      ];
      XLSX.utils.book_append_sheet(wb, wsProfStats, "Total por Professor");

      // Sheet 2: Format data for the general sheet (All bookings line by line)
      const generalData = sortedSchedules.map((s) => {
        const [year, month, day] = s.date.split("-");
        const formattedDate = `${day}/${month}/${year}`;
        return {
          "Data": formattedDate,
          "Laboratório": s.laboratory,
          "Turno": s.shift,
          "Aulas / Horários": s.classHours ? s.classHours.map((h) => `${h}º`).join(", ") : "",
          "Professor": s.professorName || "Não informado",
          "Uso de TV?": s.hasTv ? "Sim" : "Não"
        };
      });

      const wsGeneral = XLSX.utils.json_to_sheet(generalData);
      wsGeneral["!cols"] = [
        { wch: 12 }, // Data
        { wch: 15 }, // Laboratório
        { wch: 12 }, // Turno
        { wch: 18 }, // Aulas / Horários
        { wch: 25 }, // Professor
        { wch: 12 }  // Uso de TV?
      ];
      XLSX.utils.book_append_sheet(wb, wsGeneral, "Resumo Geral");

      // Sheet 3+: Group by date and create tabs for each day
      interface ExportedDayRow {
        "Laboratório": string;
        "Turno": string;
        "Aulas / Horários": string;
        "Professor": string;
        "Uso de TV?": string;
      }
      const schedulesByDate = new Map<string, ExportedDayRow[]>();
      sortedSchedules.forEach((s) => {
        const [year, month, day] = s.date.split("-");
        const dateKey = `${day}-${month}-${year}`; // e.g. "14-08-2026"
        
        const list = schedulesByDate.get(dateKey) || [];
        list.push({
          "Laboratório": s.laboratory,
          "Turno": s.shift,
          "Aulas / Horários": s.classHours ? s.classHours.map((h) => `${h}º`).join(", ") : "",
          "Professor": s.professorName || "Não informado",
          "Uso de TV?": s.hasTv ? "Sim" : "Não"
        });
        schedulesByDate.set(dateKey, list);
      });

      // Append each day's sheet to the workbook
      schedulesByDate.forEach((dayRows, dateKey) => {
        const wsDay = XLSX.utils.json_to_sheet(dayRows);
        wsDay["!cols"] = [
          { wch: 15 }, // Laboratório
          { wch: 12 }, // Turno
          { wch: 18 }, // Aulas / Horários
          { wch: 25 }, // Professor
          { wch: 12 }  // Uso de TV?
        ];
        XLSX.utils.book_append_sheet(wb, wsDay, dateKey);
      });

      // 5. Generate filename and save workbook
      const todayStr = format(new Date(), "dd-MM-yyyy_HHmm");
      XLSX.writeFile(wb, `agendamentos_laboratorios_${todayStr}.xlsx`);
    } catch (err) {
      console.error("Erro ao exportar planilha:", err);
      alert("Ocorreu um erro ao exportar a planilha.");
    }
  };

  const formatLogText = (log: LogEntry) => {
    const timeStr = log.timestamp?.toDate
      ? format(log.timestamp.toDate(), "'ás' HH:mm", { locale: ptBR })
      : "";
    return `${log.professorName} ${log.details} ${timeStr}`;
  };

  // Compute ranking from schedules data + logs creation history
  const professorRanking = useMemo<ProfessorRank[]>(() => {
    const map = new Map<string, ProfessorRank>();

    // Aggregate from active schedules
    schedules.forEach((s) => {
      const rawName = s.professorName?.trim();
      if (!rawName) return;

      const hoursCount = s.classHours?.length || 1;
      const existing = map.get(rawName) || {
        name: rawName,
        totalHours: 0,
        totalReservations: 0,
        labTecHours: 0,
        manutecHours: 0,
        roboticaHours: 0,
        tvCount: 0,
      };

      existing.totalHours += hoursCount;
      existing.totalReservations += 1;
      if (s.laboratory === "LabTec") existing.labTecHours += hoursCount;
      else if (s.laboratory === "Manutec") existing.manutecHours += hoursCount;
      else if (s.laboratory === "Robotica") existing.roboticaHours += hoursCount;

      if (s.hasTv) existing.tvCount += 1;

      map.set(rawName, existing);
    });

    // Also parse logs to account for professors who only appear in historical log records
    logs.forEach((l) => {
      if (l.action !== "create") return;
      const rawName = l.professorName?.trim();
      if (!rawName) return;

      if (!map.has(rawName)) {
        map.set(rawName, {
          name: rawName,
          totalHours: 1,
          totalReservations: 1,
          labTecHours: l.details.includes("LabTec") ? 1 : 0,
          manutecHours: l.details.includes("Manutec") ? 1 : 0,
          roboticaHours: l.details.includes("Robotica") || l.details.includes("Robótica") ? 1 : 0,
          tvCount: l.details.includes("TV") ? 1 : 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalHours !== a.totalHours) {
        return b.totalHours - a.totalHours;
      }
      return b.totalReservations - a.totalReservations;
    });
  }, [schedules, logs]);

  // Filter ranking by search query
  const filteredRanking = useMemo(() => {
    if (!searchQuery.trim()) return professorRanking;
    const q = searchQuery.toLowerCase().trim();
    return professorRanking.filter((p) => p.name.toLowerCase().includes(q));
  }, [professorRanking, searchQuery]);

  const maxRankHours = professorRanking[0]?.totalHours || 1;

  // Global ranking quick stats
  const totalBookedHours = useMemo(() => {
    return professorRanking.reduce((acc, p) => acc + p.totalHours, 0);
  }, [professorRanking]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      {/* HEADER */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="bg-emerald-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-md shadow-emerald-600/20 shrink-0">
                <History className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight truncate">
                  Central de Transparência & Ranking
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                  Histórico de Agendamentos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* TROCAR SENHA: ALWAYS OUTSIDE */}
              <button
                onClick={() => router.push("/change-password")}
                className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0"
                title="Alterar Senha"
              >
                <LockKeyhole className="w-4 h-4 text-gray-600 dark:text-gray-300 shrink-0" />
                <span className="hidden sm:inline">Trocar Senha</span>
              </button>

              <ThemeToggle variant="icon" />

              <button
                onClick={() => router.back()}
                className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all active:scale-95 shrink-0 shadow-2xs"
                title="Voltar ao Painel"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 shrink-0" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5 sm:space-y-6">
        
        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
                activeTab === "timeline"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.01]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Linha do Tempo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ranking")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
                activeTab === "ranking"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.01]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 shrink-0" />
              <span className="truncate">🏆 Ranking Geral</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Atualização em Tempo Real
            </div>

            <button
              type="button"
              onClick={handleExportToExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white" />
              <span>Exportar Planilha</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TIMELINE OF ACTIONS */}
        {activeTab === "timeline" && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                Últimos 100 Registros de Atividade
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{logs.length} registros</span>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Carregando histórico...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                    <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-gray-900 dark:text-white font-bold">Nenhum registro encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">As ações aparecerão aqui assim que ocorrerem.</p>
                </div>
              ) : (
                <div className="p-4 sm:p-8 space-y-6">
                  {logs.map((log, index) => {
                    const isLast = index === logs.length - 1;
                    const date = log.timestamp?.toDate ? log.timestamp.toDate() : null;
                    const formattedDate = date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : "";

                    const prevLog = index > 0 ? logs[index - 1] : null;
                    const prevDate = prevLog?.timestamp?.toDate ? prevLog.timestamp.toDate() : null;
                    const showDateHeader =
                      index === 0 ||
                      (prevDate && date && format(prevDate, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd"));

                    return (
                      <div key={log.id} className="space-y-6">
                        {showDateHeader && (
                          <div className="flex items-center gap-4 py-4">
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5" /> {formattedDate}
                            </span>
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                          </div>
                        )}

                        <div className="group relative flex gap-4">
                          {!isLast && (
                            <div className="absolute left-[1.125rem] top-10 bottom-[-1.5rem] w-px bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>
                          )}

                          {(() => {
                            const meta = (() => {
                              switch (log.action) {
                                case "create":
                                  return {
                                    label: "Agendou",
                                    badgeClass: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                                    iconBgClass: "bg-blue-50 dark:bg-blue-950/80 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400",
                                    icon: <History className="w-4 h-4" />,
                                  };
                                case "cancel":
                                  return {
                                    label: "Cancelou",
                                    badgeClass: "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
                                    iconBgClass: "bg-red-50 dark:bg-red-950/80 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400",
                                    icon: <Clock className="w-4 h-4" />,
                                  };
                                case "settings_update":
                                  return {
                                    label: "Configurações",
                                    badgeClass: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                                    iconBgClass: "bg-amber-50 dark:bg-amber-950/80 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400",
                                    icon: <ShieldAlert className="w-4 h-4" />,
                                  };
                                case "user_authorization_create":
                                case "user_authorization_bulk":
                                  return {
                                    label: "Autorização",
                                    badgeClass: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                                    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
                                    icon: <Users className="w-4 h-4" />,
                                  };
                                case "user_authorization_revoke":
                                case "user_delete":
                                  return {
                                    label: "Revogação",
                                    badgeClass: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
                                    iconBgClass: "bg-purple-50 dark:bg-purple-950/80 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400",
                                    icon: <ShieldAlert className="w-4 h-4" />,
                                  };
                                default:
                                  return {
                                    label: log.action,
                                    badgeClass: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
                                    iconBgClass: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
                                    icon: <Clock className="w-4 h-4" />,
                                  };
                              }
                            })();

                            return (
                              <>
                                <div
                                  className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border ${meta.iconBgClass}`}
                                >
                                  {meta.icon}
                                </div>

                                <div className="flex-1 pt-1 pb-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">{log.professorName}</span>
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${meta.badgeClass}`}
                                      >
                                        {meta.label}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />{" "}
                                      {log.timestamp && log.timestamp.toDate
                                        ? format(log.timestamp.toDate(), "HH:mm:ss")
                                        : "--:--"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                    {formatLogText(log)}
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RANKING OF PROFESSORS */}
        {activeTab === "ranking" && (
          <div className="space-y-6">
            
            {/* QUICK STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 transition-colors">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Líder do Ranking</span>
                  <p 
                    className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white truncate leading-tight my-0.5" 
                    title={professorRanking[0]?.name || "Nenhum ainda"}
                  >
                    {professorRanking[0]?.name || "Nenhum ainda"}
                  </p>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                    {professorRanking[0]?.totalHours || 0} {professorRanking[0]?.totalHours === 1 ? "aula reservada" : "aulas reservadas"}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 transition-colors">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Total de Aulas</span>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight my-0.5">{totalBookedHours} {totalBookedHours === 1 ? "aula" : "aulas"}</p>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">em toda a história</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 transition-colors">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Professores Engajados</span>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight my-0.5">{professorRanking.length} docentes</p>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">utilizando laboratórios</span>
                </div>
              </div>
            </div>

            {/* TOP 3 PODIUM */}
            {professorRanking.length >= 2 && (
              <div className="bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
                <div className="text-center mb-8 space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Pódio de Destaque
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">Top 3 Professores Mais Ativos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
                  {/* 2nd PLACE (SILVER) */}
                  {professorRanking[1] && (
                    <div className="order-2 md:order-1 bg-white/5 backdrop-blur-xs border border-white/10 rounded-3xl p-5 text-center flex flex-col items-center relative hover:bg-white/10 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-gray-900 font-black text-lg flex items-center justify-center shadow-lg mb-3">
                        2º
                      </div>
                      <Medal className="w-6 h-6 text-slate-300 mb-2" />
                      <h4 className="font-bold text-sm text-white line-clamp-1">{professorRanking[1].name}</h4>
                      <p className="text-2xl font-black text-slate-200 mt-1">{professorRanking[1].totalHours} aulas</p>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {professorRanking[1].totalReservations} reservas
                      </span>
                    </div>
                  )}

                  {/* 1st PLACE (GOLD) */}
                  {professorRanking[0] && (
                    <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 to-amber-600/10 border-2 border-amber-400/50 rounded-3xl p-6 text-center flex flex-col items-center relative shadow-2xl scale-105 hover:scale-110 transition-transform">
                      <div className="absolute -top-3.5 bg-amber-500 text-gray-950 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <Trophy className="w-3.5 h-3.5" /> Campeão
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 text-gray-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3 mt-2">
                        1º
                      </div>
                      <h4 className="font-extrabold text-base text-amber-300 line-clamp-1">{professorRanking[0].name}</h4>
                      <p className="text-3xl font-black text-white mt-1">{professorRanking[0].totalHours} aulas</p>
                      <span className="text-xs text-amber-200/80 font-semibold">
                        {professorRanking[0].totalReservations} reservas realizadas
                      </span>
                    </div>
                  )}

                  {/* 3rd PLACE (BRONZE) */}
                  {professorRanking[2] && (
                    <div className="order-3 md:order-3 bg-white/5 backdrop-blur-xs border border-white/10 rounded-3xl p-5 text-center flex flex-col items-center relative hover:bg-white/10 transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-lg flex items-center justify-center shadow-lg mb-3">
                        3º
                      </div>
                      <Award className="w-6 h-6 text-amber-600 mb-2" />
                      <h4 className="font-bold text-sm text-white line-clamp-1">{professorRanking[2].name}</h4>
                      <p className="text-2xl font-black text-amber-400 mt-1">{professorRanking[2].totalHours} aulas</p>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {professorRanking[2].totalReservations} reservas
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FULL RANKING TABLE */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/70 dark:bg-gray-800/60">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Classificação Geral de Utilização</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Ordenado pelo total de aulas reservadas</p>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar professor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {filteredRanking.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Nenhum professor encontrado para esta busca.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        <th className="px-6 py-3.5 text-center w-16">Posição</th>
                        <th className="px-6 py-3.5">Professor</th>
                        <th className="px-6 py-3.5">Volume de Aulas Agendadas</th>
                        <th className="px-6 py-3.5">Distribuição por Laboratório</th>
                        <th className="px-6 py-3.5 text-center">Salas c/ TV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredRanking.map((p) => {
                        const originalPos = professorRanking.findIndex((x) => x.name === p.name) + 1;
                        const percentage = Math.round((p.totalHours / maxRankHours) * 100);

                        return (
                          <tr key={p.name} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                            {/* POSITION BADGE */}
                            <td className="px-6 py-4 text-center">
                              {originalPos === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-200 dark:border-amber-800">
                                  🥇 1º
                                </span>
                              ) : originalPos === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200 dark:border-slate-700">
                                  🥈 2º
                                </span>
                              ) : originalPos === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black text-xs border border-amber-200 dark:border-amber-800">
                                  🥉 3º
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                  #{originalPos}
                                </span>
                              )}
                            </td>

                            {/* PROFESSOR NAME */}
                            <td className="px-6 py-4 max-w-[260px]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-gray-900 dark:text-white block truncate" title={p.name}>{p.name}</span>
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                    {p.totalReservations} {p.totalReservations === 1 ? "reserva" : "reservas"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* PROGRESS BAR & TOTAL */}
                            <td className="px-6 py-4 min-w-[180px]">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-gray-900 dark:text-white">{p.totalHours} {p.totalHours === 1 ? "aula" : "aulas"}</span>
                                  <span className="text-gray-400 dark:text-gray-500 font-semibold">{percentage}% do líder</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* LABS DISTRIBUTION */}
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {p.labTecHours > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                    <Monitor className="w-3 h-3" /> LabTec: {p.labTecHours} {p.labTecHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                                {p.manutecHours > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                                    <Wrench className="w-3 h-3" /> Manutec: {p.manutecHours} {p.manutecHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                                {p.roboticaHours > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                    <Bot className="w-3 h-3" /> Robótica: {p.roboticaHours} {p.roboticaHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* TV BADGE */}
                            <td className="px-6 py-4 text-center">
                              {p.tvCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                  <Tv className="w-3 h-3" /> {p.tvCount}x
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="py-8 text-center border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          AgendaLab • Transparência Pública & Gestão Escolar
        </p>
      </footer>
    </div>
  );
}
