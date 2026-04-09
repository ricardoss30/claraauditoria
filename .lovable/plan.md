

## Seleção de Regras de Análise na Etapa 2 do Wizard

### Contexto

Atualmente, o `process-document` busca **todas** as regras ativas (linha 495) sem filtrar por `rule_scope`. O usuário quer poder selecionar quais Regras de Análise serão aplicadas ao documento, enquanto todas as Regras de Risco ativas continuam sendo aplicadas automaticamente.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/wizard/StepDocumentContent.tsx` | Adicionar botão "Selecionar Regras de Análise" que abre um Dialog com checkboxes listando as regras de análise ativas (query `risk_rules` onde `rule_scope = 'analysis'` e `is_active = true`). Exibir badge com contagem de regras selecionadas. Passar os IDs selecionados via nova prop `onAnalysisRulesChange`. |
| `src/pages/NewDocument.tsx` | Novo estado `analysisRuleIds: string[]`. Passar para `StepDocumentContent` e incluir no payload do `upload()` como `analysis_rule_ids`. |
| `src/hooks/useDocumentUpload.ts` | Aceitar `analysis_rule_ids?: string[]` no payload. Enviar ao `process-document` no body da invocação. Também salvar no `extracted_data` do documento. |
| `supabase/functions/process-document/index.ts` | Receber `analysis_rule_ids` do body. Na busca de regras (linha 495): buscar todas as regras de risco ativas (`rule_scope = 'risk'`) + apenas as regras de análise cujos IDs estão em `analysis_rule_ids` (se fornecido; se vazio/ausente, não incluir regras de análise). Manter toda a lógica de separação local/AI existente. |

### Fluxo

```text
Etapa 2 (Conteúdo)
  [Upload/Texto]
  [Selecionar Regras de Análise (3 selecionadas)] ← novo botão
  [Voltar] [Próximo]

        ↓ IDs selecionados passam pelo wizard

Etapa 4 (Processamento)
  process-document recebe analysis_rule_ids
  → Busca regras de risco ativas (todas)
  → Busca regras de análise apenas dos IDs selecionados
  → Avalia todas juntas (local + AI)
```

### Dialog de seleção

```text
┌─ Selecionar Regras de Análise ──────────┐
│                                          │
│  ☑ #Verificação de Prazos               │
│  ☑ #Análise de Requisitos Técnicos      │
│  ☐ #Conformidade Legal                  │
│  ☑ #Avaliação de Critérios              │
│                                          │
│  [Selecionar Todas] [Limpar]            │
│                          [Confirmar]     │
└──────────────────────────────────────────┘
```

### Detalhes técnicos

- Query no Dialog: `supabase.from("risk_rules").select("id, name, description, category, rule_type, severity").eq("rule_scope", "analysis").eq("is_active", true)`
- No `process-document`, linha 495 muda de `select("*").eq("is_active", true)` para duas queries separadas ou uma com filtro condicional
- Os `analysis_rule_ids` são persistidos em `extracted_data.analysis_rule_ids` para referência futura e reprocessamento

