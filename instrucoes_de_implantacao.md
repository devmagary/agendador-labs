# Guia de Implantação Completo: AgendaLab (Laboratórios Escolares)

Este é o guia definitivo para você ou sua equipe implementarem, testarem e colocarem no ar o sistema **AgendaLab** com todas as funcionalidades de gestão de laboratórios escolares.

---

## 1. Tecnologias Utilizadas
- **Frontend:** React 19 + Next.js 15 (App Router).
- **Estilização e UI/UX:** Tailwind CSS + Lucide React (ícones vetoriais modernos) + Date-fns (manipulação e calendário de datas).
- **Backend e Banco de Dados:** Firebase (NoSQL Firestore, Authentication e Realtime Snapshots).
- **Deploy:** Vercel.

---

## 2. Estrutura de Coleções no Firestore (Schema)

O banco NoSQL do Firebase organiza os dados nas seguintes coleções:

### 1. `settings` (Configurações Globais do Sistema)
- Document ID: `general`
- `weeklyQuota` *(number)*: Cota semanal máxima de aulas por professor (padrão `4`).
- `updatedAt` *(serverTimestamp)*: Data/hora da última alteração de configuração.
- `updatedBy` *(string)*: Nome do coordenador que realizou o ajuste.

### 2. `users` (Usuários Autenticados)
- `name` *(string)*: Nome completo do usuário.
- `role` *(string)*: `"admin"` | `"professor"` | `"secretario"`.
- `mustChangePassword` *(boolean)*: Força a troca de senha no primeiro acesso.

### 3. `allowed_users` (Pré-cadastro e Whitelist de Acessos)
- Document ID: `login_do_usuario` (ex: `carlos.silva`).
- `name` *(string)*: Nome do professor ou secretário.
- `role` *(string)*: `"professor"` ou `"secretario"`.

### 4. `schedules` (Reservas de Laboratórios)
- `professorId` *(string)*: UID do usuário no Firebase Auth.
- `professorName` *(string)*: Nome do professor responsável pela aula.
- `laboratory` *(string)*: `"LabTec"` | `"Manutec"` | `"Robotica"`.
- `date` *(string)*: Data no formato ISO `yyyy-MM-dd` (ex: `2026-08-14`).
- `shift` *(string)*: `"Matutino"` | `"Vespertino"` | `"Noturno"`.
- `classHours` *(array de números)*: Aulas reservadas (ex: `[1, 2]`).
- `hasTv` *(boolean)*: Indica se a sala reservada requer televisão (`true`/`false`).
- `createdBySecretario` *(boolean, opcional)*: Indica se foi agendado pela Secretaria.
- `createdByName` *(string, opcional)*: Nome do secretário(a) que realizou o agendamento.
- `createdAt` *(serverTimestamp)*: Data/hora do agendamento.

### 5. `logs` (Histórico de Transparência e Auditoria)
- `professorId` *(string)*: UID do autor da ação.
- `professorName` *(string)*: Nome do autor.
- `action` *(string)*: `"create"` | `"cancel"`.
- `details` *(string)*: Detalhamento com dia, horário, laboratório e TV.
- `timestamp` *(serverTimestamp)*: Data/hora da ação.

---

## 3. Regras de Segurança do Firebase (`firestore.rules`)

No [Firebase Console](https://console.firebase.google.com/), acesse **Firestore Database > Regras** e cole a configuração abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funções auxiliares de autenticação e perfis
    function isLogged() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isLogged() && getUserData().role == 'admin';
    }

    function isSecretario() {
      return isLogged() && getUserData().role == 'secretario';
    }

    function isStaff() {
      return isAdmin() || isSecretario();
    }

    // 1. CONFIGURAÇÕES GERAIS DO SISTEMA (Cota Semanal de Agendamentos)
    match /settings/{docId} {
      // Leitura pública (para carregar limites no Dashboard e Calendário)
      allow read: if true;
      // Apenas o Coordenador/Admin pode alterar as configurações globais
      allow write: if isAdmin();
    }

    // 2. USUÁRIOS E PERFIS
    match /users/{userId} {
      // Qualquer usuário logado pode ler perfis (necessário para a Secretaria listar professores)
      allow read: if isLogged();
      
      // Criação de perfil no primeiro login ou pelo Admin
      allow create: if isAdmin() || (isLogged() && request.auth.uid == userId);
      
      // Atualização de perfil (ex: trocar senha)
      // Usuários comuns NÃO podem alterar seu próprio 'role' (proteção contra elevação de privilégios)
      allow update: if isAdmin() || (
        isLogged() && request.auth.uid == userId 
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])
      );
      
      // Exclusão permitida apenas ao Admin
      allow delete: if isAdmin();
    }

    // 3. WHITELIST / PRÉ-CADASTRO (allowed_users)
    match /allowed_users/{userId} {
      // Público pode checar se a matrícula/login existe no 1º login
      allow get: if true; 
      // Coordenador (Admin) e Secretaria Escolar podem listar todos os pré-cadastrados
      allow list: if isStaff();
      // Apenas o Admin pode cadastrar novas permissões
      allow create, update: if isAdmin();
      // O usuário pode remover sua permissão após se registrar, ou o Admin pode revogar
      allow delete: if isLogged() || isAdmin();
    }

    // 4. AGENDAMENTOS DOS LABORATÓRIOS (schedules)
    match /schedules/{scheduleId} {
      // Calendário público (alunos, pais e comunidade podem consultar)
      allow read: if true; 
      
      // Criar agendamento:
      // - O próprio professor (request.auth.uid == professorId)
      // - OU a Secretaria Escolar / Coordenador agendando
      allow create: if isLogged() && (
        request.auth.uid == request.resource.data.professorId || isStaff()
      );
      
      // Cancelar / Alterar agendamento:
      // - O próprio professor dono da reserva
      // - OU a Secretaria Escolar / Coordenador (gestão escolar)
      allow update, delete: if isStaff() || (
        isLogged() && request.auth.uid == resource.data.professorId
      );
    }

    // 5. HISTÓRICO DE TRANSPARÊNCIA E AUDITORIA (logs)
    match /logs/{logId} {
      // Qualquer pessoa pode ler o histórico e o ranking (Transparência Pública)
      allow read: if true;
      
      // Inserção de log permitida para qualquer usuário autenticado registrando sua ação
      allow create: if isLogged() && request.auth.uid == request.resource.data.professorId;
      
      // NUNCA permitir edição ou exclusão de logs (imutabilidade e auditoria segura)
      allow update, delete: if false;
    }
  }
}
```

---

## 4. Variáveis de Ambiente (`.env.local`)

Na raiz do projeto, crie ou configure o arquivo `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

---

## 5. Fluxo de Uso e Perfis

1. **Coordenador / Admin**:
   - Ajusta a cota semanal global de agendamentos em tempo real no painel administrativo.
   - Cadastra usuários individualmente ou em lote colando o relatório Sigeduc.
   - Pode cancelar reservas de qualquer usuário.
2. **Secretaria Escolar**:
   - Agenda para qualquer professor, com débito na cota do docente.
   - Possui chave de exceção para autorizações especiais justificadas.
3. **Professor**:
   - Acessa via login/matrícula (senha padrão `123456` no primeiro acesso e troca obrigatória).
   - Visualiza sua cota semanal em tempo real e agenda aulas escolhendo com/sem TV.
4. **Painel Público (`/calendario`) & Central de Transparência (`/logs`)**:
   - Consulta pública de horários ocupados.
   - Visualização do Ranking Geral de docentes e linha do tempo de agendamentos e cancelamentos.
