

## Inserir Critérios de Auditoria na Seção 5 do Relatório

### Contexto
Os critérios de auditoria informados pelo técnico ficam em `doc.extracted_data.audit_criteria`. Atualmente a seção 5 (Contextualização) não os inclui.

### Alterações

**1. `src/pages/AuditReport.tsx` — função `generateDefaultContent` (linha 82)**

Adicionar os critérios de auditoria ao final do texto da seção `contextualizacao`:

```
contextualizacao: `Descrição do Objeto Auditado:
${doc.description || "Sem descrição disponível."}

Dados Relevantes:
• Órgão/Entidade: ${doc.agency || "Não informado"}
...

${doc.extracted_data?.audit_criteria ? `Critérios de Análise de Auditoria:
${doc.extracted_data.audit_criteria}` : ""}`
```

**2. `supabase/functions/generate-report/index.ts` (linha ~105)**

Adicionar instrução para a IA também incorporar os critérios na seção 5:
```
Incorpore também os critérios na seção "5. Contextualização da Situação Auditada" (campo contextualizacao).
```

Redeploy da edge function `generate-report`.

