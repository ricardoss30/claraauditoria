

## Auto-preencher campo "Recomendações" nos alertas via IA

### Alteração: `supabase/functions/process-document/index.ts`

1. **Schema da tool call** (linha ~447): Adicionar propriedade `review_notes` (que mapeia para "Recomendações" na UI):
   ```
   review_notes: { type: "string", description: "Recomendacoes de acoes corretivas ou preventivas para mitigar o risco identificado" }
   ```

2. **Prompt do sistema** (linha ~402): Adicionar instrução para preencher recomendações:
   ```
   Para cada alerta, preencha tambem o campo "review_notes" com recomendacoes de acoes corretivas ou preventivas.
   ```

3. **Required fields** (linha ~449): Adicionar `review_notes` ao array de campos obrigatórios.

4. **Inserção de alertas** (linha ~538): Incluir `review_notes: a.review_notes || null` no objeto de inserção.

5. Redeploy da edge function `process-document`.

Após reprocessar um documento, o campo "Recomendações" será preenchido automaticamente pela IA.

