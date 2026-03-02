

## Plano: Editar e Excluir Usuários na Gestão de Usuários

### 1. Edge Function `manage-user`

Criar `supabase/functions/manage-user/index.ts` com duas ações:

- **`update`**: Recebe `user_id`, `email` (opcional), `full_name` (opcional). Usa `supabaseAdmin.auth.admin.updateUserById()` para atualizar email e `profiles` para nome.
- **`delete`**: Recebe `user_id`. Usa `supabaseAdmin.auth.admin.deleteUser()` para remover o usuário do Auth (cascade deleta profile e roles).

Validações server-side:
- Somente admin ou gestor pode chamar
- Gestor não pode editar/excluir admins
- Ninguém pode excluir a si mesmo

### 2. UI em `UsersManagement.tsx`

- Adicionar no dropdown de ações (coluna "Ações"):
  - **Editar usuário**: abre Dialog com campos Nome e Email preenchidos, salva via edge function
  - **Excluir usuário**: abre AlertDialog de confirmação, exclui via edge function
- Visibilidade: mesma lógica de `canEditUser` e `canManageRoles` já existente
- Gestor não vê opção de editar/excluir admins (já filtrados)
- Ninguém pode excluir a si mesmo

### 3. Config

- Registrar `manage-user` no `supabase/config.toml`

### Arquivos

- **Criar**: `supabase/functions/manage-user/index.ts`
- **Editar**: `src/pages/settings/UsersManagement.tsx`, `supabase/config.toml`

