

## Plano de Acao - Correcoes e Melhorias do Sistema C.L.A.R.A

Baseado no relatorio de auditoria tecnica (Score de Maturidade: 38/100), segue o plano organizado por prioridade.

---

### FASE 1 - Correcoes Criticas (Prioridade Alta)

**1.1. Estabilidade do Score de Risco [C-01]**
- Problema: scores inconsistentes entre analises do mesmo documento
- Acao: adicionar parametro `temperature: 0` na chamada ao modelo de IA em `process-document/index.ts` para garantir determinismo
- Implementar cache de resultados para evitar reprocessamento desnecessario (ja existe `text_analysis_cache`, mas precisa ser consultado antes de chamar a IA)

**1.2. Valor Estimado Ausente na Listagem**
- Problema: campo `estimated_value` nao exibido de forma clara ou nao extraido corretamente
- Acao: ja esta na tabela de documentos (`Documents.tsx` linha 119-122), verificar se a IA esta extraindo corretamente e se o campo esta sendo salvo

**1.3. Metricas Incompletas no Dashboard**
- Problema: "Taxa de Precisao" sem dados suficientes para calculo significativo
- Acao: adicionar metricas adicionais ao Dashboard:
  - Score medio de risco dos documentos
  - Distribuicao por modalidade de licitacao
  - Total de documentos por status (pendente/processado/erro)
  - Tempo medio de processamento

**1.4. Fluxo de Resolucao de Alertas**
- Problema: alertas sem workflow estruturado de tratamento
- Acao: ja existe fluxo basico (pending -> under_review -> confirmed/dismissed) em `DocumentDetail.tsx`
- Melhorar: adicionar campo de "responsavel" (assigned_to) nos alertas, permitir atribuir alertas a usuarios especificos
- Adicionar historico de alteracoes de status do alerta

---

### FASE 2 - Melhorias Funcionais (Prioridade Media)

**2.1. Log de Auditoria - Identificacao de Usuario**
- Problema: `user_id` exibido como hash truncado (8 chars), IP sempre ausente
- Acao: fazer JOIN com tabela `profiles` para exibir `full_name` em vez do UUID
- Capturar IP do cliente nas edge functions via header `x-forwarded-for` e salvar no campo `ip_address`

**2.2. Regras de Risco Insuficientes**
- Problema: apenas 3 regras ativas
- Acao: criar seed de regras padrao baseadas na Lei 14.133/2021:
  - Sobrepreco (valor > X% acima do estimado)
  - Direcionamento de marca (mencao a marcas sem justificativa)
  - Prazo exiguo (prazo < X dias para a modalidade)
  - Fracionamento (valores proximos ao limite da modalidade)
  - Ausencia de pesquisa de precos
  - Exigencias restritivas de habilitacao
  - Aditivos contratuais excessivos
  - Ausencia de publicidade adequada

**2.3. Base de Conhecimento Vazia**
- Problema: pastas sem arquivos vinculados
- Acao: corrigir bug de criacao de pastas (ja corrigido com file_size_limit)
- Adicionar documentacao/guia no EmptyState orientando o usuario sobre quais documentos carregar (legislacao, jurisprudencia, tabelas de referencia)

**2.4. Versao do Sistema na Interface**
- Problema: ausente na interface
- Acao: adicionar numero de versao no footer do sidebar (`AppSidebar.tsx`) lido de `package.json` ou variavel de ambiente

---

### FASE 3 - Evolucoes Estrategicas (Prioridade Baixa)

**3.1. Analise Comparativa entre Documentos**
- Permitir comparar scores de risco e alertas entre documentos similares

**3.2. Painel de Tendencias**
- Grafico de evolucao do score de risco ao longo do tempo
- Identificacao de orgaos com maior frequencia de alertas

**3.3. Exportacao de Relatorios Consolidados**
- Gerar relatorio mensal/trimestral agregando todos os documentos analisados

**3.4. Integracao com APIs de Dados Publicos**
- Conectar com ComprasNet / PNCP para importacao automatica de editais

---

### Resumo Tecnico de Implementacao

| Item | Arquivos Afetados | Complexidade |
|------|-------------------|--------------|
| Score deterministico | `process-document/index.ts` | Baixa |
| Metricas dashboard | `useDashboardStats.ts`, `Dashboard.tsx` | Media |
| Audit log com nome | `AuditLogs.tsx`, `useAuditLogs.ts` | Baixa |
| Captura de IP | Edge functions (todas) | Baixa |
| Seed de regras | Nova migracao SQL | Baixa |
| Versao na interface | `AppSidebar.tsx` | Trivial |
| Responsavel no alerta | Migracao SQL + `DocumentDetail.tsx` | Media |

Recomendo comecar pela Fase 1, que endereca os achados criticos do relatorio e tem maior impacto no score de maturidade do sistema.

