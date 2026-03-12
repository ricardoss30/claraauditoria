

## Auto-preencher campo "Critérios" nos alertas via IA

### Problema
O campo "Critérios" no diálogo de detalhes do alerta fica vazio porque a IA não gera essa informação durante a análise. O campo só é preenchido manualmente.

### Solução
Adicionar o campo `criteria` no schema da tool call da IA, para que ela descreva os critérios e fontes legais utilizados para identificar cada risco. O valor será salvo no banco junto com o alerta.

### Alteração: `supabase/functions/process-document/index.ts`

1. **Schema da tool call** (linha ~445): Adicionar propriedade `criteria` no objeto de alerta:
   ```
   criteria: { type: "string", description: "Critérios normativos e fontes legais utilizados para identificar este risco (ex: artigos da Lei 14.133/2021, jurisprudência do TCU, normas técnicas)" }
   ```

2. **Prompt do sistema** (linha ~391): Adicionar instrução para a IA preencher os critérios com referências legais e normativas para cada alerta.

3. **Inserção de alertas** (linha ~528): Incluir `criteria: a.criteria || null` no objeto de inserção.

### Arquivos
- `supabase/functions/process-document/index.ts` — schema, prompt e inserção
- Redeploy da edge function `process-document`

Após a mudança, documentos reprocessados terão o campo "Critérios" preenchido automaticamente pela IA com as fontes e normas aplicadas.

