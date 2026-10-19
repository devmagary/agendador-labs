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

> A funcionalidade de redefinição de senha pela Coordenação/Secretaria também exige as variáveis **`FIREBASE_ADMIN_*`** (apenas servidor). Veja a seção 6.

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

---

## 6. Redefinição de Senha por Coordenação/Secretaria (sem e-mail)

O AgendaLab **não usa e-mail** para redefinir senha. O login é sempre o nome/matrícula, convertido internamente em `<login>@labschool.app` (endereço sintético). Por isso o "Redefinir senha" por e-mail do Firebase não se aplica. A redefinição é feita pelo Coordenador ou pela Secretaria em uma tela própria (`/senhas`), sem autoatendimento.

### 6.1 Quem pode redefinir

| Quem executa | Pode redefinir |
|---|---|
| Coordenador (`admin`) | professores e secretarias |
| Secretaria (`secretario`) | somente professores |
| Professor | — |

- Contas de Coordenador/Admin **não** são redefinidas pela tela; o próprio usuário usa "Trocar Senha" ou o procedimento manual da seção 6.5.
- O usuário alvo precisa ter concluído o primeiro acesso (documento em `users` **e** conta no Firebase Auth). Quem ainda está só em `allowed_users` usa a senha padrão no primeiro acesso.
- Staff com `mustChangePassword: true` (senha padrão pendente) precisa trocar a própria senha antes de redefinir a de terceiros.

### 6.2 Como usar

1. Entre como Coordenador ou Secretaria.
2. Abra **"Senhas"** no menu (no painel do coordenador também há o atalho "Redefinir senhas").
3. Busque o usuário, clique em **"Redefinir senha"** e confirme.
4. Repasse ao usuário o **login** e a **senha temporária `123456`** exibidos na tela.
5. No próximo acesso, o sistema obriga a criação de uma nova senha em `/change-password`.

O UID, o perfil, as reservas e o histórico do usuário são preservados. A ação é registrada no Histórico & Ranking (`/logs`, ação `password_reset`) e as sessões antigas são revogadas no próximo refresh de token.

### 6.3 Configuração da service account (obrigatória)

A redefinição usa o **Firebase Admin SDK** no servidor. Sem as credenciais abaixo a rota responde `503` ("Serviço de redefinição indisponível").

1. Firebase Console → **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
2. Configure as variáveis **apenas no servidor** (nunca com `NEXT_PUBLIC_`):

```env
FIREBASE_ADMIN_PROJECT_ID=seu-projeto
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. Desenvolvimento: coloque no `.env.local` (ignorado pelo Git) e reinicie `npm run dev`.
4. Produção (Vercel): **Project Settings → Environment Variables** (Production/Preview) e faça **redeploy**. Na private key, use `\n`; o código normaliza as quebras de linha.
5. `next.config.ts` já declara `serverExternalPackages: ["firebase-admin"]` para o runtime Node.
6. O `FIREBASE_ADMIN_PROJECT_ID` deve ser igual ao `NEXT_PUBLIC_FIREBASE_PROJECT_ID` do app.
7. **Compatibilidade:** o projeto usa `firebase-admin@13.x` (Node >=18). A linha 14.x exige Node >=22; em projetos Vercel configurados com Node 18/20 a função cai com HTTP 500. Se for atualizar para 14.x, ajuste o Node do projeto para 22.x.

### 6.4 Segurança

- A service account tem privilégios administrativos: mantenha a chave somente em variáveis de ambiente, nunca no repositório. O `.gitignore` já cobre `.env*`, `serviceAccount*.json` e `*.pem`.
- A rota valida o **ID token** do solicitante e o papel no Firestore; a lista exibida no cliente não é confiável.
- O log de auditoria **não** grava a senha temporária nem o login.
- A senha temporária é a mesma do primeiro acesso e a troca é obrigatória; oriente o usuário a sair de outros dispositivos, pois a sessão já emitida pode durar até cerca de 1 hora.
- Rate limiting e 2FA são melhorias futuras; o histórico cobre a rastreabilidade.

### 6.5 Procedimento manual (fallback)

Use somente quando a tela não puder ser usada: **admin bloqueado**, **conta órfã** (documento em `users` sem conta Auth) ou Admin SDK ainda não configurado.

1. Firebase Console → **Authentication → Users**; localize `<login>@labschool.app`.
2. **Exclua a conta** (não apenas desative).
3. No Firestore, remova o documento antigo `users/<uid_antigo>` (no `/admin`, "Excluir Vínculo"; para admin, direto no Console).
4. Recrie o pré-cadastro `allowed_users/<login>` com `name` e `role` corretos (no `/admin`, "Autorizar Novo Usuário").
5. O usuário entra com o mesmo login e a senha `123456`; o app recria a conta e exige a troca.

**Atenção:** esse procedimento troca o UID. Reservas antigas continuam contando na cota pelo nome, mas o professor perde o cancelamento das reservas antigas (apenas admin/secretaria conseguem cancelar). Por isso a tela `/senhas` é o caminho recomendado.

### 6.6 Diagnóstico rápido

| Sintoma | Causa provável |
|---|---|
| `503` na redefinição | Variáveis `FIREBASE_ADMIN_*` ausentes ou projeto divergente |
| `401` | Sessão expirada/revogada; entrar novamente |
| `403` | Papel sem permissão, conta `admin` como alvo ou senha padrão pendente |
| `404` | Usuário sem documento em `users` ou sem conta Auth (conta órfã) |
| `409` | Conta desativada no Firebase Auth; reativar no Console |
| "Acesso não autorizado" no login | Pré-cadastro `allowed_users` ausente após o reset manual |
