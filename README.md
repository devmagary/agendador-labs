<div align="center">
  <img src="public/globe.svg" alt="Logo" width="80" height="80">
  <h1 align="center">AgendaLab</h1>
  <p align="center">
    <strong>Sistema moderno, responsivo e em tempo real para gestão e agendamento de Laboratórios Escolares.</strong>
    <br />
    Desenvolvido com foco em Experiência do Usuário (UI/UX), Gestão de Cotas, Resolução de Conflitos e Acessibilidade Multiplataforma (PWA).
  </p>
</div>

<br />

## 📋 Sobre o Projeto

O **AgendaLab** é uma solução Web Full-Stack desenvolvida para otimizar o uso e resolver conflitos de agendamento em espaços compartilhados de instituições de ensino. 

O sistema opera com sincronização em **tempo real** via Firebase Firestore. Quando um professor ou a secretaria realiza ou cancela uma reserva em qualquer laboratório, todos os usuários conectados visualizam instantaneamente as alterações.

---

## 🚀 Principais Funcionalidades

### 🧪 Gestão de 4 Laboratórios Especializados
- 🖥️ **LabTec:** Laboratório de Tecnologia e Informática.
- 🔧 **Manutec:** Laboratório de Manutenção e Hardware.
- 🤖 **Robótica:** Laboratório de Robótica Educacional e Automação.
- 🧪 **Biologia / Análise Clínica:** Laboratório de Ciências Biológicas e Práticas de Saúde.

### ⚙️ Gestão Flexível de Cotas Semanais (Painel do Coordenador)
- **Cota Global vs. Cotas Isoladas por Laboratório:** O Coordenador Geral pode alternar entre cota unificada (ex: 4 aulas/semana somadas) ou limites específicos para cada laboratório (ex: 2 aulas no LabTec, 2 no Manutec, etc.).
- **Cotas Personalizadas por Professor (Exceções):** Permite atribuir cotas customizadas para docentes com demandas específicas sem alterar a regra padrão dos demais.
- **Ocultação de Fins de Semana:** Opção para remover sábados e domingos da grade mensal, otimizando o espaço da tela em dispositivos móveis.

### 🔒 Prevenção Inteligente de Conflitos de Horário
- **Bloqueio de Dupla Reserva:** O sistema impede que o mesmo professor reserve laboratórios diferentes no mesmo dia, turno e horário de aula.

### 📊 Indicador de Cota & Progresso em Tempo Real
- Widget interativo no painel do professor indicando aulas utilizadas, saldo disponível e aviso visual quando o limite semanal for atingido.

### 🏆 Central de Transparência, Auditoria & Ranking (`/logs`)
- **Linha do Tempo de Auditoria:** Registro detalhado de agendamentos, cancelamentos e alterações de configurações com identificação de quem realizou a ação.
- **Ranking Histórico de Utilização:** Pódio dos docentes mais ativos (Ouro, Prata e Bronze) com gráficos de distribuição de aulas por laboratório e contagem de aulas com TV.
- **Exportação para Excel (`.xlsx`):** Geração de planilhas consolidadas com estatísticas por professor e lista cronológica de reservas.

### 👩‍💼 Painel de Delegação da Secretaria
- A Secretaria Escolar pode realizar agendamentos em nome de qualquer docente cadastrado, com consulta em tempo real à cota do professor selecionado e opção de liberação especial autorizada pelo Coordenador.

### ⚡ Importação e Gestão de Usuários
- Cadastro individual ou importação em lote de listas de professores (a partir de PDFs ou relatórios do SIGEduc).
- Primeiro acesso seguro com fluxo obrigatório de alteração de senha (`/change-password`).

### 📱 PWA (Progressive Web App) & Design System Modular
- **Instalável como App:** Suporte completo a PWA para Android, iOS e Desktop com manifesto e Service Worker.
- **Design System Consistente:** Componentes modulares (`Header`, `MobileDrawer`, `LabSelector`, `QuotaCard`, `RoleBadge`, `AuditBadge`) e suporte fluido a **Modo Claro (Light)** e **Modo Escuro (Dark)**.
- **Visão Pública:** Rota `/calendario` aberta para consulta por alunos e comunidade escolar sem necessidade de login.

---

## 💻 Stack Tecnológica

* **Front-end:** React 19, Next.js 15 (App Router), TypeScript.
* **Estilização e Design System:** Tailwind CSS v4, Lucide Icons, Dark/Light Mode adaptativo.
* **PWA:** Service Worker nativo, Web App Manifest.
* **Manipulação de Planilhas:** SheetJS (`xlsx`).
* **Datas:** Date-fns com localização `pt-BR`.
* **Back-end & Banco de Dados:** Firebase Firestore (Real-time NoSQL) e Firebase Authentication.
* **Deploy:** Vercel.

---

## 🔧 Guia de Configuração e Instalação

Consulte o arquivo [`instrucoes_de_implantacao.md`](./instrucoes_de_implantacao.md) para o passo a passo completo de configuração das credenciais do Firebase, variáveis de ambiente e regras de segurança (`firestore.rules`).

---

<div align="center">
  <i>Construído com Next.js & TailwindCSS por um desenvolvedor focado na solução prática.</i>
</div>
