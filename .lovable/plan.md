## Objetivo

Mudar a arquitetura do n8n de "request/response síncrono" para "fire-and-forget + callback assíncrono", eliminando o erro 524 (Cloudflare timeout) em PDFs grandes.

## Fluxo final

```
Frontend → n8n-process-document (POST)
              ↓
              POST n8n webhook (com document_id + file_url)
              ↓
              n8n responde 200 imediato (Respond to Webhook1) ✓
              ↓
              [n8n processa em background: Mistral OCR + Gemini]
              ↓
              n8n chama POST n8n-analysis-callback
                        (document_id, risk_score, summary, alerts, extracted_data)
              ↓
              Edge function grava resultado em procurement_documents + risk_alerts
              ↓
Frontend (realtime ou polling) vê status mudar de "processing" → "processed"
```

## Mudanças

### 1. Nova edge function: `n8n-analysis-callback`
- `verify_jwt = false` (n8n não tem JWT do usuário)
- Autenticação por shared secret: header `x-callback-secret` validado contra `N8N_CALLBACK_SECRET`
- Recebe payload: `{ document_id, risk_score, summary, extracted_data, alerts }`
- Tolera os mesmos wrappers que o `n8n-process-document` atual (output array, myField, fences ```json)
- Atualiza `procurement_documents` (status, risk_score, extracted_data, raw_content, metadata)
- Substitui `risk_alerts` do documento
- Insere `audit_logs` (action=`n8n_callback`)

### 2. Atualizar `n8n-process-document`
- Remover toda a lógica de parsing de resposta (não vem mais nada útil)
- Após `fetch` do webhook: se `200` → retornar `{ success: true, pending: true, message: "Em processamento..." }`
- Manter tratamento de 5xx/timeout como hoje
- Continuar deixando `status = "processing"` no banco

### 3. Frontend (`useDocumentUpload`)
- Após invoke, se `pending: true`, mostrar toast "Documento em processamento, atualize em alguns minutos" em vez de exibir alertas/score
- Invalidar queries normalmente
- Não bloquear a UI esperando resultado

### 4. Realtime opcional (não bloqueante)
- Habilitar realtime em `procurement_documents` para o frontend atualizar automaticamente quando `status` mudar. Pode ficar para um follow-up.

### 5. Secret novo
- Adicionar `N8N_CALLBACK_SECRET` (gerar string aleatória forte). Usado:
  - Pela edge function `n8n-analysis-callback` para validar header
  - Pelo nó HTTP Request no n8n para enviar o mesmo header

## Ações do usuário no n8n (depois que eu publicar)

1. Remover o último nó `Respond to Webhook` (posição 1280,192)
2. Adicionar nó `HTTP Request` no final do fluxo:
   - Method: `POST`
   - URL: `https://ktqrkijazzpafmfbkohe.supabase.co/functions/v1/n8n-analysis-callback`
   - Header: `x-callback-secret: <valor do N8N_CALLBACK_SECRET>`
   - Header: `Content-Type: application/json`
   - Body (JSON): repassar `{{$json.document_id}}` + saída do `Information Extractor`
3. Propagar `document_id` do webhook inicial até o final do fluxo (usar `Set` ou referenciar `$('Webhook').item.json.document_id`)
4. (Boa prática) Mover a chave Mistral hardcoded para Credentials do n8n

## Detalhes técnicos

- `n8n-analysis-callback`: reaproveita `severityToInt` e `clampScore` (copiar do `n8n-process-document` ou extrair para arquivo compartilhado — vou só duplicar para manter simples)
- Adicionar entrada em `supabase/config.toml`: `[functions.n8n-analysis-callback] verify_jwt = false`
- Validação Zod do payload do callback para retornar 400 com erro claro caso n8n mande estrutura errada
