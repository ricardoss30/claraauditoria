

## Plano: Corrigir Embedding para Funcionar com Chunks Sem Vetores

### Problema Raiz
O modelo `gemini-2.5-flash-lite` não consegue gerar arrays JSON de 384 floats de forma confiável via chat completions. Além disso, 78 chamadas sequenciais ultrapassam o timeout de 60s do edge function.

### Solução
Inserir chunks **sem embeddings** (embedding=null) para garantir que o RAG funcione pelo menos via fallback textual. O `process-document` já tem fallback que lê chunks sem embeddings quando a busca vetorial falha.

### Mudanças

#### 1. `supabase/functions/embed-knowledge/index.ts`
- Tornar embedding **opcional e não-bloqueante**: inserir chunks primeiro sem embedding
- Tentar gerar embeddings em lote depois, com timeout por chunk e limite de tentativas
- Se falhar, os chunks ficam sem embedding mas disponíveis para fallback textual
- Adicionar log claro: "Successfully inserted X chunks (Y with embeddings)"

#### 2. `supabase/functions/process-document/index.ts`  
- Já tem fallback correto (busca chunks sem embedding se vector search falhar)
- Sem mudanças necessárias

### Arquivos
- `supabase/functions/embed-knowledge/index.ts` (refatorar para inserir chunks primeiro, embeddings depois)
- Deploy da edge function

