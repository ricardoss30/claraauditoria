## Edição automatizada do workflow CLARA Fase 2 via API do n8n

### Objetivo
Aplicar o ajuste no system prompt do nó `Clara` (workflow `j4d43UZrYceItJ5z`) através da API REST do n8n, sem precisar abrir o editor manualmente.

### Etapas

1. **Adicionar secret `N8N_API_KEY`**
   - Você gera em n8n → Settings → n8n API → Create API Key (escopo `workflow:read`, `workflow:update`).
   - Cole na caixa segura que vai aparecer.

2. **Criar edge function `n8n-patch-clara-prompt`** (one-shot, sem UI)
   - Auth: JWT obrigatório, restrita a role `admin`.
   - Faz `GET https://ricardoss30.app.n8n.cloud/api/v1/workflows/j4d43UZrYceItJ5z` para baixar o JSON atual.
   - Localiza o nó `Clara` em `nodes[]` e substitui no `parameters.options.systemMessage`:
     - `1. leia o PDF de file_url.`
     - **→** `1. Use o texto fornecido em "EDITAL (texto OCR)" como fonte única de análise — não tente acessar URLs.`
   - Faz `PUT /api/v1/workflows/j4d43UZrYceItJ5z` com o JSON modificado (mantendo `name`, `nodes`, `connections`, `settings`, `staticData`).
   - Retorna `{ ok: true, replaced: <bool>, versionId: <novo> }`.

3. **Disparar a função uma vez** via `supabase--curl_edge_functions` (usa o JWT da sessão atual do preview).

4. **Validar via MCP n8n** com `get_workflow_details` para confirmar que o trecho novo está no system prompt e que o restante do workflow ficou intacto.

5. **(Opcional)** Manter a função no projeto para futuros patches pontuais, ou removê-la após o uso. Recomendo manter — útil caso queira automatizar mais ajustes.

### Riscos / mitigações
- **Backup:** antes do PUT, a função loga o JSON original (visível em Edge Function logs) para rollback manual se necessário.
- **Idempotência:** se o trecho antigo não for encontrado, retorna `replaced: false` sem alterar nada.
- **Permissão:** somente `admin` pode chamar; outros recebem 403.

Pronto para seguir? Assim que você confirmar, vou pedir o secret `N8N_API_KEY` e criar a função.
