

## Alterar Título do Relatório para "Relatório de Conformidade Prévia"

### Alterações Necessárias

**1. `src/pages/AuditReport.tsx`**

Substituir todas as ocorrências de "Relatório de Auditoria Fiscal" por "Relatório de Conformidade Prévia":

- **Linha 74** (capa do relatório): `RELATÓRIO DE AUDITORIA FISCAL` → `RELATÓRIO DE CONFORMIDADE PRÉVIA`
- **Linha 215** (título do PDF exportado): `<h1>Relatório de Auditoria Fiscal</h1>` → `<h1>Relatório de Conformidade Prévia</h1>`
- **Linha 150** (título da página): `Relatório de Auditoria` → `Relatório de Conformidade Prévia`

**2. `supabase/functions/generate-report/index.ts`**

- **Linha 83** (system prompt): Atualizar descrição do sistema
- **Linha 85** (user prompt): Atualizar instrução inicial
- **Linha 129** (function description): `Gera relatório de auditoria fiscal` → `Gera relatório de conformidade prévia`

**3. Re-deploy da edge function** `generate-report`

