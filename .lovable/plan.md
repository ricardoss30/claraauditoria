

## Plano: Adicionar campo de senha no dialog de edição de usuário

### 1. Edge Function `manage-user/index.ts`
Na action `update`, adicionar suporte ao campo `password`. Se fornecido, usar `supabaseAdmin.auth.admin.updateUserById(user_id, { password })` junto com email.

### 2. UI `UsersManagement.tsx`
- Adicionar estado `editPassword` (string vazia por padrão)
- No dialog de edição, adicionar campo "Nova senha" (type="password", placeholder "Deixe em branco para manter a atual")
- Enviar `password` no body apenas se preenchido
- Limpar o campo ao abrir/fechar o dialog

### Arquivos
- **Editar**: `supabase/functions/manage-user/index.ts`
- **Editar**: `src/pages/settings/UsersManagement.tsx`

