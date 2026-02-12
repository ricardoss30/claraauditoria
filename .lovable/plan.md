

# Fase 2: Dashboard com KPIs e Listagem de Documentos

## Resumo

Com a Fase 1 concluida (banco de dados, autenticacao e layout), esta fase implementa o Dashboard com dados reais do Supabase e a pagina de Documentos com listagem, filtros e busca.

---

## 1. Dashboard - KPIs Dinamicos

Substituir os valores estaticos do Dashboard por consultas reais ao Supabase:

- **Documentos Analisados**: contagem de `procurement_documents` com status `processed`
- **Alertas Pendentes**: contagem de `risk_alerts` com status `pending`
- **Regras Ativas**: contagem de `risk_rules` com `is_active = true`
- **Taxa de Precisao**: percentual de alertas confirmados vs total revisados

Usar `@tanstack/react-query` para todas as consultas com cache automatico.

## 2. Dashboard - Graficos com Recharts

Adicionar secao de graficos abaixo dos KPIs:

- **Grafico de barras**: alertas por categoria (sobrepreco, direcionamento, prazo exiguo)
- **Grafico de linha**: evolucao de documentos processados ao longo do tempo (ultimos 30 dias)
- **Tabela de alertas recentes**: ultimos 5 alertas com titulo, severidade, status e data

## 3. Pagina de Documentos

Implementar a pagina completa de listagem de documentos:

- **Tabela paginada** com colunas: titulo, orgao, modalidade, valor estimado, status, data de publicacao, score de risco
- **Filtros**: por status (pending, processing, processed, error), por modalidade
- **Busca**: campo de texto para buscar por titulo ou orgao
- **Badge de status** com cores diferenciadas por estado
- **Badge de risco** com cores por faixa de score (0-30 verde, 31-60 amarelo, 61-100 vermelho)
- **Estado vazio**: mensagem amigavel quando nao ha documentos

## 4. Pagina de Alertas

Implementar listagem de alertas com workflow de revisao:

- **Tabela** com colunas: titulo, tipo, severidade (1-5 estrelas), documento vinculado, status, data
- **Filtros**: por status (pending, under_review, confirmed, dismissed), por severidade, por tipo
- **Acoes**: botoes para alterar status (confirmar, descartar, solicitar revisao)
- **Dialog de revisao**: ao clicar em um alerta, abrir dialog com detalhes, evidencia e campo para notas de revisao
- **Badges de severidade**: cores graduais de verde (1) a vermelho (5)

## 5. Pagina de Regras

Implementar CRUD de regras de risco:

- **Listagem** em cards com nome, descricao, categoria, tipo, severidade, status ativo/inativo
- **Switch ativar/desativar**: toggle inline para cada regra
- **Dialog de criacao/edicao**: formulario com campos nome, descricao, categoria, tipo de regra (keyword, numerico, padrao, IA), severidade (slider 1-5), parametros (JSON)
- **Botao de excluir**: com confirmacao via AlertDialog
- **Apenas admins** podem criar/editar/excluir regras (validacao no frontend + RLS no backend)

## 6. Pagina de Fontes de Dados

Implementar gestao de fontes:

- **Listagem** em cards com nome, tipo, URL base, status ativo/inativo, ultima sincronizacao
- **Dialog de criacao/edicao**: formulario com nome, tipo (api/scraping), URL base, configuracoes
- **Switch ativar/desativar**: toggle inline
- **Indicador de ultima sincronizacao**: data/hora formatada ou "Nunca sincronizado"
- **Apenas admin/gestor** podem gerenciar fontes

## 7. Pagina de Configuracoes (Admin)

Implementar gestao de usuarios e roles:

- **Lista de usuarios**: tabela com email, nome, roles, data de cadastro
- **Gerenciar roles**: botoes para adicionar/remover roles de usuarios
- **Apenas admins** tem acesso a esta pagina (validacao no frontend + RLS)

---

## Detalhes Tecnicos

**Hooks de dados a criar (usando @tanstack/react-query):**

| Arquivo | Descricao |
|---|---|
| `src/hooks/useDashboardStats.ts` | Consultas agregadas para KPIs |
| `src/hooks/useDocuments.ts` | CRUD e listagem de documentos |
| `src/hooks/useAlerts.ts` | CRUD e listagem de alertas |
| `src/hooks/useRules.ts` | CRUD e listagem de regras |
| `src/hooks/useSources.ts` | CRUD e listagem de fontes |
| `src/hooks/useUsers.ts` | Listagem de usuarios e gestao de roles (admin) |

**Paginas a modificar:**

1. `src/pages/Dashboard.tsx` - KPIs dinamicos + graficos Recharts + tabela de alertas recentes
2. `src/pages/Documents.tsx` - Tabela paginada com filtros e busca
3. `src/pages/Alerts.tsx` - Listagem com workflow de revisao
4. `src/pages/Rules.tsx` - CRUD completo de regras
5. `src/pages/Sources.tsx` - Gestao de fontes de dados
6. `src/pages/Settings.tsx` - Gestao de usuarios e roles

**Componentes auxiliares a criar:**

- `src/components/StatusBadge.tsx` - Badge reutilizavel para status de documentos e alertas
- `src/components/RiskScoreBadge.tsx` - Badge com cor graduada por score de risco
- `src/components/SeverityIndicator.tsx` - Indicador visual de severidade (1-5)
- `src/components/EmptyState.tsx` - Componente para estados vazios

**Biblioteca ja instalada:** `recharts` (para graficos)

