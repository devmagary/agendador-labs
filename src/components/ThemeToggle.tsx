"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "row" | "badge";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
          isDark
            ? "bg-gray-800 text-amber-300 border-gray-700 hover:bg-gray-750"
            : "bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100"
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isDark ? "bg-amber-400/20 text-amber-300" : "bg-amber-500 text-white"}`}>
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
          <span>{isDark ? "Modo Escuro Ativo 🌙" : "Modo Claro Ativo ☀️"}</span>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-lg font-extrabold uppercase tracking-wider bg-black/10 dark:bg-white/10">
          Alternar
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 ${
        isDark
          ? "bg-gray-800 border-gray-700 text-amber-300 hover:bg-gray-700 shadow-xs"
          : "bg-gray-100 border-gray-200 text-amber-600 hover:bg-amber-50 shadow-2xs"
      } ${className}`}
      title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
      aria-label="Alternar tema claro/escuro"
    >
      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      <span className="sr-only sm:not-sr-only text-xs font-bold hidden xl:inline">
        {isDark ? "Escuro" : "Claro"}
      </span>
    </button>
  );
}
