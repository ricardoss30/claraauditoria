

## Plano: Base de Conhecimento Vetorial (RAG) + Busca por Nome

### 1. Criar Edge Function `embed-knowledge`

Nova edge function `supabase/functions/embed-knowledge/index.ts` que:
- Recebe `{ file_path: string, action: "upsert" | "delete" }`
- Para **upsert**: baixa o arquivo do bucket `base_conhecimento`, extrai texto (PDF via `unpdf`, TXT direto, DOCX apenas referência), divide em chunks de ~500 caracteres com overlap de 50, gera embeddings via Lovable AI gateway (`text-embedding-3-small` ou modelo disponível), e insere na tabela `conhecimento_chunks`
- Para **delete**: remove todos os chunks onde `file_path = path`
- Antes de inserir novos chunks, deleta chunks existentes do mesmo `file_path` (idempotente)

### 2. Registrar edge function no `config.toml`

Adicionar `[functions.embed-knowledge]` com `verify_jwt = false`.

### 3. Atualizar `Sources.tsx` — Chamar embedding após upload

Após upload bem-sucedido, invocar `supabase.functions.invoke("embed-knowledge", { body: { file_path, action: "upsert" } })` para cada arquivo. Na exclusão, chamar com `action: "delete"`.

### 4. Atualizar `process-document` — Usar RAG vetorial

Substituir `fetchKnowledgeBaseContext` (que lê arquivos brutos) por uma busca vetorial:
- Gerar embedding do conteúdo do documento (resumo dos primeiros 2000 chars)
- Chamar `match_knowledge` (função SQL já existente) para buscar os chunks mais relevantes
- Montar o contexto a partir dos chunks retornados (até 15.000 chars)

### 5. Adicionar busca/filtro na UI `Sources.tsx`

- Input de busca acima da tabela com ícone `Search`
- Filtrar `folders` e `realFiles` pelo `name` contendo o texto digitado (case-insensitive)
- Debounce simples com estado local

### Arquivos
- `supabase/functions/embed-knowledge/index.ts` (novo)
- `supabase/config.toml` (adicionar função)
- `src/pages/Sources.tsx` (chamar embedding + filtro de busca)
- `src/services/knowledgeBaseService.ts` (adicionar `embedFile` e `deleteChunks` helpers)
- `supabase/functions/process-document/index.ts` (substituir leitura bruta por RAG)

