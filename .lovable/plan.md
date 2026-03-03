

## Diagnóstico do erro de criação de pastas

### Problema encontrado
O teste revelou que o Supabase Storage retorna **HTTP 400** com corpo `{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}` ao tentar fazer upload do placeholder de 1 byte para criar a pasta.

O bucket `base_conhecimento` tem `file_size_limit = null`. Quando null, o Supabase pode usar um limite global do projeto que pode estar configurado com restrição.

### Solução proposta

**1. Migração SQL — Definir `file_size_limit` explícito no bucket**
- Atualizar o bucket `base_conhecimento` para ter `file_size_limit = 52428800` (50 MB), garantindo que uploads de placeholders e arquivos não sejam bloqueados pelo limite padrão do projeto.
- Fazer o mesmo para o bucket `documents` por segurança.

**2. Fallback no código — `src/services/knowledgeBaseService.ts`**
- Caso a migração resolva, nenhuma alteração adicional de código é necessária (a correção anterior do Blob já está correta).
- Se persistir, trocar de `Blob` para `File` object com nome e tipo explícitos como fallback.

