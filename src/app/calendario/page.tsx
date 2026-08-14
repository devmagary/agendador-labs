"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-500/20">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">Painel Público</h1>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Agendamento de Labs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => (window.location.href = "/logs")}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap border border-emerald-200"
              >
                <Clock className="w-4 h-4" /> Histórico
              </button>
              <Link
                href="/"
                className="px-4 py-2 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold transition-colors text-gray-700 shadow-sm"
              >
                Acesso do Professor
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded-2xl text-center font-medium text-sm shadow-sm">
          Este painel é de visualização pública em tempo real. Os agendamentos são realizados pelo portal dos professores.
        </div>

        {/* LABORATORY SELECTOR (LabTec, Manutec, Robótica) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-2 w-full sm:w-max mx-auto justify-center">
          <button
            onClick={() => setSelectedLab("LabTec")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "LabTec"
                ? "bg-indigo-600 text-white shadow-md transform scale-100"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Monitor className="w-5 h-5" /> LabTec
          </button>
          <button
            onClick={() => setSelectedLab("Manutec")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "Manutec"
                ? "bg-amber-500 text-white shadow-md transform scale-100"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Wrench className="w-5 h-5" /> Manutec
          </button>
          <button
            onClick={() => setSelectedLab("Robotica")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 outline-none focus:outline-none ${
              selectedLab === "Robotica"
                ? "bg-purple-600 text-white shadow-md transform scale-100"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Bot className="w-5 h-5" /> Robótica
          </button>
        </section>

        {/* MONTHLY CALENDAR VIEW */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 capitalize leading-tight">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Dia selecionado:{" "}
                  <span className="text-indigo-600 font-bold">
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
                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Hoje
              </button>
              <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors active:scale-95"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors active:scale-95"
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
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span className="text-gray-300">Sáb</span>
              <span className="text-gray-300">Dom</span>
            </div>

            {/* DAYS GRID */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
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
                      ${!isCurrentMonth ? "opacity-30 bg-gray-50/50 border-gray-100" : ""}
                      ${isWeekendDay ? "opacity-40 cursor-not-allowed bg-gray-50/60 border-gray-100" : "cursor-pointer"}
                      ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-500/30 scale-[1.02] z-10"
                          : !isWeekendDay && "border-gray-200/80 hover:border-indigo-300 bg-white hover:bg-gray-50/80 shadow-sm"
                      }
                    `}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center ${
                          isCurrentDay
                            ? "bg-indigo-600 text-white"
                            : isSelected
                            ? "text-indigo-700 font-black"
                            : isCurrentMonth
                            ? "text-gray-800"
                            : "text-gray-400"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {isCurrentDay && !isSelected && (
                        <span className="hidden sm:inline-block text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
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
                          <span className="text-[10px] font-bold text-gray-500 hidden sm:inline">
                            {dayLabSchedules.length} {dayLabSchedules.length === 1 ? "reserva" : "reservas"}
                          </span>
                        </div>
                      ) : (
                        !isWeekendDay && (
                          <span className="text-[9px] font-semibold text-gray-300 hidden sm:inline">
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
        <section className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 uppercase">
                {selectedLab}{" "}
                <span className="text-gray-400 font-medium ml-2">
                  — {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </h2>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-8">
            {SHIFTS.map((shift) => (
              <div key={shift} className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-widest border-b border-gray-100 pb-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> {shift}
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
                          ${isOccupied ? "bg-red-50/80 border-red-200" : "bg-white border-dashed border-gray-200 shadow-sm"}
                        `}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                            isOccupied ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Aula {classHour}
                        </span>

                        {isOccupied ? (
                          <div className="flex flex-col items-center mt-1 w-full">
                            <ShieldAlert className="w-5 h-5 mb-1 text-red-400" />
                            <span className="text-xs font-bold leading-tight text-center px-1 line-clamp-1 truncate text-red-700 max-w-[110px]">
                              {occupier.professorName}
                            </span>
                            {occupier.hasTv && (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-md mt-0.5">
                                📺 TV
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-gray-300 mt-2">
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
