

## Correção dos avisos de segurança RLS e funções

### Problemas detectados pelo linter

**1. RLS Policy Always True (2 avisos)**
- **`conhecimento_chunks`** — política "Service role can manage chunks" (ALL) com `USING (true)` e `WITH CHECK (true)`, aplicada a **todos os roles** (`public`). Qualquer usuário autenticado pode inserir, atualizar e deletar chunks. Na prática, apenas edge functions (via service_role, que já ignora RLS) precisam dessa permissão.
- **`text_analysis_cache`** — política "Service role can insert cache" (INSERT) com `WITH CHECK (true)`, aplicada a todos os roles. Mesmo cenário: apenas edge functions inserem dados de cache.

**2. Function Search Path Mutable (2 avisos)**
- Funções `match_knowledge` e `match_conhecimento_chunks` não têm `search_path` definido, o que pode permitir ataques de path hijacking.

**3. Extension in Public (1 aviso)**
- A extensão `vector` está instalada no schema `public`. Mover extensões para outro schema é complexo e pode quebrar funcionalidades existentes — recomendo ignorar este aviso.

**4. Leaked Password Protection Disabled (1 aviso)**
- Configuração do painel Supabase, não corrigível via migração SQL.

---

### Correções via migração SQL

**Migração única** com as seguintes alterações:

1. **Dropar** a política "Service role can manage chunks" na tabela `conhecimento_chunks` (service_role já ignora RLS; remover elimina acesso indevido a outros roles)

2. **Dropar** a política "Service role can insert cache" na tabela `text_analysis_cache` (mesma lógica)

3. **Alterar** as funções `match_knowledge` e `match_conhecimento_chunks` para definir `SET search_path = public`

```sql
-- 1. Remove overly permissive policies (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can manage chunks" ON public.conhecimento_chunks;
DROP POLICY IF EXISTS "Service role can insert cache" ON public.text_analysis_cache;

-- 2. Fix function search_path
ALTER FUNCTION public.match_knowledge(vector, integer) SET search_path = public;
ALTER FUNCTION public.match_conhecimento_chunks(vector, integer, jsonb) SET search_path = public;
```

### O que NÃO será alterado
- **Extension in Public**: mover `pgvector` quebraria referências existentes. Risco maior que o benefício.
- **Leaked Password Protection**: configuração do painel Auth do Supabase, fora do escopo de migrações.

### Impacto
- Nenhuma funcionalidade será afetada, pois as edge functions usam `service_role` key que já ignora RLS.
- Usuários regulares mantêm acesso de leitura via as políticas SELECT existentes.

