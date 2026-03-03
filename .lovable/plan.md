

## Plano de Implementacao - Itens 3.3 e 3.4

---

### 3.3. Exportacao de Relatorios Consolidados

**Nova pagina `/reports`** com formulario para gerar relatorio consolidado por periodo.

**Componentes:**
1. **`src/pages/ConsolidatedReport.tsx`** - Pagina com:
   - Seletores de periodo (mes/trimestre/personalizado) usando date pickers
   - Filtros opcionais por orgao e modalidade
   - Botao "Gerar Relatorio" que consulta dados agregados
   - Visualizacao do relatorio com secoes: resumo executivo, metricas, top alertas, documentos analisados
   - Botoes de exportacao CSV e PDF (impressao via `window.print()`)

2. **`src/hooks/useConsolidatedReport.ts`** - Hook que:
   - Busca `procurement_documents` filtrados por `created_at` no periodo
   - Busca `risk_alerts` associados aos documentos do periodo
   - Calcula metricas agregadas: total de docs, score medio, distribuicao por status/modalidade/orgao, total de alertas por severidade

3. **Atualizacoes:**
   - `App.tsx`: rota `/reports`
   - `AppSidebar.tsx`: item "Relatorios" no menu
   - `useExport.ts`: nova funcao `exportConsolidatedPDF()` que gera HTML com todas as secoes

**Nao requer migracao SQL** - usa tabelas existentes com queries agregadas.

---

### 3.4. Integracao com APIs de Dados Publicos (PNCP)

A API do PNCP (Portal Nacional de Contratacoes Publicas) e publica e gratuita: `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`

**Componentes:**

1. **Edge Function `supabase/functions/import-pncp/index.ts`**:
   - Recebe parametros: `dataInicial`, `dataFinal`, `codigoModalidadeContratacao` (opcional), `uf` (opcional), `pagina`
   - Chama a API publica do PNCP (nao requer chave de API)
   - Retorna resultados formatados para o frontend
   - Endpoint de importacao: recebe lista de IDs selecionados, busca detalhes e cria `procurement_documents` com status `pending`, depois invoca `process-document`

2. **`src/pages/ImportPNCP.tsx`** - Pagina de importacao com:
   - Filtros: periodo, UF, modalidade
   - Botao "Buscar" que lista editais encontrados em tabela
   - Checkboxes para selecionar quais importar
   - Botao "Importar Selecionados" que cria documentos e dispara processamento
   - Indicador de status (importando/processando)

3. **`src/hooks/useImportPNCP.ts`** - Hook com:
   - Query para busca na API via edge function
   - Mutation para importacao dos selecionados

4. **Atualizacoes:**
   - `App.tsx`: rota `/import`
   - `AppSidebar.tsx`: item "Importar Editais" no menu
   - `supabase/config.toml`: registro da nova function

**Nao requer migracao SQL** - usa `procurement_documents` existente. O campo `external_id` ja existe para controle de duplicatas.

---

### Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/pages/ConsolidatedReport.tsx` |
| Criar | `src/hooks/useConsolidatedReport.ts` |
| Criar | `supabase/functions/import-pncp/index.ts` |
| Criar | `src/pages/ImportPNCP.tsx` |
| Criar | `src/hooks/useImportPNCP.ts` |
| Editar | `src/App.tsx` (2 rotas) |
| Editar | `src/components/layout/AppSidebar.tsx` (2 itens menu) |
| Editar | `src/hooks/useExport.ts` (funcao consolidada) |
| Editar | `supabase/config.toml` (import-pncp) |

