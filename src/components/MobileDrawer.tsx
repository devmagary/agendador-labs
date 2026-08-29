"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ShieldAlert,
  Clock,
  Globe,
  HelpCircle,
  LockKeyhole,
  LogOut,
  ChevronRight,
  LogIn,
} from "lucide-react";
import { RoleBadge } from "@/components/RoleBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PwaInstallButton } from "@/components/PwaInstallButton";

export interface MobileDrawerUser {
  name?: string | null;
  role?: string | null;
  uid?: string;
  mustChangePassword?: boolean;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute?: string;
  user?: MobileDrawerUser | null;
  onLogout?: () => Promise<void> | void;
  onStartTour?: () => void;
  customItems?: React.ReactNode;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentRoute = "",
  user,
  onLogout,
  onStartTour,
  customItems,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNavigation = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleLogoutClick = async () => {
    onClose();
    if (onLogout) {
      await onLogout();
    } else {
      try {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        await signOut(auth);
        router.push("/");
      } catch (err) {
        console.error("Erro ao fazer logout", err);
      }
    }
  };

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";
  const isProfessor = user?.role === "professor";

  return (
    <div
      className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/98 backdrop-blur-md px-4 py-4 space-y-3 animate-fade-in shadow-2xl transition-colors"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de Navegação Mobile"
    >
      {/* USER PROFILE HEADER OR GUEST HEADER */}
      <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">
            {isAuthenticated ? "Sessão Ativa" : "Menu do Sistema"}
          </span>
          {isAuthenticated && (
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {user?.name || "Usuário"}
            </p>
          )}
        </div>
        {isAuthenticated && <RoleBadge role={user?.role} size="sm" showIcon />}
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="space-y-1.5" aria-label="Navegação Principal Mobile">
        {/* Authenticated routes */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => handleNavigation("/dashboard")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
              currentRoute === "/dashboard"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs"
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  currentRoute === "/dashboard"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300"
                }`}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <span>Agendamentos (Início)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Admin coordinator panel */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => handleNavigation("/admin")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
              currentRoute === "/admin"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs"
                : "bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800"
            }`}
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

        {/* Logs & Ranking */}
        <button
          type="button"
          onClick={() => handleNavigation("/logs")}
          className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
            currentRoute === "/logs"
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-xs"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                currentRoute === "/logs"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <span>Histórico & Ranking Geral</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Public Calendar */}
        <button
          type="button"
          onClick={() => handleNavigation("/calendario")}
          className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
            currentRoute === "/calendario"
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                currentRoute === "/calendario"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300"
              }`}
            >
              <Globe className="w-4 h-4" />
            </div>
            <span>Painel Público de Horários</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Guided Tour for professors */}
        {isProfessor && onStartTour && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartTour();
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

        {/* Change password link */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => handleNavigation("/change-password")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
              currentRoute === "/change-password"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs"
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                <LockKeyhole className="w-4 h-4" />
              </div>
              <span>Alterar Minha Senha</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Unauthenticated Login Link */}
        {!isAuthenticated && (
          <Link
            href="/"
            onClick={onClose}
            className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-blue-200 dark:border-blue-800 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <LogIn className="w-4 h-4" />
              </div>
              <span>Fazer Login no Sistema</span>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-500" />
          </Link>
        )}

        {customItems}
      </nav>

      {/* THEME TOGGLE & PWA INSTALLATION */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <ThemeToggle variant="row" />
        <PwaInstallButton />
      </div>

      {/* LOGOUT BUTTON */}
      {isAuthenticated && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-red-100 dark:border-red-900/60 shadow-2xs active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileDrawer;
