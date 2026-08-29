---
name: frontend-design-system
description: "Guia abrangente de padrões visuais, Design System, tokens Tailwind v4, temas claro/escuro e catálogo de componentes modulares do AgendaLab."
---

# AgendaLab Frontend Design System & Component Guidelines

Este documento define os padrões visuais, a arquitetura de tokens, a hierarquia de cores semânticas e o catálogo completo de componentes reutilizáveis do **AgendaLab**. Destina-se a orientar desenvolvedores e agentes na implementação de novas telas, widgets e refatorações com consistência absoluta, acessibilidade e alta manutenibilidade.

---

## 1. Filosofia de Design & Stack Tecnológica

O AgendaLab é um sistema escolar e acadêmico para agendamento e gerenciamento compartilhado de laboratórios de informática, robótica, biologia e manutenção.

### Pilares de Design
1. **Clareza Operacional**: Interfaces limpas, informativas e com densidade de dados equilibrada para professores, coordenadores e secretários escolares.
2. **Identidade Visual por Papel e Laboratório**: Cores semânticas consistentes para distinguir instantaneamente papéis administrativos e os 4 laboratórios da instituição.
3. **Harmonia nos Modos Claro e Escuro**: Suporte nativo a Light/Dark Mode sem FOUC (*Flash of Unstyled Content*), mantendo alto contraste em estados interativos (`hover`, `active`, `focus`).
4. **Modularidade e Tipagem Estrita**: Componentes desacoplados com contratos TypeScript rígidos, eliminando duplicações em rotas.
5. **Acessibilidade & Responsividade**: Suporte completo a telas móveis (Smartphones), tablets e desktops com navegação por teclado e semântica ARIA.

### Stack Tecnológica
- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **Biblioteca de UI**: React 19 (`use client` nos componentes interativos)
- **Estilização**: Tailwind CSS v4 (Arquitetura CSS-first com `@theme inline` e `@custom-variant dark`)
- **Iconografia**: `lucide-react`
- **Tipografia**: Geist Sans (`--font-geist-sans`) e Geist Mono (`--font-geist-mono`) via `next/font/google`
- **Persistência de Tema**: `ThemeProvider` com `localStorage` (`agendalab-theme`) e detecção de `prefers-color-scheme`.

---

## 2. Tokens Semânticos de Cores (Tailwind CSS v4)

Os tokens de design são definidos como variáveis CSS em `src/app/globals.css`, sincronizados nos seletores `:root` e `.dark`, e expostos ao Tailwind v4 via bloco `@theme inline`.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

### Matriz de Variáveis CSS Semânticas

| Categoria | Variável CSS | Modo Claro (`:root`) | Modo Escuro (`.dark`) | Utilidade / Classe Tailwind |
| :--- | :--- | :--- | :--- | :--- |
| **Superfície Principal** | `--bg-primary` | `#f9fafb` (gray-50) | `#030712` (gray-950) | `bg-bg-primary` ou `bg-gray-50 dark:bg-gray-950` |
| **Superfície Secundária** | `--bg-secondary` | `#f3f4f6` (gray-100) | `#111827` (gray-900) | `bg-bg-secondary` ou `bg-gray-100 dark:bg-gray-900` |
| **Cards & Modais** | `--bg-card` / `--bg-surface` | `#ffffff` (white) | `#111827` (gray-900) | `bg-white dark:bg-gray-900` |
| **Superfície Destacada** | `--bg-surface-raised` | `#ffffff` | `#1f2937` (gray-800) | `bg-white dark:bg-gray-800` |
| **Superfície Mapeada/Muted**| `--bg-muted` | `#f3f4f6` (gray-100) | `#1f2937` (gray-800) | `bg-gray-100 dark:bg-gray-800` |
| **Bordas Sutis** | `--border-subtle` | `#f3f4f6` (gray-100) | `#111827` (gray-900) | `border-gray-100 dark:border-gray-900` |
| **Bordas Padrão** | `--border-default` | `#e5e7eb` (gray-200) | `#1f2937` (gray-800) | `border-gray-200 dark:border-gray-800` |
| **Bordas Fortes** | `--border-strong` | `#d1d5db` (gray-300) | `#374151` (gray-700) | `border-gray-300 dark:border-gray-700` |
| **Foco de Teclado** | `--border-focus` | `#3b82f6` (blue-500) | `#60a5fa` (blue-400) | `focus:border-blue-500 dark:focus:border-blue-400` |
| **Texto Primário** | `--text-primary` | `#111827` (gray-900) | `#f9fafb` (gray-50) | `text-gray-900 dark:text-white` |
| **Texto Secundário** | `--text-secondary` | `#4b5563` (gray-600) | `#d1d5db` (gray-300) | `text-gray-600 dark:text-gray-300` |
| **Texto Suave (Muted)** | `--text-muted` | `#6b7280` (gray-500) | `#9ca3af` (gray-400) | `text-gray-500 dark:text-gray-400` |
| **Texto Desabilitado** | `--text-disabled` | `#9ca3af` (gray-400) | `#6b7280` (gray-500) | `text-gray-400 dark:text-gray-500` |

---

## 3. Identidade Visual por Papel de Usuário (*Role Visual Identity*)

Cada perfil de usuário possui uma cor primária semântica e um ícone associado, facilitando a identificação imediata das permissões:

```
+---------------------+-------------------+---------------------+-------------------------+
| Papel               | Cor Principal     | Ícone Lucide        | Classes de Badge        |
+---------------------+-------------------+---------------------+-------------------------+
| Professor(a)        | Azul / Índigo     | GraduationCap       | bg-blue-100 ...         |
| Coordenador / Admin | Âmbar / Dourado   | ShieldCheck         | bg-amber-100 ...        |
| Secretaria Escolar  | Roxo / Violeta    | BookOpen            | bg-purple-100 ...       |
| Público / Visitante | Cinza Neutro      | Users / Globe       | bg-gray-100 ...         |
+---------------------+-------------------+---------------------+-------------------------+
```

### Especificação Detalhada por Papel

#### 1. Professor (`role="professor"`)
- **Cor Primária**: Azul Real (`#2563eb` / `#3b82f6`)
- **Modo Claro**: Fundo `bg-blue-100`, Texto `text-blue-900`, Borda `border-blue-200`
- **Modo Escuro**: Fundo `dark:bg-blue-950/60`, Texto `dark:text-blue-300`, Borda `dark:border-blue-800`
- **Ícone**: `GraduationCap`

#### 2. Coordenador / Admin (`role="admin"` ou `role="coordenador"`)
- **Cor Primária**: Âmbar / Dourado (`#d97706` / `#f59e0b`)
- **Modo Claro**: Fundo `bg-amber-100`, Texto `text-amber-900`, Borda `border-amber-200`
- **Modo Escuro**: Fundo `dark:bg-amber-950/60`, Texto `dark:text-amber-300`, Borda `dark:border-amber-800`
- **Ícone**: `ShieldCheck` ou `ShieldAlert`

#### 3. Secretaria Escolar (`role="secretario"` ou `role="secretaria"`)
- **Cor Primária**: Roxo / Violeta (`#9333ea` / `#a855f7`)
- **Modo Claro**: Fundo `bg-purple-100`, Texto `text-purple-900`, Borda `border-purple-200`
- **Modo Escuro**: Fundo `dark:bg-purple-950/60`, Texto `dark:text-purple-300`, Borda `dark:border-purple-800`
- **Ícone**: `BookOpen`

#### 4. Público / Visitante (`role="public"` ou `role="publico"`)
- **Cor Primária**: Cinza Neutro (`#4b5563` / `#9ca3af`)
- **Modo Claro**: Fundo `bg-gray-100`, Texto `text-gray-700`, Borda `border-gray-200`
- **Modo Escuro**: Fundo `dark:bg-gray-800`, Texto `dark:text-gray-300`, Borda `dark:border-gray-700`
- **Ícone**: `Users` ou `Globe`

---

## 4. Identidade dos Laboratórios & Helpers (`@/constants/laboratories`)

A instituição possui 4 laboratórios padronizados. Toda a estilização e dados dos laboratórios são centralizados em `src/constants/laboratories.ts`.

### Paleta dos Laboratórios

| ID | Nome Completo | Nome Curto | Ícone | Cor Primária | Classe de Badge (Claro / Escuro) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`LabTec`** | Laboratório de Tecnologia e Informática | LabTec | `Monitor` | Azul (`blue-600`) | `bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800` |
| **`Manutec`** | Laboratório de Manutenção e Suporte | Manutec | `Wrench` | Âmbar (`amber-600`) | `bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800` |
| **`Robotica`**| Laboratório de Robótica Educacional | Robótica | `Bot` | Roxo (`purple-600`) | `bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800` |
| **`Biologia`**| Laboratório de Biologia / Análise Clínica | Biologia / Análise | `FlaskConical` | Esmeralda (`emerald-600`) | `bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800` |

### Funções Utilitárias Disponíveis

```typescript
import {
  isValidLabId,      // (labId: string | null | undefined): labId is LabId
  getLabConfig,      // (labId: string | null | undefined): LabDefinition
  getLabColor,       // (labId: string | null | undefined): LabThemeColors
  getLabIcon,        // (labId: string | null | undefined): LucideIcon
  getLabBadgeClass,  // (labId: string | null | undefined): string
  getLabDotClass,    // (labId: string | null | undefined): string
  LABORATORIES,      // LabDefinition[]
  LABORATORIES_CONFIG// Record<LabId, LabDefinition>
} from "@/constants/laboratories";
```

#### Exemplo de Uso dos Helpers
```tsx
import { getLabBadgeClass, getLabIcon } from "@/constants/laboratories";

export function LabPill({ labId }: { labId: string }) {
  const Icon = getLabIcon(labId);
  const badgeClass = getLabBadgeClass(labId);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${badgeClass}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{labId}</span>
    </span>
  );
}
```

---

## 5. Catálogo de Componentes do Design System

Todos os componentes do Design System estão localizados em `src/components/` e exportam contratos TypeScript tipados.

---

### 5.1. `<Header />`

Cabeçalho unificado e responsivo com logotipo, navegação desktop por rota, alternador de tema, ações de perfil, tour guiado e gaveta mobile (`<MobileDrawer />`).

#### Contrato TypeScript (`HeaderProps`)
```typescript
import { LucideIcon } from "lucide-react";
import { MobileDrawerUser } from "@/components/MobileDrawer";

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
```

#### Descrição das Props
- `currentRoute`: Caminho da rota atual (ex: `"/dashboard"`, `"/admin"`, `"/logs"`, `"/calendario"`) para destacar o botão ativo.
- `user`: Objeto com `{ name, role, uid, mustChangePassword }`. Se omitido, consome automaticamente o `useAuth()`.
- `onLogout`: Callback customizado de logout. Se omitido, executa `signOut(auth)` do Firebase.
- `onStartTour`: Callback para reiniciar o tour guiado do professor (`/dashboard`).
- `showBack`: Se `true`, exibe o botão "Voltar".
- `backHref` / `onBack`: Rota de destino ou função ao clicar em "Voltar".
- `title` / `subtitle`: Substitui a marca padrão "AgendaLab" por um título customizado (usado no `/admin` e `/logs`).
- `icon`: Substitui o ícone do logotipo da marca.
- `customActions`: Nós React adicionais renderizados ao lado do ThemeToggle e Logout.
- `hideNavLinks`: Se `true`, esconde os links de navegação central.

#### Exemplo de Uso
```tsx
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardHeader({ onStartTour }: { onStartTour: () => void }) {
  const { user } = useAuth();

  return (
    <Header
      currentRoute="/dashboard"
      user={user}
      onStartTour={onStartTour}
    />
  );
}
```

---

### 5.2. `<MobileDrawer />`

Menu deslizante inferior para dispositivos móveis com perfil de usuário, links de navegação acessíveis, alteração de senha, alternador de tema e atalho para instalação de PWA.

#### Contrato TypeScript (`MobileDrawerProps`)
```typescript
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
```

#### Exemplo de Uso
Geralmente gerenciado internamente pelo `<Header />`, mas pode ser instanciado isoladamente se necessário:
```tsx
<MobileDrawer
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  currentRoute="/admin"
  user={currentUser}
/>
```

---

### 5.3. `<RoleBadge />`

Badge visual padronizada para representar papéis de usuário no sistema com suporte a tamanhos, ícones e customização de rótulos.

#### Contrato TypeScript (`RoleBadgeProps`)
```typescript
export type UserRole = "admin" | "secretario" | "professor" | "public" | string;

export interface RoleBadgeProps {
  role?: UserRole | null;
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}
```

#### Tabela de Tamanhos (`size`)
- `xs`: `text-[10px] px-2 py-0.5 gap-1` (ideal para cabeçalhos e tabelas densas)
- `sm`: `text-xs px-2.5 py-0.5 gap-1.5` (padrão em cards e listas)
- `md`: `text-sm px-3 py-1 gap-1.5`
- `lg`: `text-base px-3.5 py-1.5 gap-2`

#### Exemplo de Uso
```tsx
import { RoleBadge } from "@/components/RoleBadge";

// Exemplo compacto com ícone
<RoleBadge role="admin" size="xs" showIcon />

// Exemplo padrão
<RoleBadge role={user.role} size="sm" showIcon />
```

---

### 5.4. `<LabSelector />`

Seletor de laboratórios modular com suporte a 3 variantes de layout, badges de contagem de agendamentos e navegação acessível.

#### Contrato TypeScript (`LabSelectorProps`)
```typescript
import { Laboratory } from "@/constants/laboratories";

export interface LabSelectorProps {
  selectedLab: string;
  onSelectLab: (labId: Laboratory) => void;
  counts?: Record<string, number>;
  variant?: "tabs" | "pills" | "cards";
  disabled?: boolean;
  className?: string;
  dataTourId?: string;
}
```

#### Variantes de Layout (`variant`)
1. `"tabs"` (Padrão): Grade responsiva em 2x2 (mobile) e 1x4 (desktop) com ícones e nomes centralizados. Ideal para telas principais (`/dashboard` e `/calendario`).
2. `"pills"`: Linha horizontal compacta com botões arredondados. Ideal para barras de filtro rápido em tabelas ou modais.
3. `"cards"`: Grade com cartões expandidos contendo descrição detalhada e badge de contagem em destaque. Ideal para painéis de administração (`/admin`).

#### Exemplo de Uso
```tsx
import { useState } from "react";
import { LabSelector } from "@/components/LabSelector";
import type { Laboratory } from "@/constants/laboratories";

export function LaboratoryFilter() {
  const [activeLab, setActiveLab] = useState<Laboratory>("LabTec");
  const appointmentCounts = { LabTec: 12, Manutec: 5, Robotica: 8, Biologia: 3 };

  return (
    <LabSelector
      selectedLab={activeLab}
      onSelectLab={setActiveLab}
      counts={appointmentCounts}
      variant="tabs"
    />
  );
}
```

---

### 5.5. `<QuotaCard />`

Indicador visual de cotas de aulas semanais com barra de progresso animada, cores dinâmicas de estado e suporte a cotas personalizadas com estrelas.

#### Contrato TypeScript (`QuotaCardProps`)
```typescript
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
```

#### Estados e Regras de Cores
- **Normal (< 80% e < limite-1)**: Verde (`emerald-600` / `emerald-400`), feedback de aulas disponíveis.
- **Atenção (>= 80% ou restante = 1)**: Âmbar (`amber-600` / `amber-400`), alerta de proximidade do limite.
- **Esgotado (used >= total ou isOverLimit)**: Vermelho (`red-600` / `red-400`), aviso de cota semanal atingida.

#### Variantes (`variant`)
1. `"full"`: Cartão principal com título, badge de cota personalizada, barra de progresso e texto de feedback.
2. `"compact"`: Widget reduzido ideal para modais ou barras laterais.
3. `"inline"`: Pílula compacta com contagem textual (ex: `Cota Semanal: 3/4 ⭐`).

#### Exemplo de Uso
```tsx
import { QuotaCard } from "@/components/QuotaCard";

<QuotaCard
  used={3}
  total={4}
  label="Cota Semanal"
  title="Aulas no LabTec"
  labName="LabTec"
  isCustomQuota={false}
  variant="full"
/>
```

---

### 5.6. `<AuditBadge />`

Badge de auditoria e registro de eventos com mapeamento semântico automático para todas as ações do sistema (criação, cancelamento, alterações de permissão e cotas).

#### Contrato TypeScript (`AuditBadgeProps`)
```typescript
export interface AuditBadgeProps {
  action?: string;
  status?: string;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}
```

#### Tabela de Ações Mapeadas

| Ação / Status | Rótulo Renderizado | Cor Semântica | Ícone |
| :--- | :--- | :--- | :--- |
| `create` / `criado` | "Agendou" / "Criado" | Azul (`blue-100` / `blue-950`) | `History` |
| `cancel` / `cancelado` / `excluido` | "Cancelou" / "Excluído" | Vermelho (`red-100` / `red-950`) | `Clock` |
| `settings_update` | "Configurações" | Âmbar (`amber-100` / `amber-950`) | `ShieldAlert` |
| `user_authorization_create` / `bulk`| "Autorização" / "Lote" | Esmeralda (`emerald-100` / `emerald-950`) | `Users` |
| `custom_quota_update` | "Cota Personalizada" | Índigo (`indigo-100` / `indigo-950`) | `Star` |
| `custom_quota_remove` | "Cota Restaurada" | Âmbar (`amber-100` / `amber-950`) | `RotateCcw` |
| `user_authorization_revoke` | "Revogação" | Roxo (`purple-100` / `purple-950`) | `ShieldAlert` |
| `confirmado` | "Confirmado" | Esmeralda (`emerald-100` / `emerald-950`) | `CheckCircle2` |
| `bloqueado` | "Bloqueado" | Cinza (`gray-100` / `gray-800`) | `Lock` |

#### Exemplo de Uso
```tsx
import { AuditBadge } from "@/components/AuditBadge";

<AuditBadge action="create" size="xs" showIcon />
<AuditBadge action="cancel" size="xs" showIcon />
<AuditBadge action="custom_quota_update" size="sm" showIcon />
```

---

### 5.7. `<ThemeToggle />`

Botão de alternância entre Modo Claro (☀️) e Modo Escuro (🌙) integrado com o `ThemeContext`.

#### Contrato TypeScript (`ThemeToggleProps`)
```typescript
export interface ThemeToggleProps {
  variant?: "icon" | "row" | "badge";
  className?: string;
}
```

#### Variantes (`variant`)
1. `"icon"`: Botão quadrado (`h-9 w-9`) com borda sutil, ícones `Sun` / `Moon` e efeito `active:scale-95`. Usado no cabeçalho desktop.
2. `"row"`: Botão largo com texto explicativo e indicador de estado. Usado na gaveta mobile.

---

## 6. Padrões de Layout, Espaçamento e Contêineres

Para garantir alinhamento vertical e horizontal em todas as páginas, adote rigorosamente as convenções abaixo:

### Estrutura Base de Página
```tsx
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Header currentRoute="/sua-rota" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
```

### Dimensões e Espaçamentos Padronizados
- **Contêiner Central**: `max-w-7xl mx-auto` (largura máxima de 1280px).
- **Padding Horizontal da Página**: `px-4 sm:px-6 lg:px-8`.
- **Padding Vertical da Página**: `py-6 sm:py-8`.
- **Altura do Cabeçalho**: `h-16 sm:h-20` com `sticky top-0 z-40 backdrop-blur-md`.
- **Espaçamento entre Seções**: `space-y-6` ou `gap-6`.
- **Bordas Arredondadas**:
  - Cartões Principais: `rounded-3xl` ou `rounded-2xl`
  - Botões e Inputs: `rounded-xl`
  - Badges e Pílulas: `rounded-full`
- **Sombras**:
  - Elementos Interativos: `shadow-2xs` ou `shadow-xs` com `active:scale-95`
  - Cartões e Seções: `shadow-sm` ou `shadow-md`
  - Modais e Drawers: `shadow-2xl`

---

## 7. Regras de Modo Escuro & Checklist de Acessibilidade

### Prevenção de FOUC (*Flash of Unstyled Content*)
- Sempre adicione `suppressHydrationWarning` nas tags `<html>` e `<body>` no `src/app/layout.tsx`.
- O `ThemeProvider` sincroniza a classe `dark` no `document.documentElement` imediatamente ao carregar.

### Regras de Contraste e Estados Interativos
1. **Nunca use classes Tailwind não padronizadas** como `hover:bg-gray-750` ou `backdrop-blur-xs`.
2. **Sempre declare pares explícitos de `hover` para claro e escuro**:
   - `hover:bg-gray-50 dark:hover:bg-gray-800`
   - `hover:bg-amber-100 dark:hover:bg-amber-900/60`
   - `hover:text-blue-700 dark:hover:text-blue-400`
3. **Bordas no Modo Escuro**: Use `dark:border-gray-800` para superfícies neutras e `dark:border-gray-700` para botões interativos.
4. **Fundos Translúcidos com Backdrop**: `bg-white/85 dark:bg-gray-900/85 backdrop-blur-md` garante legibilidade em barras fixas.

### Checklist de Acessibilidade (WCAG AA/AAA)
- [x] Contraste mínimo de 4.5:1 para texto normal e 3:1 para texto grande em ambos os temas.
- [x] Botões possuem `aria-label` ou texto visível explícito.
- [x] Ícones puramente decorativos recebem `aria-hidden="true"`.
- [x] Estados de foco visíveis com anéis de foco (`focus:ring-2 focus:ring-offset-2`).
- [x] Modais e drawers móveis implementam `role="dialog"` e `aria-modal="true"`.

---

## 8. Guia do Desenvolvedor: Criando Novas Telas e Funcionalidades

Ao criar uma nova página ou funcionalidade no AgendaLab, siga este fluxo passo a passo:

### Passo 1: Imports Padronizados
Importe os componentes e utilitários do Design System:
```tsx
import { Header } from "@/components/Header";
import { RoleBadge } from "@/components/RoleBadge";
import { LabSelector } from "@/components/LabSelector";
import { QuotaCard } from "@/components/QuotaCard";
import { getLabConfig } from "@/constants/laboratories";
import { useAuth } from "@/contexts/AuthContext";
```

### Passo 2: Estruturar a Página com o Contêiner Canônico
```tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";

export default function NovaFuncionalidadePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Header currentRoute="/nova-rota" user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <section className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Título da Seção</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Descrição sucinta da funcionalidade.</p>
        </section>
      </main>
    </div>
  );
}
```

### Passo 3: Utilizar Tokens e Modos de Cor nos Controles
- **Inputs**: `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20`
- **Botões Primários**: `bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs active:scale-95`
- **Botões Secundários**: `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl`

### Passo 4: Validação do Build
Sempre execute o comando de verificação de tipos e compilação do Next.js:
```bash
npm run build
```
Certifique-se de que nenhum erro de tipagem (`tsc`) ou lint seja reportado.
