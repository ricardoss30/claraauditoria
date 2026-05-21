# Ajuste: Signed URL "permanente" para documentos

## Contexto
Hoje em `supabase/functions/n8n-process-document/index.ts` geramos uma URL assinada válida por **1 hora** (`createSignedUrl(sourcePath, 60 * 60)`). O n8n precisa baixar o arquivo, e queremos que a URL nunca expire na prática.

## Observação importante
O Supabase Storage **não suporta** URLs assinadas com expiração infinita — todo signed URL exige um TTL em segundos. Existem duas formas de obter o efeito de "nunca expirar":

1. **Signed URL com TTL muito longo** (ex.: ~100 anos). Simples, mantém o bucket privado, não exige mudanças no n8n.
2. **Tornar o bucket `documents` público** e usar `getPublicUrl`. URL realmente permanente, porém qualquer pessoa com o caminho pode baixar o arquivo.

Recomendo a opção **1** por segurança (bucket continua privado, RLS preservado).

## Mudança
Em `supabase/functions/n8n-process-document/index.ts`, substituir:

```ts
const EXPIRES_IN = 60 * 60; // 1 hora
const { data: signed } = await supabase.storage
  .from("documents")
  .createSignedUrl(sourcePath, EXPIRES_IN);
```

por:

```ts
// ~100 anos — efetivamente "nunca expira"
const EXPIRES_IN = 60 * 60 * 24 * 365 * 100;
const { data: signed } = await supabase.storage
  .from("documents")
  .createSignedUrl(sourcePath, EXPIRES_IN);
```

## Escopo
- 1 arquivo alterado: `supabase/functions/n8n-process-document/index.ts` (apenas a constante de expiração).
- Sem mudanças no frontend, no banco ou no fluxo do n8n.
- Aplica-se a todos os documentos (novos uploads, reprocessamento e wizard), pois todos passam por essa função.

Se preferir a opção 2 (bucket público), me avise — exige migração SQL para marcar o bucket como público e ajustar a função para `getPublicUrl`.
