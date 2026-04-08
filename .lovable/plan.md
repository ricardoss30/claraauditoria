

## Melhorar precisão da extração de metadados

### Problemas identificados

1. **Modelo fraco**: `gemini-2.5-flash-lite` é o modelo mais leve, com menor capacidade de extração. Campos como valor estimado e data ficam vazios.
2. **Texto truncado a 5000 caracteres**: Metadados importantes (valor, datas) frequentemente aparecem depois das primeiras páginas.
3. **Prompt pouco detalhado**: O system prompt não orienta a IA sobre onde encontrar cada campo no documento.
4. **Sem `max_tokens`**: A resposta pode ser truncada silenciosamente.
5. **Sem extração de data de publicação**: O campo `published_at` não é extraído pela IA, apenas mantido vazio.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/extract-metadata/index.ts` | Upgrade do modelo para `gemini-2.5-flash`, aumento do texto para 12000 chars, adicionar `published_at` aos campos extraídos, melhorar system prompt com instruções detalhadas, adicionar `max_tokens: 2048` |
| `src/components/wizard/StepDocumentData.tsx` | Mapear `published_at` retornado pela IA para o campo de data no formulário |

### Detalhes técnicos

**Modelo**: `gemini-2.5-flash-lite` → `gemini-2.5-flash` (melhor raciocínio, mesmo custo baixo)

**Texto enviado**: 5000 → 12000 caracteres (cobre mais páginas onde valores e datas aparecem)

**Novo campo extraído**: `published_at` com descrição "Data de publicação no formato YYYY-MM-DD"

**System prompt melhorado**:
- Instruções específicas sobre onde encontrar cada campo (cabeçalho, preâmbulo, cláusulas financeiras)
- Orientação para buscar variações comuns de nomenclatura (ex: "valor global", "valor total estimado", "preço máximo")
- Instrução para extrair datas no formato ISO

