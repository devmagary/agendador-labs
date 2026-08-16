"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
    if (isAppleMobile) {
      setIsIOS(true);
    }

    // Listen for install prompt on Android/Chrome/Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosTip(true);
    } else {
      alert(
        "Para instalar no seu celular:\n\n1. Abra o menu do seu navegador (três pontinhos no topo/base)\n2. Toque em 'Instalar aplicativo' ou 'Adicionar à tela inicial'."
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white/20 text-white shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 font-bold">
              <span>Instalar Aplicativo</span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </div>
            <p className="text-[10px] text-blue-100 font-normal">
              Acesse mais rápido direto da sua tela inicial
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-lg font-extrabold uppercase tracking-wider bg-white/20 text-white">
          Baixar
        </span>
      </button>

      {/* IOS INSTRUCTIONS MODAL */}
      {showIosTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Instalar no iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosTip(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 list-decimal list-inside leading-relaxed">
              <li>
                Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima na barra do Safari).
              </li>
              <li>
                Role para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
              </li>
              <li>
                Toque em <strong>Adicionar</strong> no canto superior direito.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosTip(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
