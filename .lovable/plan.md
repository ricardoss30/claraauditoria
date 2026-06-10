
## Problema
Ao cadastrar `maia@jria.com.br`, o Supabase Auth retorna `400 Unable to validate email address: invalid format`. Causa típica: espaço em branco invisível ou maiúscula colada no campo. O frontend ainda esconde a mensagem real exibindo apenas "Edge Function returned a non-2xx status code".

## Mudanças

### 1. `supabase/functions/create-user/index.ts`
- `const cleanEmail = String(email ?? "").trim().toLowerCase();`
- `const cleanName = full_name ? String(full_name).trim() : undefined;`
- Validar com regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` → retornar 400 `"Email inválido"` se falhar.
- Validar `password.length >= 6` → retornar 400 `"Senha deve ter pelo menos 6 caracteres"`.
- Passar `cleanEmail`/`cleanName` para `admin.createUser`.
- Manter o repasse de `createError.message` já existente.

### 2. `src/pages/settings/UsersManagement.tsx`
- Em `handleCreateUser` e `handleEditUser`: inverter a ordem — checar `result?.error` antes de `error` do invoke, para que a mensagem real seja exibida no toast.
- Trim no `newEmail`/`newFullName` antes do invoke.

## Fora do escopo
- Nenhuma mudança em banco, RLS, outras edge functions ou no fluxo de auth.

## Validação
1. Tentar criar `maia@jria.com.br` novamente — deve cadastrar com sucesso.
2. Se o Supabase ainda recusar, o toast mostrará a razão específica (domínio, duplicado, etc.) em vez do erro genérico.
