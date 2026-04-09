

## Criar submenus "Regras de Risco" e "Regras de Análise"

Separar a página atual de Regras em duas abas/subpáginas dentro de um menu expansível, usando a mesma tabela `risk_rules` com um campo discriminador para distinguir os dois tipos.

### Abordagem

Adicionar uma coluna `rule_scope` (ou usar a coluna `category` existente) na tabela `risk_rules` para diferenciar regras de risco de regras de análise. Usar o valor `"risk"` (padrão) e `"analysis"`. As regras cujo nome começa com `#` serão migradas automaticamente para `scope = "analysis"`.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| **Migration** | Adicionar coluna `rule_scope text not null default 'risk'` na tabela `risk_rules`. UPDATE para setar `rule_scope = 'analysis'` onde `name LIKE '#%'` |
| `src/hooks/useRules.ts` | Receber parâmetro `scope` (`"risk"` ou `"analysis"`), filtrar query com `.eq("rule_scope", scope)`. No upsert, incluir `rule_scope` |
| `src/pages/RiskRules.tsx` | **Novo** — Copia a lógica de `Rules.tsx` mas usa `useRules("risk")`, título "Regras de Risco" |
| `src/pages/AnalysisRules.tsx` | **Novo** — Mesma interface, usa `useRules("analysis")`, título "Regras de Análise" |
| `src/pages/Rules.tsx` | Remove — substituído pelas duas novas páginas |
| `src/App.tsx` | Substituir rota `/rules` por `/rules/risk` e `/rules/analysis`, importar novas páginas |
| `src/components/layout/AppSidebar.tsx` | Substituir item "Regras" por um grupo colapsável com dois subitens: "Regras de Risco" (`/rules/risk`) e "Regras de Análise" (`/rules/analysis`) |
| `src/integrations/supabase/types.ts` | Adicionar `rule_scope` ao tipo da tabela `risk_rules` |

### Detalhes técnicos

- A migration adiciona a coluna e faz o UPDATE em uma só transação
- O hook `useRules(scope)` filtra no `.select()` com `.eq("rule_scope", scope)` e passa o scope no insert
- O sidebar usa `Collapsible` (mesmo padrão já usado para Configurações) com ícone `Shield`
- As duas páginas são idênticas em funcionalidade, apenas filtram por scope diferente

