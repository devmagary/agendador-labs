<div align="center">
  <img src="public/globe.svg" alt="Logo" width="80" height="80">
  <h1 align="center">AgendaLab</h1>
  <p align="center">
    <strong>Sistema moderno e responsivo para agendamento em tempo real de Laboratórios Escolares.</strong>
    <br />
    Desenvolvido com foco em Experiência do Usuário (UI/UX), Gestão de Cotas e Resolução de Conflitos.
  </p>
</div>

<br />

## 📋 Sobre o Projeto

O **AgendaLab** é uma solução Web Full-Stack desenvolvida para resolver conflitos de agendamento em espaços compartilhados de instituições de ensino (como Laboratórios de Tecnologia, Manutenção e Robótica). 

O sistema opera com sincronização em **tempo real** via Firebase Firestore. Se um professor ou a secretaria agendar uma aula em qualquer laboratório, todos os usuários conectados visualizam instantaneamente os horários ocupados e liberados.

---

## 🚀 Principais Features

- **Calendário Mensal Interativo:** Navegação completa por meses com indicação de dias com reservas, destaques para o dia atual e seleção ágil de datas.
- **Gestão de Múltiplos Laboratórios:** Suporte integrado a três espaços independentes:
  - 🖥️ **LabTec** (Laboratório de Tecnologia)
  - 🔧 **Manutec** (Laboratório de Manutenção)
  - 🤖 **Robótica** (Laboratório de Robótica)
- **⚙️ Controle de Cota Semanal pelo Coordenador (Dinâmico):**
  - O Coordenador/Admin pode definir e alterar a cota semanal máxima de aulas por professor em tempo real.
  - A alteração reflete instantaneamente nos painéis dos professores e secretários sem necessidade de recarregar a página.
- **📊 Indicador de Cota Semanal em Tempo Real:**
  - Barra de progresso visual no Dashboard informando as aulas disponíveis e utilizadas na semana.
  - Bloqueio automático de agendamentos que excedam o limite semanal.
- **🏆 Central de Transparência & Ranking Histórico (`/logs`):**
  - **Linha do Tempo:** Histórico cronológico em tempo real de todas as ações de agendamento e cancelamento.
  - **Ranking de Docentes:** Pódio com Top 3 (Ouro, Prata, Bronze) e tabela consolidada dos professores que mais utilizaram os laboratórios em toda a história, com contagem de aulas e distribuição por espaço.
- **📺 Opção de Sala com TV:**
  - Seletor no momento da reserva para indicar se a aula necessita de televisão (`📺 Com TV`).
  - Badges informativos nos horários, rankings e no histórico de auditoria.
- **👩‍💼 Painel e Controle da Secretária:**
  - Secretários podem agendar em nome de qualquer professor da escola.
  - O sistema calcula e exibe em tempo real a cota do professor selecionado, debitando diretamente da cota dele.
- **⚡ Importação em Lote de Usuários:**
  - O Coordenador/Admin pode copiar e colar relatórios inteiros do SIGEducBA/PDF para cadastrar dezenas de professores de uma só vez com geração automática de logins.
- **🌐 Visão Pública (Read-only):**
  - Rota `/calendario` aberta para consulta por alunos, professores e comunidade escolar sem necessidade de login.

---

## 💻 Stack Tecnológica

* **Front-end:** React 19, Next.js 15 (App Router), TypeScript.
* **Estilização e Ícones:** Tailwind CSS, Lucide Icons, animações CSS Keyframes.
* **Datas:** Date-fns com suporte a `pt-BR`.
* **Back-end e Banco de Dados:** Firebase Firestore (NoSQL em tempo real) e Firebase Authentication.
* **Deploy:** Vercel.

---

## 🔧 Guia de Configuração e Instalação

Consulte o arquivo [`instrucoes_de_implantacao.md`](./instrucoes_de_implantacao.md) para o passo a passo completo de configuração das credenciais do Firebase, variáveis de ambiente e regras de segurança (`firestore.rules`).

---

<div align="center">
  <i>Construído com Next.js & TailwindCSS por um desenvolvedor focado na solução prática.</i>
</div>
