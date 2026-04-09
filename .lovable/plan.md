

## Implementar lógica diferenciada por `rule_type` no `process-document`

### Situação atual

Todas as regras ativas são passadas como contexto textual para o LLM, que faz toda a análise. O campo `rule_type` é apenas informativo.

### Abordagem

Adicionar uma etapa **pré-IA** que avalia regras dos tipos `keyword`, `numeric` e `pattern` diretamente no código (sem LLM). Regras do tipo `ai` continuam sendo avaliadas pelo Gemini. Os alertas de ambas as fontes são combinados no resultado final.

### Lógica por tipo

| rule_type | Lógica |
|-----------|--------|
| `keyword` | Busca textual case-insensitive por palavras-chave definidas em `parameters.keywords` (array de strings). Gera alerta se encontrar match, incluindo o trecho como evidência. |
| `numeric` | Extrai valores numéricos do documento via regex (`R$ X.XXX,XX`). Compara com limiares em `parameters` (`min_value`, `max_value`). Gera alerta se valor fora da faixa. |
| `pattern` | Aplica regex definido em `parameters.pattern` contra o conteúdo. Gera alerta se houver match, incluindo o trecho capturado como evidência. |
| `ai` | Comportamento atual: regra é passada como contexto ao LLM para análise semântica. |

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/process-document/index.ts` | Adicionar funções `evaluateKeywordRule`, `evaluateNumericRule`, `evaluatePatternRule`. Antes da chamada ao LLM (linha ~504), iterar sobre as regras ativas e executar as regras não-AI localmente, gerando alertas programáticos. Filtrar apenas regras `ai` para o contexto do LLM. Combinar alertas de ambas as fontes antes de inserir no banco. |

### Fluxo revisado

```text
1. Fetch regras ativas
2. Separar: keyword/numeric/pattern vs ai
3. Avaliar regras locais contra o conteúdo → alertas locais
4. Enviar conteúdo + regras AI ao LLM → alertas AI
5. Combinar alertas, calcular risk_score (max entre AI e local)
6. Inserir tudo no banco
```

### Detalhes técnicos

- `parameters.keywords`: `["marca específica", "exclusividade"]` -- busca case-insensitive com `indexOf` ou regex
- `parameters.pattern`: `"CNPJ.*\\d{2}\\.\\d{3}\\.\\d{3}"` -- compilado como `new RegExp(pattern, "gi")`
- `parameters.min_value` / `parameters.max_value`: comparados com valores monetários extraídos via `/R\$\s*[\d.,]+/g`
- Cada alerta local recebe `criteria` automático: "Regra automática: [nome da regra]" e `review_notes` baseado na descrição da regra
- Se não houver regras AI ativas, a chamada ao LLM ainda acontece para extração de dados estruturados, mas sem instruções de regras

