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
} from "lucide-react";
import { useRouter } from "next/navigation";

interface LogEntry {
  id: string;
  professorName: string;
  action: "create" | "cancel";
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-600/20">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                  Central de Transparência & Ranking
                </h1>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                  Histórico Completo de Agendamentos
                </p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-4 py-2 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold transition-colors text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-2 rounded-2xl shadow-xs border border-gray-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "timeline"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.01]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Linha do Tempo (Últimas Ações)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ranking")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "ranking"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.01]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-200" />
              <span>🏆 Ranking Geral de Agendamentos</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Atualização em Tempo Real
          </div>
        </div>

        {/* TAB 1: TIMELINE OF ACTIONS */}
        {activeTab === "timeline" && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Últimos 100 Registros de Atividade
              </h2>
              <span className="text-xs text-gray-400 font-semibold">{logs.length} registros</span>
            </div>

            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-gray-400">Carregando histórico...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Clock className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold">Nenhum registro encontrado</h3>
                  <p className="text-gray-500 text-sm mt-1">As ações aparecerão aqui assim que ocorrerem.</p>
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
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5" /> {formattedDate}
                            </span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                          </div>
                        )}

                        <div className="group relative flex gap-4">
                          {!isLast && (
                            <div className="absolute left-[1.125rem] top-10 bottom-[-1.5rem] w-px bg-gray-100 group-last:hidden"></div>
                          )}

                          <div
                            className={`
                              relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border
                              ${
                                log.action === "create"
                                  ? "bg-blue-50 border-blue-100 text-blue-600"
                                  : "bg-red-50 border-red-100 text-red-600"
                              }
                            `}
                          >
                            {log.action === "create" ? <History className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>

                          <div className="flex-1 pt-1 pb-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{log.professorName}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    log.action === "create"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {log.action === "create" ? "Agendou" : "Cancelou"}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{" "}
                                {log.timestamp && log.timestamp.toDate
                                  ? format(log.timestamp.toDate(), "HH:mm:ss")
                                  : "--:--"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                              {formatLogText(log)}
                            </p>
                          </div>
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
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Líder do Ranking</span>
                  <p 
                    className="text-sm sm:text-base font-extrabold text-gray-900 truncate leading-tight my-0.5" 
                    title={professorRanking[0]?.name || "Nenhum ainda"}
                  >
                    {professorRanking[0]?.name || "Nenhum ainda"}
                  </p>
                  <span className="text-xs font-bold text-amber-600 block">
                    {professorRanking[0]?.totalHours || 0} {professorRanking[0]?.totalHours === 1 ? "aula reservada" : "aulas reservadas"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total de Aulas</span>
                  <p className="text-xl font-extrabold text-gray-900 leading-tight my-0.5">{totalBookedHours} {totalBookedHours === 1 ? "aula" : "aulas"}</p>
                  <span className="text-xs font-medium text-gray-500 block">em toda a história</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Professores Engajados</span>
                  <p className="text-xl font-extrabold text-gray-900 leading-tight my-0.5">{professorRanking.length} docentes</p>
                  <span className="text-xs font-medium text-gray-500 block">utilizando laboratórios</span>
                </div>
              </div>
            </div>

            {/* TOP 3 PODIUM */}
            {professorRanking.length >= 2 && (
              <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-gray-900/10">
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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Classificação Geral de Utilização</h3>
                  <p className="text-xs text-gray-500">Ordenado pelo total de aulas reservadas</p>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar professor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {filteredRanking.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-sm font-medium text-gray-400">Nenhum professor encontrado para esta busca.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3.5 text-center w-16">Posição</th>
                        <th className="px-6 py-3.5">Professor</th>
                        <th className="px-6 py-3.5">Volume de Aulas Agendadas</th>
                        <th className="px-6 py-3.5">Distribuição por Laboratório</th>
                        <th className="px-6 py-3.5 text-center">Salas c/ TV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRanking.map((p, idx) => {
                        const originalPos = professorRanking.findIndex((x) => x.name === p.name) + 1;
                        const percentage = Math.round((p.totalHours / maxRankHours) * 100);

                        return (
                          <tr key={p.name} className="hover:bg-gray-50/80 transition-colors">
                            {/* POSITION BADGE */}
                            <td className="px-6 py-4 text-center">
                              {originalPos === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-black text-xs border border-amber-200">
                                  🥇 1º
                                </span>
                              ) : originalPos === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-black text-xs border border-slate-200">
                                  🥈 2º
                                </span>
                              ) : originalPos === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-50 text-amber-900 font-black text-xs border border-amber-200">
                                  🥉 3º
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-gray-400">
                                  #{originalPos}
                                </span>
                              )}
                            </td>

                            {/* PROFESSOR NAME */}
                            <td className="px-6 py-4 max-w-[260px]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-gray-900 block truncate" title={p.name}>{p.name}</span>
                                  <span className="text-[11px] text-gray-400 font-medium">
                                    {p.totalReservations} {p.totalReservations === 1 ? "reserva" : "reservas"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* PROGRESS BAR & TOTAL */}
                            <td className="px-6 py-4 min-w-[180px]">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-gray-900">{p.totalHours} {p.totalHours === 1 ? "aula" : "aulas"}</span>
                                  <span className="text-gray-400 font-semibold">{percentage}% do líder</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
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
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    <Monitor className="w-3 h-3" /> LabTec: {p.labTecHours} {p.labTecHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                                {p.manutecHours > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                    <Wrench className="w-3 h-3" /> Manutec: {p.manutecHours} {p.manutecHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                                {p.roboticaHours > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                    <Bot className="w-3 h-3" /> Robótica: {p.roboticaHours} {p.roboticaHours === 1 ? "aula" : "aulas"}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* TV BADGE */}
                            <td className="px-6 py-4 text-center">
                              {p.tvCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Tv className="w-3 h-3" /> {p.tvCount}x
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">-</span>
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

      <footer className="py-8 text-center border-t border-gray-100 bg-white">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          AgendaLab • Transparência Pública & Gestão Escolar
        </p>
      </footer>
    </div>
  );
}
