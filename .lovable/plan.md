

## Analise do Erro "The object exceeded the maximum allowed size"

### Diagnostico

Investigando o banco de dados:
- O bucket `base_conhecimento` tem limite de 50MB — o placeholder de 1 byte nao deveria exceder isso
- As pastas existentes ("Manual de Compras", "Guia de Auditoria") foram criadas COM espacos e acentos (antes da sanitizacao)
- Existem **duas politicas INSERT duplicadas** para o bucket `base_conhecimento`:
  1. "Authenticated users can upload"
  2. "Authenticated users can upload to base_conhecimento"
- As RLS policies parecem corretas

O erro provavelmente vem de um conflito com o `upsert: true` e o Blob. A combinacao de `new Blob([" "])` com `contentType: "text/plain"` e `upsert: true` pode estar causando conflito em certas versoes do Supabase Storage SDK.

### Correcoes

1. **`src/services/knowledgeBaseService.ts`** — Na funcao `createFolder`:
   - Trocar `new Blob([" "])` por `new Blob([""], { type: "text/plain" })` (string vazia, tipo embutido no blob)
   - Remover o `contentType` separado do options
   - Adicionar tratamento de erro mais detalhado com log para diagnostico

2. **Remover politicas INSERT duplicadas** via migracao SQL:
   - Remover a politica "Authenticated users can upload" (duplicada) que pode estar causando conflito

3. **`src/services/knowledgeBaseService.ts`** — Adicionar fallback: se o upload com `upsert: true` falhar, tentar sem upsert

