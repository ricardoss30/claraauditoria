## Diagnóstico

O erro acontece no Step 1 do wizard, no fallback de **PDF escaneado** (`StepDocumentData.extractMetadataViaN8n`):

1. Frontend faz upload do PDF para `documents/_tmp/{userId}/{uuid}-{nome}.pdf`.
2. Gera uma **signed URL** (TTL 1h) e envia para a edge function `extract-metadata-n8n`.
3. A edge function repassa a `file_url` ao webhook do n8n (`C.L.A.R.A - Webhook Análise do Título`).
4. O nó **EXTRAÇÃO_PDF** (Mistral OCR) tenta baixar o arquivo da URL e falha com `File could not be fetched from url`.
5. No `finally` (linha 110 de `StepDocumentData.tsx`), o frontend **remove o arquivo de `_tmp/`** logo após `invoke` retornar.

### Causa raiz

Race condition / fragilidade da signed URL:
- O webhook do n8n geralmente responde **assim que recebe** o payload (modo produção), enquanto o nó EXTRAÇÃO_PDF roda de forma assíncrona. Quando o Mistral tenta buscar a URL, o frontend já apagou o arquivo no `finally`.
- Mesmo se o arquivo persistisse, signed URLs do Supabase frequentemente são bloqueadas pelo fetcher do Mistral (caracteres no path, token longo, headers de redirect).
- Token mostrado no erro: `iat=1779471991, exp=1779475591` — válido por 1h, então não é expiração; é indisponibilidade do objeto ou rejeição do fetch externo.

## Plano de correção

Eliminar a dependência de URL pública/assinada e enviar o arquivo **diretamente como bytes** ao n8n.

### 1. Edge function `extract-metadata-n8n`

Mudar o contrato de entrada para receber o arquivo (base64) ou stream:

- Aceitar `multipart/form-data` do frontend com o `File` original (mais simples e sem inflar payload em 33%).
- Repassar ao webhook do n8n também como `multipart/form-data`, no campo `data` (padrão do nó Webhook do n8n para arquivos binários).
- Manter validação de JWT via `adminClient.auth.getUser()` (padrão dos demais edge functions).
- Limitar tamanho (ex.: 20 MB) — PDFs maiores já caem no fluxo principal de extração local.

### 2. `StepDocumentData.tsx`

- Remover o upload para `_tmp/`, a geração de signed URL e o `remove()` no `finally`.
- `extractMetadataViaN8n(file)` passa a montar um `FormData` com o `File` e chamar a edge function diretamente.
- Mantém o fluxo: extração local primeiro; se texto < 100 chars (PDF escaneado), envia binário ao n8n.

### 3. Workflow n8n `C.L.A.R.A - Webhook Análise do Título`

Ajuste do lado do n8n (a ser feito pelo usuário):

- Nó **Webhook**: configurar para receber binário (option `Binary Data` ou ler `$binary.data`).
- Nó **EXTRAÇÃO_PDF (Mistral OCR)**: trocar a fonte de `URL` para `Binary` apontando para o campo `data` recebido.

## Detalhes técnicos

- O bucket `documents` continua privado e sem objetos efêmeros em `_tmp/`.
- Não há mais signed URLs envolvidas no fluxo de extração de metadados.
- O fluxo principal de upload (Step 4 / `useDocumentUpload`) **não é afetado** — ele já usa `raw_text` extraído no cliente e envia ao `n8n-process-document`, conforme correção aplicada anteriormente.

## Arquivos a alterar

- `supabase/functions/extract-metadata-n8n/index.ts` — aceitar multipart e repassar binário.
- `src/components/wizard/StepDocumentData.tsx` — remover upload temporário, enviar `FormData`.

## Ação manual do usuário (n8n)

Após o deploy, ajustar o workflow `C.L.A.R.A - Webhook Análise do Título` para ler o binário do webhook ao invés de buscar `file_url`. Posso confirmar o ajuste via `get_workflow_details` depois.
