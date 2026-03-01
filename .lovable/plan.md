

## Plano

### 1. Busca por relevância textual (BM25-like) no fallback — `process-document/index.ts`

Substituir o fallback cronológico por uma busca por palavras-chave com scoring TF-IDF simplificado:

- Extrair termos-chave do documento (palavras com 4+ caracteres, sem stopwords, top 20 por frequência)
- Buscar chunks que contenham esses termos via query SQL com `ilike` ou buscar todos e ranquear no código
- Implementação pragmática: buscar todos os chunks (já faz isso), mas **ranquear por score** baseado em quantos termos-chave aparecem em cada chunk
- Ordenar chunks por score decrescente antes de montar o contexto

```text
fetchKnowledgeBaseContext()
  ├── Try vector search (existing)
  ├── Fallback: fetch all chunks
  │   ├── Extract keywords from document (top 20 terms by frequency)
  │   ├── Score each chunk: count keyword matches
  │   └── Sort by score descending
  └── Build context from top-scored chunks (up to 15000 chars)
```

### 2. Armazenar metadados RAG no `extracted_data` — `process-document/index.ts`

Ao salvar o documento processado, incluir info sobre o RAG no campo `extracted_data`:

```typescript
extracted_data: {
  ...extracted_data,
  rag_context_used: true,  // or false
  rag_chunks_count: 29,
  rag_method: "keyword_ranking" | "vector_search"
}
```

Isso usa o campo JSONB existente, sem necessidade de migração.

### 3. Badge "RAG ativo" na página de detalhes — `DocumentDetail.tsx`

- Ler `extracted_data.rag_context_used` do documento
- Se verdadeiro, exibir badge ao lado do status com ícone de database + texto "Base de Conhecimento utilizada" e quantidade de chunks
- Usar componente `Badge` existente com variante outline

### Arquivos
- `supabase/functions/process-document/index.ts` — refatorar `fetchKnowledgeBaseContext` com keyword ranking + retornar metadados RAG; salvar metadados no `extracted_data`
- `src/pages/DocumentDetail.tsx` — adicionar badge RAG nos detalhes do documento
- Deploy da edge function

