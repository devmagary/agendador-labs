"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  emoji?: string;
}

interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourProps {
  steps: TourStep[];
  storageKey: string;
  onClose: () => void;
}

const TOOLTIP_WIDTH = 360;
const GAP = 14;
const PADDING = 6;
const TOOLTIP_EST_HEIGHT = 300;

function measureTarget(target?: string): TourRect | null {
  if (!target) return null;
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour-id="${target}"]`)
  );
  const el = els.find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (!el) return null;
  el.scrollIntoView({ block: "center", behavior: "auto" });
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

export function Tour({ steps, storageKey, onClose }: TourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);

  const step = steps[stepIndex];

  useEffect(() => {
    setRect(measureTarget(step.target));
  }, [stepIndex, step.target]);

  useEffect(() => {
    const handler = () => setRect(measureTarget(steps[stepIndex]?.target));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [stepIndex, steps]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    onClose();
  }, [storageKey, onClose]);

  const goNext = () => {
    if (stepIndex >= steps.length - 1) finish();
    else setStepIndex((i) => i + 1);
  };

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));

  const isLast = stepIndex === steps.length - 1;

  let tooltipStyle: CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  if (rect && typeof window !== "undefined") {
    const below =
      rect.top + rect.height + GAP + TOOLTIP_EST_HEIGHT <= window.innerHeight;
    const left = Math.max(
      12,
      Math.min(
        window.innerWidth - TOOLTIP_WIDTH - 12,
        rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
      )
    );
    tooltipStyle = below
      ? { top: rect.top + rect.height + GAP, left }
      : { top: Math.max(12, rect.top - GAP - TOOLTIP_EST_HEIGHT), left };
  }

  return (
    <div className="animate-tour-fade">
      {/* CLICK CATCHER: blocks interaction with the page behind the tour */}
      <div className="fixed inset-0 z-[9990]" />

      {/* SPOTLIGHT / BACKDROP */}
      {rect ? (
        <div
          className="fixed z-[9991] pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 18,
            boxShadow:
              "0 0 0 9999px rgba(15,23,42,0.72), 0 0 0 3px rgba(59,130,246,0.95)",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[9991] bg-slate-900/75 backdrop-blur-[3px] animate-tour-fade" />
      )}

      {/* TOOLTIP CARD */}
      <div
        className="fixed z-[9992] animate-tour-fade-up"
        style={{
          ...tooltipStyle,
          width: TOOLTIP_WIDTH,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white/20 p-2 rounded-xl shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">
                  Tour guiado · Passo {stepIndex + 1} de {steps.length}
                </p>
                <h3 className="text-base font-bold text-white leading-tight">
                  {step.emoji ? `${step.emoji} ` : ""}
                  {step.title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={finish}
              className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 transition-colors shrink-0"
              title="Pular tour"
              aria-label="Pular tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {step.description}
            </p>

            {/* PROGRESS DOTS */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === stepIndex
                      ? "w-6 bg-blue-600 dark:bg-blue-500"
                      : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                  aria-label={`Ir para o passo ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={finish}
              className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Pular
            </button>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 ${
                  isLast
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 shadow-md"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 shadow-md"
                }`}
              >
                {isLast ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Concluir
                  </>
                ) : (
                  <>
                    Próximo <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
