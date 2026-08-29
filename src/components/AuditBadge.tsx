"use client";

import React from "react";
import {
  History,
  Clock,
  ShieldAlert,
  Users,
  Star,
  RotateCcw,
  BookOpen,
  Lock,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";

export interface AuditBadgeProps {
  action?: string;
  status?: string;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}

export interface AuditActionMeta {
  label: string;
  badgeClass: string;
  iconBgClass: string;
  icon: LucideIcon;
}

const ACTION_CONFIGS: Record<string, AuditActionMeta> = {
  create: {
    label: "Agendou",
    badgeClass:
      "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    iconBgClass:
      "bg-blue-50 dark:bg-blue-950/80 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    icon: History,
  },
  criado: {
    label: "Criado",
    badgeClass:
      "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    iconBgClass:
      "bg-blue-50 dark:bg-blue-950/80 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    icon: History,
  },
  cancel: {
    label: "Cancelou",
    badgeClass:
      "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    iconBgClass:
      "bg-red-50 dark:bg-red-950/80 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400",
    icon: Clock,
  },
  cancelado: {
    label: "Cancelado",
    badgeClass:
      "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    iconBgClass:
      "bg-red-50 dark:bg-red-950/80 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400",
    icon: Clock,
  },
  excluido: {
    label: "Excluído",
    badgeClass:
      "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    iconBgClass:
      "bg-red-50 dark:bg-red-950/80 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400",
    icon: Clock,
  },
  settings_update: {
    label: "Configurações",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    iconBgClass:
      "bg-amber-50 dark:bg-amber-950/80 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400",
    icon: ShieldAlert,
  },
  user_authorization_create: {
    label: "Autorização",
    badgeClass:
      "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    iconBgClass:
      "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    icon: Users,
  },
  user_authorization_bulk: {
    label: "Autorização em Lote",
    badgeClass:
      "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    iconBgClass:
      "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    icon: Users,
  },
  custom_quota_update: {
    label: "Cota Personalizada",
    badgeClass:
      "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    iconBgClass:
      "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
    icon: Star,
  },
  custom_quota_remove: {
    label: "Cota Restaurada",
    badgeClass:
      "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    iconBgClass:
      "bg-amber-50 dark:bg-amber-950/80 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400",
    icon: RotateCcw,
  },
  user_authorization_revoke: {
    label: "Revogação",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    iconBgClass:
      "bg-purple-50 dark:bg-purple-950/80 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400",
    icon: ShieldAlert,
  },
  user_delete: {
    label: "Usuário Excluído",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    iconBgClass:
      "bg-purple-50 dark:bg-purple-950/80 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400",
    icon: ShieldAlert,
  },
  secretaria: {
    label: "Secretaria",
    badgeClass:
      "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    iconBgClass:
      "bg-purple-50 dark:bg-purple-950/80 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400",
    icon: BookOpen,
  },
  bloqueado: {
    label: "Bloqueado",
    badgeClass:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700",
    iconBgClass:
      "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
    icon: Lock,
  },
  confirmado: {
    label: "Confirmado",
    badgeClass:
      "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    iconBgClass:
      "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

export function getAuditMeta(actionOrStatus?: string | null): AuditActionMeta {
  if (!actionOrStatus) {
    return {
      label: "Registro",
      badgeClass:
        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      iconBgClass:
        "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
      icon: Clock,
    };
  }

  const key = actionOrStatus.toLowerCase().trim();
  if (ACTION_CONFIGS[key]) {
    return ACTION_CONFIGS[key];
  }

  return {
    label: actionOrStatus.toUpperCase(),
    badgeClass:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    iconBgClass:
      "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
    icon: Clock,
  };
}

const SIZE_STYLES = {
  xs: {
    badge: "text-[10px] px-2 py-0.5 gap-1 font-bold",
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
};

export const AuditBadge: React.FC<AuditBadgeProps> = ({
  action,
  status,
  size = "xs",
  showIcon = false,
  className = "",
  customLabel,
}) => {
  const meta = getAuditMeta(action || status);
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.xs;
  const IconComponent = meta.icon;
  const displayLabel = customLabel || meta.label;

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider transition-colors select-none ${meta.badgeClass} ${sizeStyle.badge} ${className}`}
    >
      {showIcon && <IconComponent className={`${sizeStyle.icon} shrink-0`} aria-hidden="true" />}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};

export default AuditBadge;
