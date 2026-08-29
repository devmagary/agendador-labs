"use client";

import React from "react";
import { ShieldCheck, BookOpen, GraduationCap, Users, LucideIcon } from "lucide-react";

export type UserRole = "admin" | "secretario" | "professor" | "public" | string;

export interface RoleBadgeProps {
  role?: UserRole | null;
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}

interface RoleConfig {
  label: string;
  badgeClass: string;
  icon: LucideIcon;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  admin: {
    label: "Coordenador / Admin",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: ShieldCheck,
  },
  coordenador: {
    label: "Coordenador",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: ShieldCheck,
  },
  secretario: {
    label: "Secretaria Escolar",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: BookOpen,
  },
  secretaria: {
    label: "Secretaria Escolar",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: BookOpen,
  },
  professor: {
    label: "Professor(a)",
    badgeClass:
      "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: GraduationCap,
  },
  public: {
    label: "Público",
    badgeClass:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    icon: Users,
  },
  publico: {
    label: "Público",
    badgeClass:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    icon: Users,
  },
};

const SIZE_STYLES = {
  xs: {
    badge: "text-[10px] px-2 py-0.5 gap-1 font-semibold",
    icon: "w-3 h-3",
  },
  sm: {
    badge: "text-xs px-2.5 py-0.5 gap-1.5 font-bold",
    icon: "w-3.5 h-3.5",
  },
  md: {
    badge: "text-sm px-3 py-1 gap-1.5 font-bold",
    icon: "w-4 h-4",
  },
  lg: {
    badge: "text-base px-3.5 py-1.5 gap-2 font-bold",
    icon: "w-5 h-5",
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role = "professor",
  size = "sm",
  showIcon = false,
  className = "",
  customLabel,
}) => {
  const normalizedRole = (role || "professor").toLowerCase().trim();
  const config = ROLE_CONFIGS[normalizedRole] || {
    label: customLabel || role || "Usuário",
    badgeClass:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    icon: Users,
  };

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const IconComponent = config.icon;
  const displayLabel = customLabel || config.label;

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors shadow-2xs select-none ${config.badgeClass} ${sizeStyle.badge} ${className}`}
    >
      {showIcon && <IconComponent className={`${sizeStyle.icon} shrink-0`} aria-hidden="true" />}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};

export default RoleBadge;
