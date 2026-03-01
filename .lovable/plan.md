

## Plano: Evitar duplicação de alertas ao reprocessar

### Problema
A edge function `process-document` faz `INSERT` de novos alertas sem remover os anteriores do mesmo documento. Cada reprocessamento duplica os alertas.

### Solucao
Adicionar um `DELETE` dos alertas existentes do documento **antes** de inserir os novos, dentro da edge function `process-document/index.ts`.

Na linha onde o documento é atualizado com `status: "processed"` (antes do bloco de inserção de alertas), adicionar:

```typescript
// Delete existing alerts for this document before inserting new ones
await supabase.from("risk_alerts").delete().eq("document_id", document_id);
```

### Arquivo alterado
- `supabase/functions/process-document/index.ts` — adicionar delete antes do insert de alertas

### Impacto
- Alertas anteriores (incluindo os que foram revisados/confirmados) serão removidos ao reprocessar
- Isso é o comportamento esperado pois o reprocessamento gera uma análise completamente nova

