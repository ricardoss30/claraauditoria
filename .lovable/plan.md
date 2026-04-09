

## Adicionar seleção de Regras de Risco na Etapa 2 do Wizard

### Situação atual
- Regras de Análise: seleção manual via dialog (já implementado)
- Regras de Risco: todas ativas são aplicadas automaticamente (sem escolha do usuário)

### O que muda
O usuário poderá selecionar quais Regras de Risco aplicar, da mesma forma que já seleciona Regras de Análise. Ambas serão enviadas ao `process-document`.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/wizard/StepDocumentContent.tsx` | Adicionar novo botão "Selecionar Regras de Risco" com dialog idêntico ao de análise, mas filtrando `rule_scope = 'risk'`. Novas props: `selectedRiskRuleIds` e `onRiskRulesChange`. |
| `src/pages/NewDocument.tsx` | Novo estado `riskRuleIds: string[]`. Passar para `StepDocumentContent` e incluir no payload como `risk_rule_ids`. |
| `src/hooks/useDocumentUpload.ts` | Aceitar `risk_rule_ids?: string[]` no payload. Enviar ao `process-document` e salvar em `extracted_data`. |
| `supabase/functions/process-document/index.ts` | Receber `risk_rule_ids` do body. Se fornecido e não vazio, buscar apenas as regras de risco dos IDs selecionados (em vez de todas ativas). Se vazio/ausente, manter comportamento atual (todas ativas). |

### Layout da Etapa 2

```text
[Upload / Colar Texto]

[Selecionar Regras de Risco (5)]     ← NOVO
[Selecionar Regras de Análise (3)]   ← existente

[Voltar]                    [Próximo]
```

### Lógica no backend

```text
Se risk_rule_ids fornecido e não vazio:
  → buscar apenas regras com IDs em risk_rule_ids
Senão:
  → buscar todas regras de risco ativas (comportamento atual)

Combinar com regras de análise selecionadas → avaliar todas
```

