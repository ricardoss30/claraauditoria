

## Plano: CRUD de Gestão de Perfis com RBAC

### Resumo das permissões

| Recurso | Admin | Gestor | Auditor |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Documentos | ✅ | ✅ | ✅ |
| Alertas | ✅ | ✅ | ✅ |
| Regras | ✅ CRUD | ✅ CRUD | 👁 Somente visualizar |
| Base de Conhecimento | ✅ | ✅ | ❌ |
| Auditoria | ✅ | ✅ | ❌ |
| Configurações > Gestão de Usuários | ✅ (vê todos) | ✅ (vê só gestores e auditores) | ❌ |
| Configurações > Gerenciamento de Prompt | ✅ | ❌ | ❌ |

### 1. Sidebar (`AppSidebar.tsx`)

- Mudar a condição do menu "Configurações" de `hasRole("admin")` para `hasAnyRole(["admin", "gestor"])`.
- Mostrar "Gerenciamento de Prompt" apenas para `hasRole("admin")`.
- Para auditor: mostrar apenas Dashboard, Documentos, Alertas e Regras. Esconder Base de Conhecimento, Auditoria e Configurações.
- Ajustar `mainItems` para ser filtrado com base no role: auditor não vê "Base de Conhecimento".
- Auditoria: mudar de `hasAnyRole(["admin", "auditor"])` para `hasAnyRole(["admin", "gestor"])`.

### 2. Settings page (`Settings.tsx`)

- Permitir acesso para `hasAnyRole(["admin", "gestor"])` em vez de apenas `hasRole("admin")`.

### 3. Rotas de Prompt — proteção (`App.tsx`)

- Envolver as rotas de prompt com verificação de role admin. Gestor que acesse diretamente `/settings/prompts/*` será redirecionado.

### 4. UsersManagement — CRUD com filtro por role (`UsersManagement.tsx`)

- **Admin**: vê todos os usuários, pode adicionar/remover qualquer role.
- **Gestor**: filtrar a lista para mostrar apenas seu próprio perfil + usuários auditores (esconder admins). Nas ações de role, não oferecer a opção "admin" — só pode atribuir/remover "gestor" e "auditor". Não pode mudar seu próprio role nem o de auditor para "admin".
- Adicionar `useAuth()` ao componente para obter o role e user_id do usuário logado.
- Adicionar edição de `full_name` (campo editável inline ou dialog) para o próprio perfil e para auditores (se gestor).

### 5. Regras — somente visualização para auditor (`Rules.tsx`)

- Já usa `isAdmin` para esconder botões de criar/editar/excluir. Mudar para `hasAnyRole(["admin", "gestor"])` para permitir que gestores também gerenciem regras.
- Auditor verá apenas a lista de regras sem ações.

### 6. Páginas restritas — proteção de rota

- `Sources.tsx` e `AuditLogs.tsx`: adicionar verificação `hasAnyRole(["admin", "gestor"])` e mostrar mensagem de acesso restrito para auditores.

### Arquivos a alterar

- `src/components/layout/AppSidebar.tsx` — menu condicional por role
- `src/pages/Settings.tsx` — permitir gestor
- `src/pages/settings/UsersManagement.tsx` — filtro de usuários e restrição de roles por perfil do logado
- `src/pages/Rules.tsx` — gestor pode gerenciar, auditor apenas visualiza
- `src/pages/Sources.tsx` — bloquear auditor
- `src/pages/AuditLogs.tsx` — bloquear auditor
- `src/App.tsx` — proteger rotas de prompt para admin only

