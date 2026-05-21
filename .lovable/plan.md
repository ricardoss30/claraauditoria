## Objetivo

Quando o PDF anexado na Etapa 1 ("Dados do documento") não tiver texto extraível (PDF escaneado), enviar o arquivo para o webhook n8n e usar a resposta para preencher os campos do formulário automaticamente.

## Webhook

`https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoriatitulo`

Formato escolhido: **Signed URL (JSON)** — upload temporário para o Storage e envio do link assinado no payload.

## Fluxo

```text
PDF anexado → pdf.js extrai texto
   │
   ├─ texto > 100 chars → extract-metadata (Gemini, igual hoje)
   │
   └─ texto ≤ 100 chars (escaneado)
        ↓
      Upload temporário → bucket `documents/_tmp/{uuid}.pdf`
        ↓
      createSignedUrl (1h)
        ↓
      Edge function `extract-metadata-n8n`
        ↓
      POST webhook n8n { file_url, file_name, mime_type }
        ↓
      Resposta JSON do n8n → preenche título, órgão, modalidade, valor, etc.
        ↓
      Remove arquivo temporário do Storage
```

## Mudanças

### 1. Nova edge function `supabase/functions/extract-metadata-n8n/index.ts`
- `verify_jwt = true` (default Lovable).
- Recebe `{ file_url, file_name, mime_type }`.
- Faz `POST` ao webhook n8n com timeout de 120s.
- Retorna o JSON do n8n diretamente para o cliente (estrutura esperada: `{ title, agency, modality, estimated_value, description, published_at }`).
- CORS habilitado.

### 2. `src/components/wizard/StepDocumentData.tsx`
Substituir o ramo "pouco texto extraível" por:
- Upload do PDF para `documents/_tmp/{uuid}-{nome}.pdf`.
- `supabase.storage.from('documents').createSignedUrl(path, 3600)`.
- `supabase.functions.invoke('extract-metadata-n8n', { body: { file_url, file_name, mime_type } })`.
- Aplicar resposta nos campos via `onChange(...)`.
- Remover arquivo temporário (`storage.remove([path])`) no `finally`.
- Toasts: "PDF escaneado detectado. Enviando para extração..." / sucesso / erro com fallback para preenchimento manual.

### 3. Sem mudanças em
- `useDocumentUpload.ts` (upload final do documento permanece igual).
- `extract-metadata` (continua para PDFs digitais).
- Banco de dados, RLS, bucket.

## Pré-requisito

O workflow n8n `claraauditoriatitulo` precisa:
- Aceitar `POST` JSON com `file_url`.
- Baixar o PDF pela signed URL, fazer OCR e responder com JSON no formato acima.

## Detalhes técnicos

- Limite do upload temporário: usa o mesmo limite do bucket (5 GB já configurado).
- Em caso de erro do webhook (timeout, 5xx, JSON inválido), exibir toast pedindo preenchimento manual — sem bloquear o usuário.
- Pasta `_tmp/` no bucket fica coberta pelas mesmas policies de `documents` (usuário autenticado).