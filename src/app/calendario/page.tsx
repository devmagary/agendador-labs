"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
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
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Wrench,
  Bot,
  CalendarDays,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { ThemeToggle } from "@/components/ThemeToggle";

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
}

const SHIFTS: Shift[] = ["Matutino", "Vespertino", "Noturno"];
const CLASSES = [1, 2, 3, 4, 5];

export default function PublicCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
  const [selectedLab, setSelectedLab] = useState<Laboratory>("LabTec");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([]);
  const [hideWeekends, setHideWeekends] = useState<boolean>(false);

  // Listen to global settings in real time
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.hideWeekends === "boolean") {
          setHideWeekends(data.hideWeekends);
        }
      }
    });
    return () => unsubSettings();
  }, []);

  // Listen to schedules for the whole month view to display indicators
  useEffect(() => {
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
        console.warn("Erro ao ler schedules do mês (Público)", error);
      }
    );

    return () => unsubscribe();
  }, [currentMonth]);

  // Listen to schedules for the selected date & lab
  useEffect(() => {
    if (!selectedDate) return;

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
        console.warn("Erro ao ler do Firebase (Calendário Público)", error);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, selectedLab]);

  // Calculate calendar days grid for the month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getSlotOccupier = (shift: Shift, classHour: number) => {
    return schedules.find((s) => s.shift === shift && s.classHours.includes(classHour));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="bg-indigo-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-md shadow-indigo-500/20 shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight truncate">Painel Público</h1>
                <p className="text-[11px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate">Agendamento de Labs</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => (window.location.href = "/logs")}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap border border-emerald-200 dark:border-emerald-800 shadow-2xs active:scale-95"
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Histórico & Ranking</span>
                <span className="sm:hidden">Ranking</span>
              </button>

              <ThemeToggle variant="icon" />

              <Link
                href="/"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold transition-colors text-gray-800 dark:text-gray-200 shadow-2xs active:scale-95 whitespace-nowrap"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-6 sm:space-y-8">
        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 p-3.5 sm:p-4 rounded-2xl text-center font-medium text-xs sm:text-sm shadow-2xs">
          Este painel é de visualização pública em tempo real. Os agendamentos são realizados pelo portal dos professores.
        </div>

        {/* LABORATORY SELECTOR (LabTec, Manutec, Robótica) */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 p-1.5 sm:p-2 grid grid-cols-3 gap-1 sm:gap-2 w-full sm:w-max mx-auto justify-center transition-colors">
          <button
            onClick={() => setSelectedLab("LabTec")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "LabTec"
                ? "bg-indigo-600 text-white shadow-md transform scale-100"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">LabTec</span>
          </button>
          <button
            onClick={() => setSelectedLab("Manutec")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "Manutec"
                ? "bg-amber-500 text-white shadow-md transform scale-100"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Manutec</span>
          </button>
          <button
            onClick={() => setSelectedLab("Robotica")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "Robotica"
                ? "bg-purple-600 text-white shadow-md transform scale-100"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Robótica</span>
          </button>
        </section>

        {/* MONTHLY CALENDAR VIEW */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 p-2 rounded-xl">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize leading-tight">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  Dia selecionado:{" "}
                  <span className="text-indigo-600 dark:text-indigo-300 font-bold">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedDate(startOfToday());
                  setCurrentMonth(startOfToday());
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Hoje
              </button>
              <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-sm">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors active:scale-95"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors active:scale-95"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* CALENDAR GRID */}
          <div className="p-4 sm:p-6">
            {/* WEEKDAY HEADERS */}
            <div className={`grid ${hideWeekends ? "grid-cols-5" : "grid-cols-7"} gap-2 mb-2 text-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider`}>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              {!hideWeekends && <span className="text-gray-300 dark:text-gray-500">Sáb</span>}
              {!hideWeekends && <span className="text-gray-300 dark:text-gray-500">Dom</span>}
            </div>

            {/* DAYS GRID */}
            <div className={`grid ${hideWeekends ? "grid-cols-5" : "grid-cols-7"} gap-2`}>
              {calendarDays.filter(day => !hideWeekends || !isWeekend(day)).map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                const isWeekendDay = isWeekend(day);
                const dayStr = format(day, "yyyy-MM-dd");

                const dayLabSchedules = monthSchedules.filter(
                  (s) => s.date === dayStr && s.laboratory === selectedLab
                );
                const hasSchedules = dayLabSchedules.length > 0;

                return (
                  <button
                    key={day.toISOString()}
                    disabled={isWeekendDay}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative group flex flex-col items-center justify-between p-2 h-20 sm:h-24 rounded-2xl border transition-all duration-200 outline-none
                      ${!isCurrentMonth ? "opacity-30 bg-gray-50/50 dark:bg-gray-950/40 border-gray-100 dark:border-gray-800" : ""}
                      ${isWeekendDay ? "opacity-40 cursor-not-allowed bg-gray-50/60 dark:bg-gray-950/60 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500" : "cursor-pointer"}
                      ${
                        isSelected
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 shadow-md ring-2 ring-indigo-500/30 scale-[1.02] z-10"
                          : !isWeekendDay && "border-gray-200/80 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-700 shadow-sm"
                      }
                    `}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center ${
                          isCurrentDay
                            ? "bg-indigo-600 text-white"
                            : isSelected
                            ? "text-indigo-700 dark:text-indigo-200 font-black"
                            : isCurrentMonth
                            ? "text-gray-800 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {isCurrentDay && !isSelected && (
                        <span className="hidden sm:inline-block text-[9px] font-bold text-indigo-600 dark:text-indigo-300 uppercase bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/60">
                          Hoje
                        </span>
                      )}
                    </div>

                    {/* STATUS INDICATOR */}
                    <div className="w-full flex items-center justify-center gap-1">
                      {hasSchedules ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              selectedLab === "LabTec"
                                ? "bg-indigo-500"
                                : selectedLab === "Manutec"
                                ? "bg-amber-500"
                                : "bg-purple-500"
                            }`}
                          />
                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 hidden sm:inline">
                            {dayLabSchedules.length} {dayLabSchedules.length === 1 ? "reserva" : "reservas"}
                          </span>
                        </div>
                      ) : (
                        !isWeekendDay && (
                          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 hidden sm:inline">
                            Livre
                          </span>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* TIME SLOTS GRID FOR THE SELECTED DAY */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4 bg-gray-50/70 dark:bg-gray-800/60">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase">
                {selectedLab}{" "}
                <span className="text-gray-500 dark:text-gray-300 font-medium ml-2">
                  — {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </h2>
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

                    return (
                      <div
                        key={`${shift}-${classHour}`}
                        className={`
                          relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 min-h-[110px]
                          ${isOccupied ? "bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60" : "bg-white dark:bg-gray-800 border-dashed border-gray-200 dark:border-gray-700 shadow-sm"}
                        `}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                            isOccupied ? "text-gray-600 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          Aula {classHour}
                        </span>

                        {isOccupied ? (
                          <div className="flex flex-col items-center mt-1 w-full">
                            <ShieldAlert className="w-5 h-5 mb-1 text-red-400" />
                            <span className="text-xs font-bold leading-tight text-center px-1 line-clamp-1 truncate text-red-700 dark:text-red-300 max-w-[110px]">
                              {occupier.professorName}
                            </span>
                            {occupier.hasTv && (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold px-1.5 py-0.5 rounded-md mt-0.5 border border-blue-200 dark:border-blue-800">
                                📺 TV
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mt-2">
                            Livre
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
