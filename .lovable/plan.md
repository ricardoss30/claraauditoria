## Objetivo

Garantir que o fluxo de envio para o N8N use as duas URLs corretas:

1. **Etapa 1 (extração do cabeçalho)** — já aponta corretamente para:
   `https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoriatitulo`
   → Nenhuma mudança necessária.

2. **Etapa 3 → "Processar" (análise completa)** — hoje aponta para uma URL antiga (`.../ebc237a3-.../claraauditoria`) e precisa ser trocada para:
   `https://ricardoss30.app.n8n.cloud/webhook/clara-prod-1781177554849/claraauditoria`

O callback do N8N (`n8n-analysis-callback`) e o fluxo de geração de relatório já estão prontos e não precisam mudar.

## Mudança

### `supabase/functions/n8n-process-document/index.ts`
- Trocar a constante `N8N_WEBHOOK_URL`:
  - **De:** `https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoria`
  - **Para:** `https://ricardoss30.app.n8n.cloud/webhook/clara-prod-1781177554849/claraauditoria`
- Método permanece `POST`, payload e headers inalterados.

## Fora do escopo

- Nenhuma alteração em banco, RLS, frontend, ou outras edge functions.
- O webhook de extração de metadados (etapa 1) já está correto.
- Fluxo de callback / geração de relatório permanece como está.

## Validação

1. Criar um novo documento via wizard.
2. Etapa 1: confirmar que o cabeçalho continua sendo extraído (URL antiga, sem mudança).
3. Etapa 3 → "Processar": verificar nos logs da função `n8n-process-document` que o POST sai para a nova URL `clara-prod-1781177554849/claraauditoria` com status 200.
4. Confirmar que o callback chega e o relatório é gerado normalmente.
