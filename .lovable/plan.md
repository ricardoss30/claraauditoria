

## Diagnóstico

Identifiquei dois problemas nos logs:

1. **Embeddings falhando** (`embed-knowledge`): O modelo AI retorna os embeddings envolvidos em ````json ... ````, e o `JSON.parse` falha com `Unexpected token`. Os 78 chunks do PDF foram extraídos mas nenhum embedding foi gerado. A tabela `conhecimento_chunks` está **vazia** (provavelmente o insert falhou ou a função não completou).

2. **RAG sem dados** (`process-document`): Como não há chunks na tabela, a busca vetorial retorna vazio e o contexto da Base de Conhecimento não é usado.

## Plano de Correção

### 1. Corrigir parsing de embeddings em `embed-knowledge/index.ts`

Na função `generateEmbedding`, antes do `JSON.parse`, limpar markdown code fences do response:
```typescript
let content = data.choices?.[0]?.message?.content?.trim();
// Strip markdown code fences
content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const parsed = JSON.parse(content);
```

### 2. Aplicar mesma correção em `process-document/index.ts`

A função `fetchKnowledgeBaseContext` tem o mesmo problema na geração de embedding para query. Aplicar a mesma limpeza de markdown.

### 3. Corrigir o texto "Raiz" no breadcrumb

O edit anterior substituiu "Raiz" por `{"\n"}` que renderiza como espaço vazio. Trocar para um ícone Home ou o texto correto conforme a intenção do usuário.

### Arquivos
- `supabase/functions/embed-knowledge/index.ts` (corrigir parsing)
- `supabase/functions/process-document/index.ts` (corrigir parsing)
- Deploy das duas edge functions

