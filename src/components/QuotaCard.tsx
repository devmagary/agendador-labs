"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Star } from "lucide-react";

export interface QuotaCardProps {
  used: number;
  total: number;
  label?: string;
  title?: string;
  periodLabel?: string;
  isOverLimit?: boolean;
  isCustomQuota?: boolean;
  labName?: string;
  helperText?: string;
  variant?: "full" | "compact" | "inline";
  className?: string;
}

export const QuotaCard: React.FC<QuotaCardProps> = ({
  used,
  total,
  label = "Cota Semanal",
  title,
  periodLabel,
  isOverLimit = false,
  isCustomQuota = false,
  labName,
  helperText,
  variant = "full",
  className = "",
}) => {
  const safeTotal = Math.max(1, total);
  const percentage = Math.min(100, Math.max(0, (used / safeTotal) * 100));
  const isExhausted = used >= total || isOverLimit;
  const isNearLimit = !isExhausted && (used >= total - 1 || percentage >= 80);
  const remaining = Math.max(0, total - used);

  // Status-based color tokens
  const statusColor = isExhausted
    ? {
        text: "text-red-600 dark:text-red-400",
        bar: "bg-red-500",
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-red-200 dark:border-red-900/60",
      }
    : isNearLimit
    ? {
        text: "text-amber-600 dark:text-amber-400",
        bar: "bg-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-amber-200 dark:border-amber-900/60",
      }
    : {
        text: "text-emerald-600 dark:text-emerald-400",
        bar: "bg-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-900/60",
      };

  if (variant === "inline") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${statusColor.bg} ${statusColor.border} ${className}`}
      >
        <span className="text-gray-600 dark:text-gray-300 font-semibold">{label}:</span>
        <span className={statusColor.text}>
          {used}/{total}
        </span>
        {isCustomQuota && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-current" />
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xs border border-gray-200 dark:border-gray-800 transition-colors ${className}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
              {label}
            </span>
            {isCustomQuota && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                ⭐
              </span>
            )}
          </div>
          <span className={`text-xs font-extrabold ${statusColor.text}`}>
            {used} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden p-0.5 border border-gray-200 dark:border-gray-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusColor.bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  // Full default variant matching Dashboard
  return (
    <section
      className={`bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </span>
            {isCustomQuota && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Star className="w-3 h-3 fill-indigo-500 dark:fill-indigo-400" />
                Cota Personalizada
              </span>
            )}
            {periodLabel && (
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                ({periodLabel})
              </span>
            )}
          </div>

          {title && (
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto min-w-[220px]">
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold">
            <span className="text-gray-500 dark:text-gray-400">Aulas Utilizadas:</span>
            <span className={`text-sm font-extrabold ${statusColor.text}`}>
              {used} / {total}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200 dark:border-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusColor.bar}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Helper / Feedback text */}
          {helperText ? (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {helperText}
            </p>
          ) : isExhausted ? (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Limite semanal {labName ? `no ${labName}` : ""} atingido!
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {remaining} {remaining === 1 ? "aula disponível" : "aulas disponíveis"}{" "}
              {labName ? `no ${labName}` : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuotaCard;
