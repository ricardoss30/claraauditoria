

## Plano: Indicador de Relatório na Listagem + Geração via IA

### 1. Indicador na listagem de documentos

**`src/hooks/useDocuments.ts`**: Após buscar documentos, fazer uma query separada em `audit_reports` para obter os `document_id`s que possuem relatório salvo. Retornar um Set de IDs com relatório.

**`src/pages/Documents.tsx`**: Adicionar coluna "Relatório" na tabela com um badge/ícone indicando se existe relatório (ícone FileText verde) ou não (traço). Clicar no ícone navega direto para o relatório.

### 2. Edge Function `generate-report` para geração via IA

**Criar `supabase/functions/generate-report/index.ts`**:
- Recebe `document_id`
- Busca documento, alertas e contexto da base de conhecimento
- Chama Lovable AI (google/gemini-3-flash-preview) com tool calling para preencher as 12 seções do relatório
- Retorna o conteúdo estruturado (JSONB com as 12 chaves)
- Prompt instruirá a IA a gerar texto profissional de auditoria fiscal para cada seção, usando os dados do documento e alertas como base

**Registrar em `supabase/config.toml`** com `verify_jwt = false`.

### 3. Botão "Gerar com IA" na página AuditReport

**`src/pages/AuditReport.tsx`**: Adicionar botão "Gerar com IA" (ícone Sparkles) ao lado dos botões existentes. Ao clicar:
- Chama `supabase.functions.invoke("generate-report", { body: { document_id } })`
- Mostra loading/spinner durante processamento
- Substitui o conteúdo atual com o gerado pela IA
- Toast de sucesso/erro

### Arquivos
- **Editar**: `src/hooks/useDocuments.ts` (query de relatórios existentes)
- **Editar**: `src/pages/Documents.tsx` (coluna "Relatório")
- **Editar**: `src/pages/AuditReport.tsx` (botão "Gerar com IA")
- **Criar**: `supabase/functions/generate-report/index.ts`
- **Editar**: `supabase/config.toml`

