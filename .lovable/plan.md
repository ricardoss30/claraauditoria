

## Fix: Edge Function `process-document` — método `getClaims` inválido

### Problema
Na linha 371 de `supabase/functions/process-document/index.ts`, o código chama `supabaseAuth.auth.getClaims(token)`, que **não existe** no SDK `@supabase/supabase-js`. Isso causa um crash na função, resultando no erro genérico "Edge Function returned a non-2xx status code".

### Causa
Provavelmente introduzido em uma refatoração anterior. O método correto para validar o JWT e obter o usuário é `auth.getUser(token)`.

### Alteração

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/process-document/index.ts` | Substituir `auth.getClaims(token)` por `auth.getUser(token)` e ajustar a extração do `callerId` de `claimsData.claims.sub` para `userData.user.id`. Usar o `supabase` (service role) para validação do token conforme padrão do projeto. |

### Código atual (linhas 367-377)
```typescript
const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
  global: { headers: { Authorization: authHeader } },
});
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const callerId = claimsData.claims.sub as string;
```

### Código corrigido
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) { ... }
const callerId = user.id;
```

Depois: redeploy da função `process-document`.

