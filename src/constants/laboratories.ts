import { Monitor, Wrench, Bot, FlaskConical, Salad, HardHat, type LucideIcon } from "lucide-react";

export type Laboratory =
  | "LabTec"
  | "Manutec"
  | "Robotica"
  | "Biologia"
  | "Nutricao"
  | "SegurancaTrabalho";
export type LabId = Laboratory;

export interface LabThemeColors {
  primary: string;
  bg: string;
  bgSubtle: string;
  bgActive: string;
  text: string;
  textActive: string;
  border: string;
  borderSubtle: string;
  badge: string;
  dot: string;
  ring: string;
  shadow: string;
  hoverBg: string;
}

export interface LabDefinition {
  id: LabId;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  iconName: string;
  color: LabThemeColors;
}

export const LAB_IDS: readonly LabId[] = [
  "LabTec",
  "Manutec",
  "Robotica",
  "Biologia",
  "Nutricao",
  "SegurancaTrabalho",
] as const;

export const LABORATORIES_CONFIG: Record<LabId, LabDefinition> = {
  LabTec: {
    id: "LabTec",
    name: "Laboratório de Tecnologia e Informática",
    shortName: "LabTec",
    description: "Laboratório de Tecnologia",
    icon: Monitor,
    iconName: "Monitor",
    color: {
      primary: "blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      bgSubtle: "bg-blue-50/60 dark:bg-blue-950/30",
      bgActive: "bg-blue-600",
      text: "text-blue-700 dark:text-blue-300",
      textActive: "text-white",
      border: "border-blue-200 dark:border-blue-800",
      borderSubtle: "border-blue-100 dark:border-blue-900/50",
      badge: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      dot: "bg-blue-500",
      ring: "focus:ring-blue-500/20 focus:border-blue-500",
      shadow: "shadow-blue-500/20",
      hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
    },
  },
  Manutec: {
    id: "Manutec",
    name: "Laboratório de Manutenção e Suporte",
    shortName: "Manutec",
    description: "Laboratório de Manutenção",
    icon: Wrench,
    iconName: "Wrench",
    color: {
      primary: "amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      bgSubtle: "bg-amber-50/60 dark:bg-amber-950/30",
      bgActive: "bg-amber-600",
      text: "text-amber-800 dark:text-amber-300",
      textActive: "text-white",
      border: "border-amber-200 dark:border-amber-800",
      borderSubtle: "border-amber-100 dark:border-amber-900/50",
      badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
      ring: "focus:ring-amber-500/20 focus:border-amber-500",
      shadow: "shadow-amber-500/20",
      hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
    },
  },
  Robotica: {
    id: "Robotica",
    name: "Laboratório de Robótica Educacional",
    shortName: "Robótica",
    description: "Laboratório de Robótica",
    icon: Bot,
    iconName: "Bot",
    color: {
      primary: "purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      bgSubtle: "bg-purple-50/60 dark:bg-purple-950/30",
      bgActive: "bg-purple-600",
      text: "text-purple-800 dark:text-purple-300",
      textActive: "text-white",
      border: "border-purple-200 dark:border-purple-800",
      borderSubtle: "border-purple-100 dark:border-purple-900/50",
      badge: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      dot: "bg-purple-500",
      ring: "focus:ring-purple-500/20 focus:border-purple-500",
      shadow: "shadow-purple-500/20",
      hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
    },
  },
  Biologia: {
    id: "Biologia",
    name: "Laboratório de Biologia / Análise Clínica",
    shortName: "Biologia / Análise",
    description: "Laboratório de Biologia",
    icon: FlaskConical,
    iconName: "FlaskConical",
    color: {
      primary: "emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      bgSubtle: "bg-emerald-50/60 dark:bg-emerald-950/30",
      bgActive: "bg-emerald-600",
      text: "text-emerald-800 dark:text-emerald-300",
      textActive: "text-white",
      border: "border-emerald-200 dark:border-emerald-800",
      borderSubtle: "border-emerald-100 dark:border-emerald-900/50",
      badge: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
      ring: "focus:ring-emerald-500/20 focus:border-emerald-500",
      shadow: "shadow-emerald-500/20",
      hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
    },
  },
  Nutricao: {
    id: "Nutricao",
    name: "Laboratório de Nutrição",
    shortName: "Nutrição",
    description: "Laboratório de Nutrição",
    icon: Salad,
    iconName: "Salad",
    color: {
      primary: "lime-600",
      bg: "bg-lime-50 dark:bg-lime-900/20",
      bgSubtle: "bg-lime-50/60 dark:bg-lime-950/30",
      bgActive: "bg-lime-600",
      text: "text-lime-800 dark:text-lime-300",
      textActive: "text-white",
      border: "border-lime-200 dark:border-lime-800",
      borderSubtle: "border-lime-100 dark:border-lime-900/50",
      badge: "bg-lime-100 dark:bg-lime-950/80 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800",
      dot: "bg-lime-500",
      ring: "focus:ring-lime-500/20 focus:border-lime-500",
      shadow: "shadow-lime-500/20",
      hoverBg: "hover:bg-lime-100 dark:hover:bg-lime-900/50",
    },
  },
  SegurancaTrabalho: {
    id: "SegurancaTrabalho",
    name: "Laboratório de Segurança do Trabalho",
    shortName: "Segurança",
    description: "Laboratório de Segurança do Trabalho",
    icon: HardHat,
    iconName: "HardHat",
    color: {
      primary: "red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
      bgSubtle: "bg-red-50/60 dark:bg-red-950/30",
      bgActive: "bg-red-600",
      text: "text-red-700 dark:text-red-300",
      textActive: "text-white",
      border: "border-red-200 dark:border-red-800",
      borderSubtle: "border-red-100 dark:border-red-900/50",
      badge: "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      dot: "bg-red-500",
      ring: "focus:ring-red-500/20 focus:border-red-500",
      shadow: "shadow-red-500/20",
      hoverBg: "hover:bg-red-100 dark:hover:bg-red-900/50",
    },
  },
};

export const LABORATORIES: LabDefinition[] = [
  LABORATORIES_CONFIG.LabTec,
  LABORATORIES_CONFIG.Manutec,
  LABORATORIES_CONFIG.Robotica,
  LABORATORIES_CONFIG.Biologia,
  LABORATORIES_CONFIG.Nutricao,
  LABORATORIES_CONFIG.SegurancaTrabalho,
];

/**
 * Checks if a string is a valid Laboratory ID
 */
export function isValidLabId(labId: string | null | undefined): labId is LabId {
  if (!labId) return false;
  return labId in LABORATORIES_CONFIG;
}

/**
 * Gets the complete LabDefinition for a given lab ID, with fallback to LabTec
 */
export function getLabConfig(labId: string | null | undefined): LabDefinition {
  if (isValidLabId(labId)) {
    return LABORATORIES_CONFIG[labId];
  }
  return LABORATORIES_CONFIG.LabTec;
}

/**
 * Gets theme colors for a given lab ID
 */
export function getLabColor(labId: string | null | undefined): LabThemeColors {
  return getLabConfig(labId).color;
}

/**
 * Gets the Lucide icon for a given lab ID
 */
export function getLabIcon(labId: string | null | undefined): LucideIcon {
  return getLabConfig(labId).icon;
}

/**
 * Gets the badge class string for a given lab ID
 */
export function getLabBadgeClass(labId: string | null | undefined): string {
  return getLabConfig(labId).color.badge;
}

/**
 * Gets the dot indicator color class for a given lab ID
 */
export function getLabDotClass(labId: string | null | undefined): string {
  return getLabConfig(labId).color.dot;
}
