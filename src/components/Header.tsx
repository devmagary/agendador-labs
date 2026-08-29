"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldAlert,
  Globe,
  HelpCircle,
  LockKeyhole,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  History,
  LogIn,
  LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/RoleBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileDrawer, MobileDrawerUser } from "@/components/MobileDrawer";

export interface HeaderProps {
  currentRoute?: string;
  user?: MobileDrawerUser | null;
  onLogout?: () => Promise<void> | void;
  onStartTour?: () => void;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  customActions?: React.ReactNode;
  hideNavLinks?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute = "",
  user: explicitUser,
  onLogout,
  onStartTour,
  showBack = false,
  backHref,
  onBack,
  title,
  subtitle,
  icon,
  customActions,
  hideNavLinks = false,
  className = "",
}) => {
  const router = useRouter();
  const authContext = useAuth();
  // Fall back to context user if explicitUser is not passed (undefined)
  const user = explicitUser !== undefined ? explicitUser : authContext.user;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";
  const isProfessor = user?.role === "professor";

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const handleLogoutClick = async () => {
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

  // Determine brand icon and styles
  const getBrandMeta = () => {
    if (icon) {
      return {
        Icon: icon,
        bgClass: "bg-blue-600 text-white shadow-blue-500/20",
      };
    }
    if (currentRoute === "/admin") {
      return {
        Icon: ShieldAlert,
        bgClass: "bg-amber-600 text-white shadow-amber-600/20",
      };
    }
    if (currentRoute === "/logs") {
      return {
        Icon: History,
        bgClass: "bg-emerald-600 text-white shadow-emerald-600/20",
      };
    }
    if (currentRoute === "/calendario") {
      return {
        Icon: CalendarIcon,
        bgClass: "bg-indigo-600 text-white shadow-indigo-500/20",
      };
    }
    if (currentRoute === "/change-password") {
      return {
        Icon: ShieldAlert,
        bgClass: "bg-amber-600 text-white shadow-amber-500/20",
      };
    }
    return {
      Icon: CalendarIcon,
      bgClass: "bg-blue-600 text-white shadow-blue-500/20",
    };
  };

  const { Icon: BrandIcon, bgClass: brandBgClass } = getBrandMeta();
  const brandHomeLink = isAuthenticated ? "/dashboard" : "/";

  return (
    <header
      className={`bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-xs transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* LEFT: BACK BUTTON & BRAND / TITLE */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {showBack && (
              <button
                type="button"
                onClick={handleBackClick}
                className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0"
                title="Voltar"
                aria-label="Voltar para a tela anterior"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}

            <Link
              href={brandHomeLink}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 group cursor-pointer select-none"
              title="AgendaLab — Início"
            >
              <div
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 shadow-md transition-transform group-hover:scale-105 ${brandBgClass}`}
              >
                <BrandIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0">
                {title ? (
                  <>
                    <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight truncate">
                      {title}
                    </h1>
                    {subtitle ? (
                      <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                        {subtitle}
                      </p>
                    ) : user ? (
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[130px] sm:max-w-[240px]">
                        Olá, <strong className="text-gray-700 dark:text-gray-200">{user.name}</strong>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                        AgendaLab
                      </span>
                      {user && (
                        <div className="hidden xs:inline-flex">
                          <RoleBadge role={user.role} size="xs" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[130px] sm:max-w-[240px]">
                      {user ? (
                        <>
                          Olá, <strong className="text-gray-700 dark:text-gray-200">{user.name}</strong>
                        </>
                      ) : (
                        "Sistema de Agendamento"
                      )}
                    </p>
                  </>
                )}
              </div>
            </Link>
          </div>

          {/* CENTER / RIGHT: DESKTOP NAVIGATION LINKS */}
          {!hideNavLinks && (
            <nav className="hidden lg:flex items-center gap-1.5" aria-label="Menu Principal">
              {/* Authenticated Dashboard */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className={`flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl border transition-all ${
                    currentRoute === "/dashboard"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Início</span>
                </button>
              )}

              {/* Coordinator Admin Panel */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className={`flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl border transition-all ${
                    currentRoute === "/admin"
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs"
                      : "bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Painel do Coordenador</span>
                </button>
              )}

              {/* Logs & Ranking */}
              <button
                type="button"
                onClick={() => router.push("/logs")}
                className={`flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl border transition-all ${
                  currentRoute === "/logs"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-xs"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-gray-200 dark:border-gray-700"
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Histórico & Ranking</span>
              </button>

              {/* Public Calendar */}
              <button
                type="button"
                onClick={() => router.push("/calendario")}
                className={`flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl border transition-all ${
                  currentRoute === "/calendario"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-xs"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-gray-200 dark:border-gray-700"
                }`}
              >
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Painel Público</span>
              </button>

              {/* Professor Guided Tour */}
              {isProfessor && onStartTour && (
                <button
                  type="button"
                  onClick={onStartTour}
                  className="flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-sky-700 dark:hover:text-sky-400 bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                  title="Reiniciar tour guiado"
                >
                  <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Tour Guiado</span>
                </button>
              )}
            </nav>
          )}

          {/* RIGHT: QUICK ACTIONS & MOBILE HAMBURGER */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {customActions}

            {/* CHANGE PASSWORD BUTTON (AUTHENTICATED) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => router.push("/change-password")}
                className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0"
                title="Alterar Senha"
                data-tour-id="tour-password"
              >
                <LockKeyhole className="w-4 h-4 text-gray-600 dark:text-gray-300 shrink-0" />
                <span className="hidden sm:inline">Trocar Senha</span>
              </button>
            )}

            {/* THEME TOGGLE */}
            <span data-tour-id="tour-theme" className="inline-flex">
              <ThemeToggle variant="icon" />
            </span>

            {/* DESKTOP LOGOUT / LOGIN */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="hidden sm:flex h-9 px-3 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-xs font-bold items-center justify-center gap-1.5 shrink-0"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Sair</span>
              </button>
            ) : (
              <Link
                href="/"
                className="hidden sm:flex h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Login</span>
              </Link>
            )}

            {/* MOBILE HAMBURGER BUTTON (VISIBLE BELOW LG) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden h-9 w-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                isMobileMenuOpen
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu de navegação"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-DOWN DRAWER */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentRoute={currentRoute}
        user={user}
        onLogout={onLogout || handleLogoutClick}
        onStartTour={onStartTour}
      />
    </header>
  );
};

export default Header;
