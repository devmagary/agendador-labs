"use client";

import React from "react";
import {
  LABORATORIES,
  Laboratory,
} from "@/constants/laboratories";

export interface LabSelectorProps {
  selectedLab: string;
  onSelectLab: (labId: Laboratory) => void;
  counts?: Record<string, number>;
  variant?: "tabs" | "pills" | "cards";
  disabled?: boolean;
  className?: string;
  dataTourId?: string;
}

export const LabSelector: React.FC<LabSelectorProps> = ({
  selectedLab,
  onSelectLab,
  counts,
  variant = "tabs",
  disabled = false,
  className = "",
  dataTourId = "tour-labs",
}) => {
  if (variant === "cards") {
    return (
      <section
        data-tour-id={dataTourId}
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}
      >
        {LABORATORIES.map((lab) => {
          const isSelected = selectedLab === lab.id;
          const Icon = lab.icon;
          const count = counts?.[lab.id];

          return (
            <button
              key={lab.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectLab(lab.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3.5 relative overflow-hidden ${
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? `${lab.color.bgActive} text-white shadow-lg ${lab.color.shadow} border-transparent ring-2 ring-offset-2 dark:ring-offset-gray-950 scale-[1.02]`
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/60"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : `${lab.color.bg} ${lab.color.text}`
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm truncate">{lab.shortName}</h3>
                  {count !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 line-clamp-1 ${
                    isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {lab.name}
                </p>
              </div>
            </button>
          );
        })}
      </section>
    );
  }

  if (variant === "pills") {
    return (
      <div
        data-tour-id={dataTourId}
        className={`flex flex-wrap items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}
      >
        {LABORATORIES.map((lab) => {
          const isSelected = selectedLab === lab.id;
          const Icon = lab.icon;
          const count = counts?.[lab.id];

          return (
            <button
              key={lab.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectLab(lab.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? `${lab.color.bgActive} text-white shadow-md ${lab.color.shadow} scale-[1.02]`
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{lab.shortName}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isSelected
                      ? "bg-white/30 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: "tabs" variant matching Dashboard & Calendario
  return (
    <section
      data-tour-id={dataTourId}
      className={`bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 transition-colors ${className}`}
    >
      {LABORATORIES.map((lab) => {
        const isSelected = selectedLab === lab.id;
        const Icon = lab.icon;
        const count = counts?.[lab.id];

        return (
          <button
            key={lab.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectLab(lab.id)}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            } ${
              isSelected
                ? `${lab.color.bgActive} text-white shadow-md ${lab.color.shadow} scale-[1.01]`
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{lab.shortName}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </section>
  );
};

export default LabSelector;
