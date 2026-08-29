# Project: AgendaLab Front-End Standardization & Design System

## Architecture
AgendaLab is a laboratory scheduling and management application built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, and Firebase Firestore/Auth.
The front-end architecture is transitioning from monolithic, duplicate inline page implementations to a clean, modular Design System:
- **Design Tokens & Theme Layer**: Semantic CSS variables in `src/app/globals.css` with `@theme inline` for seamless light/dark mode and high contrast.
- **Shared Constants & Types**: Centralized laboratory definitions, role configurations, and component prop interfaces in `src/constants/` and `src/types/`.
- **Component Layer**: Reusable primitives and domain components in `src/components/`:
  - `Header.tsx` & `MobileDrawer.tsx`: Unified navigation, user profile, role badge, theme toggle, and actions.
  - `RoleBadge.tsx`: Consistent role indicator (Professor: blue/indigo, Coordenador/Admin: amber/gold, Secretaria: purple, Public: gray).
  - `LabSelector.tsx`: Unified laboratory switcher across Dashboard, Calendário, and Admin with standardized lab palette (LabTec: blue, Manutec: amber, Robótica: purple, Biologia: emerald).
  - `QuotaCard.tsx`: Quota progress and limit visualizer.
  - `AuditBadge.tsx`: Standardized audit action tags.
- **Documentation & Agent Skill**: `.gemini/skills/frontend-design-system/SKILL.md` containing the complete style guide and component catalog.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tailwind v4 Semantic Tokens | Declare `:root` and `.dark` CSS variables and `@theme inline` in `globals.css` | M1 | Survey (Explorer 2) |
| 2 | Invalid Tailwind Classes Fix | Fix `hover:bg-gray-750`, `backdrop-blur-xs`, unregistered animations (`animate-fade-in`, `animate-fade-in-up`) | M1 | Survey (Explorer 2) |
| 3 | Dark Mode Contrast & Hover Fix | Fix missing `dark:hover:bg-*` in admin quota steppers, custom quotas, and dashboard initial load flash | M1 | Survey (Explorer 2) |
| 4 | Laboratory Palette Harmonization | Unify colors for LabTec (blue), Manutec (amber), Robótica (purple), and Biologia (emerald) across all views | M1 | Survey (Explorer 1, 2, 3) |
| 5 | RoleBadge Component | Componentize role badges with standardized colors and icons for Professor, Admin, Secretaria, Public | M2 | Survey (Explorer 1, 3) |
| 6 | LabSelector Component | Componentize the 4-lab switcher supporting active states, counts, and responsive layout | M2 | Survey (Explorer 1, 3) |
| 7 | QuotaCard & Indicators | Componentize quota visualization for daily/weekly/monthly quotas with progress bars and badges | M2 | Survey (Explorer 3) |
| 8 | AuditBadge Component | Componentize status and action badges for logs and appointment history | M2 | Survey (Explorer 3) |
| 9 | Unified Header Component | Modular Header supporting desktop layout, user profile, role badges, theme toggle, logout, and responsive drawer | M3 | Survey (Explorer 1, 3) |
| 10 | Unified MobileDrawer Component | Modular responsive drawer with role-based navigation links, user info, and quick actions | M3 | Survey (Explorer 1) |
| 11 | Header Route Integrations | Integrate unified Header in `/dashboard`, `/admin`, `/logs`, `/calendario`, `/change-password`, and `/` | M3 | Survey (Explorer 1) |
| 12 | Design System Skill Documentation | Create `.gemini/skills/frontend-design-system/SKILL.md` with complete design tokens, APIs, and guidelines | M4 | ORIGINAL_REQUEST §R4 |
| 13 | Build & TypeScript Cleanliness | Validate `npm run build` runs with 0 errors/warnings and strict type compliance | M5 | ORIGINAL_REQUEST §Acceptance Criteria |
| 14 | Zero Regression Verification | Verify all workflows (scheduling, quotas, cancellations, filters, theme toggle, Excel export) remain intact | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design Tokens & Theme Foundation | `src/app/globals.css`, animations, invalid class cleanups, dark mode contrast fixes | none | DONE |
| M2 | Shared Reusable UI Components | `RoleBadge.tsx`, `LabSelector.tsx`, `QuotaCard.tsx`, `AuditBadge.tsx`, constants | M1 | DONE |
| M3 | Header & Navigation Modularization | `Header.tsx`, `MobileDrawer.tsx`, and route integrations in `/dashboard`, `/admin`, `/logs`, `/calendario`, `/change-password` | M1, M2 | DONE |
| M4 | Front-end Design System Skill | `.gemini/skills/frontend-design-system/SKILL.md` and documentation | M1, M2, M3 | DONE |
| M5 | Integration, Build & Zero-Regression QA | `npm run build`, multi-role flow verification, Challenger adversarial tests, Forensic Audit | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Laboratory Constants (`src/constants/laboratories.ts` or `src/types/designSystem.ts`)
```typescript
export type LabId = "LabTec" | "Manutec" | "Robotica" | "Biologia";

export interface LabDefinition {
  id: LabId;
  name: string;
  shortName: string;
  color: {
    primary: string; // e.g. "blue-600"
    badge: string;   // e.g. "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
    activeBg: string;
    border: string;
  };
  iconName?: string;
}
```

### RoleBadge (`src/components/RoleBadge.tsx`)
```typescript
export type UserRole = "admin" | "secretario" | "professor" | "public" | string;

export interface RoleBadgeProps {
  role?: UserRole;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}
```

### LabSelector (`src/components/LabSelector.tsx`)
```typescript
export interface LabSelectorProps {
  selectedLab: string;
  onSelectLab: (labId: string) => void;
  variant?: "pills" | "tabs" | "cards";
  counts?: Record<string, number>;
  className?: string;
}
```

### Header & MobileDrawer (`src/components/Header.tsx`, `src/components/MobileDrawer.tsx`)
```typescript
export interface HeaderProps {
  currentRoute?: string;
  user?: {
    name?: string | null;
    role?: string;
    uid?: string;
  } | null;
  onLogout?: () => void;
  showBack?: boolean;
  backHref?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
```

## Code Layout
- `src/app/globals.css`: Global styles, CSS variables, `@theme inline`, animations.
- `src/constants/`: Constants for labs, roles, navigation items.
- `src/components/`:
  - `ThemeToggle.tsx` (existing, clean up invalid classes)
  - `Header.tsx` (new unified header)
  - `MobileDrawer.tsx` (new unified drawer)
  - `RoleBadge.tsx` (new role badge)
  - `LabSelector.tsx` (new modular lab selector)
  - `QuotaCard.tsx` (new quota indicator)
  - `AuditBadge.tsx` (new audit badge)
  - `Tour.tsx`, `PwaInstallButton.tsx`, `PwaRegister.tsx` (existing)
- `src/app/dashboard/page.tsx`: Uses `Header`, `LabSelector`, `QuotaCard`, `RoleBadge`.
- `src/app/admin/page.tsx`: Uses `Header`, `RoleBadge`, `LabSelector`, fixed dark mode hovers.
- `src/app/logs/page.tsx`: Uses `Header`, `RoleBadge`, `AuditBadge`.
- `src/app/calendario/page.tsx`: Uses `Header`, `LabSelector`, fixed router navigation.
- `.gemini/skills/frontend-design-system/SKILL.md`: Frontend Design System Skill.
