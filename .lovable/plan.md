

## Fix: CPU Time Exceeded no process-document

### Problema
A Edge Function `process-document` retorna status 546 (CPU Time exceeded) ao processar documentos. Os logs mostram que o tempo é consumido por:
1. Imports antigos (`esm.sh`, `deno.land/std`) causando cold starts lentos
2. Uma chamada extra de IA para gerar embeddings de busca vetorial (linhas 310-337)
3. Busca de 500 chunks da knowledge base para ranking por palavras-chave (linha 361)

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/process-document/index.ts` | (1) Substituir `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"` por `Deno.serve()`. (2) Substituir `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"` por `import { createClient } from "npm:@supabase/supabase-js@2"`. (3) Na busca de knowledge base, limitar query de chunks para 100 em vez de 500 (linha 361). (4) Remover a chamada de IA para gerar embeddings artificiais (linhas 309-341) -- usar apenas keyword ranking ou vector search via `match_knowledge` com embedding real se disponível no futuro. (5) Redeploy da função. |

### Detalhes

- A chamada extra ao Gemini para "gerar embedding fake" (array de 384 floats via chat completion) consome CPU significativo e produz embeddings de baixa qualidade. Removê-la elimina ~5-10s de processamento.
- Reduzir de 500 para 100 chunks no fallback de keyword ranking reduz o tempo de scoring sem perda significativa de qualidade (os top 5 scores já mostram boa relevância).
- Os imports `npm:` são resolvidos localmente pelo Deno runtime, evitando downloads e parsing de esm.sh durante cold start.

