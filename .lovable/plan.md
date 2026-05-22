## Causa raiz

1. `StepDocumentData.extractMetadataViaN8n` faz `fetch` direto do browser para `https://ricardoss30.app.n8n.cloud/webhook/...`.
2. O n8n Cloud não envia `Access-Control-Allow-Origin` para o domínio do app, então o browser bloqueia a resposta (e o preflight, quando há). Resultado: `Failed to fetch` e o workflow nunca executa.
3. A tentativa anterior usando edge function chamava `req.formData()`, materializando o PDF inteiro em memória do worker Deno → `Memory limit exceeded` (WORKER_RESOURCE_LIMIT).

## Correção

Reintroduzir a edge function `extract-metadata-n8n` como **proxy em streaming**: ela valida o JWT, repassa `req.body` cru ao webhook do n8n com o mesmo `Content-Type` (multipart boundary preservado) e devolve a resposta com CORS liberado. O browser deixa de falar com `n8n.cloud` diretamente, eliminando o problema de CORS, e o worker não precisa parsear o multipart, eliminando o problema de memória.

### 1. `supabase/functions/extract-metadata-n8n/index.ts` (recriar)

- `Deno.serve` com `OPTIONS` retornando os `corsHeaders` usuais do projeto.
- Validar `Authorization: Bearer ...` via `adminClient.auth.getUser(token)` (padrão dos demais edge functions).
- Fazer `fetch(N8N_WEBHOOK_URL, { method: "POST", body: req.body, headers: { "Content-Type": req.headers.get("content-type") ?? "application/octet-stream" }, duplex: "half" })`. Sem `req.formData()`, sem `arrayBuffer()`.
- Encaminhar a resposta do n8n como texto e tentar `JSON.parse` (com fallback tolerante já existente) devolvendo os campos `title`, `agency`, `modality`, `estimated_value`, `published_at`, `description`.
- Timeout de 120 s via `AbortController`.

### 2. `supabase/functions/config.toml`

Garantir entrada da função com `verify_jwt = true` (manter padrão do projeto).

### 3. `src/components/wizard/StepDocumentData.tsx`

Em `extractMetadataViaN8n`:

- Remover o `fetch` direto para o domínio do n8n.
- Voltar a chamar a edge function via `fetch(`${SUPABASE_URL}/functions/v1/extract-metadata-n8n`, ...)` enviando o mesmo `FormData` (`data`, `file_name`, `mime_type`) com `Authorization: Bearer <access_token>` e `apikey: <SUPABASE_PUBLISHABLE_KEY>`. Não definir `Content-Type` manualmente — o browser inclui o boundary correto.
- Manter o tratamento de toast/erros existente.

### 4. Ação manual no n8n (workflow `C.L.A.R.A - Webhook Análise do Título`)

Nenhuma mudança nova exigida: o webhook continua recebendo `multipart/form-data` no campo binário `data`, exatamente como já está configurado para o nó EXTRAÇÃO_PDF (Mistral OCR).

## Por que não voltar a usar URL assinada

Já testado e descartado: o Mistral OCR não consegue baixar signed URLs do Supabase de forma confiável e o frontend removia o `_tmp/` antes do nó assíncrono buscar o arquivo. Streaming binário pelo edge function é mais simples e elimina ambos os problemas.

## Arquivos afetados

- `supabase/functions/extract-metadata-n8n/index.ts` (recriar em modo streaming)
- `supabase/config.toml` (registrar função se necessário)
- `src/components/wizard/StepDocumentData.tsx` (chamar edge function em vez do n8n direto)
