

## Plano: Tela "Gerar Relatório" de Auditoria Fiscal

### Visão Geral
Adicionar botão "Gerar Relatório" na página de detalhes do documento. Ao clicar, navega para uma nova página com relatório de auditoria fiscal estruturado em 12 seções, pré-preenchido com dados do documento e alertas da IA, com campos editáveis, e opções de Salvar, Editar e Exportar PDF.

### 1. Nova tabela `audit_reports`

```sql
create table public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references procurement_documents(id) on delete cascade not null,
  created_by uuid references auth.users(id),
  content jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.audit_reports enable row level security;
create policy "Authenticated users can manage audit reports"
  on public.audit_reports for all to authenticated
  using (true) with check (true);
```

O campo `content` (JSONB) armazenará todas as 12 seções do relatório como chaves (capa, sumario, introducao, metodologia, contextualizacao, analise_tecnica, constatacoes, avaliacao_risco, recomendacoes, plano_acao, conclusao, anexos).

### 2. Nova página `src/pages/AuditReport.tsx`

Rota: `/documents/:id/report` (novo) e `/documents/:id/report/:reportId` (edição)

Estrutura da página:
- Header com título do documento, botões "Salvar", "Editar" (toggle modo leitura/edição), "Exportar PDF"
- 12 seções em cards, cada uma com título e campos Textarea editáveis
- Ao abrir pela primeira vez ("Gerar Relatório"), pré-preenche os campos com dados do documento e alertas:
  - **Capa**: título do documento, órgão, data atual
  - **Introdução**: escopo baseado na modalidade e descrição
  - **Contextualização**: dados extraídos do documento (órgão, modalidade, valor, prazo)
  - **Constatações**: lista de alertas com título, descrição, evidência
  - **Avaliação de Risco**: risk_score e severidades dos alertas
  - **Recomendações**: review_notes dos alertas
  - Demais seções: templates padrão editáveis

- Salvar: insere/atualiza na tabela `audit_reports`
- Exportar PDF: gera HTML estruturado e usa `window.print()` (mesmo padrão existente)

### 3. Botão na `DocumentDetail.tsx`

Adicionar botão "Gerar Relatório" ao lado dos botões existentes (Download, Reprocessar, Exportar PDF). Se já existir um relatório salvo para o documento, o botão muda para "Ver Relatório".

### 4. Rota no `App.tsx`

Adicionar rota `/documents/:id/report/:reportId?` protegida.

### Arquivos
- **Criar**: `src/pages/AuditReport.tsx`
- **Editar**: `src/pages/DocumentDetail.tsx` (botão)
- **Editar**: `src/App.tsx` (rota)
- **Migração**: nova tabela `audit_reports`

