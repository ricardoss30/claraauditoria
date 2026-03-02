

## Plano: Botão "Novo Usuário" com CRUD no UsersManagement

### O que será feito
Adicionar um botão "Novo Usuário" no header do card de Gestão de Usuários que abre um Dialog para criar usuários via `supabase.auth.admin` (edge function). Visível apenas para Admin e Gestor, respeitando as regras RBAC.

### 1. Edge Function `create-user`
Criar `supabase/functions/create-user/index.ts` que:
- Recebe `email`, `password`, `full_name`, `role` no body
- Verifica que o chamador é admin ou gestor (via JWT)
- Se gestor, impede criação com role "admin"
- Usa `supabase.auth.admin.createUser()` com o service role key para criar o usuário
- Insere o role na tabela `user_roles`
- Retorna sucesso ou erro

### 2. Dialog "Novo Usuário" no `UsersManagement.tsx`
- Adicionar botão "Novo Usuário" ao lado do título do card (visível para admin e gestor)
- Dialog com campos: Nome completo, Email, Senha, Role (select)
  - Admin vê opções: admin, gestor, auditor
  - Gestor vê apenas: gestor, auditor
- Submit chama a edge function `create-user`
- On success: fecha dialog, invalida query "users", toast de sucesso

### 3. Arquivos
- **Criar**: `supabase/functions/create-user/index.ts`
- **Editar**: `src/pages/settings/UsersManagement.tsx` — adicionar botão, dialog e lógica de criação

