

## Análise do erro ao criar pasta

### Problema identificado
A função `createFolder` em `knowledgeBaseService.ts` faz upload de um `new Blob([""])` (blob vazio, 0 bytes) como placeholder. O Supabase Storage pode rejeitar uploads de arquivos com tamanho zero. Além disso, o toast de erro não mostra a mensagem real do Supabase, dificultando o diagnóstico.

### Correções

**1. `src/services/knowledgeBaseService.ts` — função `createFolder`**
- Trocar `new Blob([""])` por `new Blob([" "])` (1 byte) para evitar rejeição de upload vazio
- Adicionar `contentType: "text/plain"` nas opções do upload

**2. `src/pages/Sources.tsx` — função `handleCreateFolder`**
- Melhorar o toast de erro para exibir a mensagem real do Supabase (`error.message`) em vez de texto genérico, facilitando diagnóstico futuro

