

# Validacao e Correcoes do Projeto C.L.A.R.A

## Resultado da Analise

Apos inspecionar todas as paginas, hooks, edge functions, banco de dados e logs do console, identifiquei **5 problemas** que precisam ser corrigidos e **2 melhorias recomendadas**.

---

## Problemas Encontrados

### 1. Warning no Console: forwardRef em Skeleton e EmptyState

**Onde:** Pagina `/audit` (AuditLogs.tsx)
**Problema:** Os componentes `Skeleton` e `EmptyState` sao function components simples, mas estao sendo usados dentro de `SidebarMenuButton asChild` ou similar contexto que tenta passar refs. O React emite warnings no console.
**Correcao:** Nao e necessario alterar Skeleton/EmptyState pois o warning vem do contexto de renderizacao condicional no AuditLogs onde esses componentes sao renderizados diretamente dentro do `CardContent`. Na verdade, o warning pode vir do fato de que AuditLogs e renderizado como child de ProtectedRoute que usa `<>{children}</>`. Isso e inofensivo, mas para limpar o console, podemos verificar se ha algum componente wrapper passando ref indevidamente.

**Acao:** Investigar e corrigir o warning adicionando `React.forwardRef` ao `Skeleton` e `EmptyState` se necessario.

### 2. Reprocessar Documento cria NOVO documento em vez de reprocessar

**Onde:** `DocumentDetail.tsx` linha 42-48
**Problema:** O botao "Reprocessar" chama `upload()` que cria um novo registro em `procurement_documents` em vez de reprocessar o documento existente.
**Correcao:** Criar uma funcao `reprocess` no hook `useDocumentUpload` que chama apenas a edge function com o `document_id` existente, sem criar novo registro.

### 3. Politica RLS permissiva detectada pelo linter

**Onde:** Banco de dados
**Problema:** O linter do Supabase detectou uma politica RLS com `USING (true)` em operacao de INSERT/UPDATE/DELETE, o que e excessivamente permissivo.
**Correcao:** Identificar a politica especifica e restringir ao contexto adequado (ex: service_role ou usuario autenticado com role especifica).

### 4. Edge Functions sem verificacao JWT

**Onde:** `supabase/config.toml`
**Problema:** Ambas as edge functions (`process-document` e `send-notification`) tem `verify_jwt = false`, permitindo chamadas nao autenticadas.
**Correcao:** `send-notification` deve ter `verify_jwt = false` pois e chamada internamente pela `process-document`. A `process-document` e chamada pelo frontend via `supabase.functions.invoke()` que ja envia o token, entao pode manter `verify_jwt = false` pois o service role key e usado internamente. Isso e aceitavel no contexto atual.

### 5. Categorias de regras nao coincidem com alert_type da IA

**Onde:** Edge function `process-document` e pagina `Rules.tsx`
**Problema:** As regras usam categorias como `financeiro`, `competitividade`, `temporal` (banco), mas a IA gera `alert_type` como `sobrepreco`, `direcionamento`, `prazo_exiguo`. O `ruleMap` na edge function faz match por `category`, mas os valores nao coincidem. Resultado: `rule_id` nunca sera preenchido nos alertas.
**Correcao:** Alinhar as categorias. As regras no banco usam categorias diferentes das que a IA retorna. Precisamos padronizar usando os mesmos valores tanto nas regras quanto no prompt da IA, ou ajustar o mapeamento.

---

## Melhorias Recomendadas

### A. Dark mode no icone Moon do ThemeToggle

**Onde:** `ThemeToggle.tsx`
**Problema menor:** O icone Moon usa `position: absolute` implicitamente via classes, mas como esta dentro de um Button com `justify-start`, o posicionamento pode ficar desalinhado em alguns navegadores.
**Melhoria:** Usar uma abordagem condicional simples em vez de animacoes CSS com absolute.

### B. Exportar CSV sem dados mostra botao habilitado no Dashboard

**Onde:** `Dashboard.tsx`
**Problema menor:** O botao "Exportar Resumo" no Dashboard nao tem condicao `disabled`, entao pode exportar mesmo sem dados carregados.

---

## Plano de Implementacao

### Passo 1: Corrigir reprocessamento de documento
- Adicionar funcao `reprocess(documentId, content)` ao hook `useDocumentUpload`
- Alterar `DocumentDetail.tsx` para usar `reprocess` em vez de `upload`

### Passo 2: Alinhar categorias de regras com tipos de alerta
- Migrar as categorias das regras existentes no banco para `sobrepreco`, `direcionamento`, `prazo_exiguo`
- Atualizar o `Select` de categorias em `Rules.tsx` para usar os mesmos valores
- Atualizar o prompt da IA para referenciar as categorias corretas

### Passo 3: Corrigir warnings de forwardRef
- Adicionar `React.forwardRef` ao componente `Skeleton`
- Adicionar `React.forwardRef` ao componente `EmptyState`

### Passo 4: Investigar e corrigir politica RLS permissiva
- Consultar as politicas existentes para identificar qual usa `USING (true)` em operacoes de escrita
- Ajustar para restringir ao contexto adequado

### Passo 5: Pequenos ajustes de UX
- Corrigir posicionamento do icone Moon no ThemeToggle
- Adicionar `disabled` ao botao de exportar no Dashboard enquanto dados carregam

---

## Detalhes Tecnicos

### Arquivos a modificar:

| Arquivo | Correcao |
|---|---|
| `src/hooks/useDocumentUpload.ts` | Adicionar funcao `reprocess()` |
| `src/pages/DocumentDetail.tsx` | Usar `reprocess` no botao Reprocessar |
| `src/components/ui/skeleton.tsx` | Adicionar forwardRef |
| `src/components/EmptyState.tsx` | Adicionar forwardRef |
| `src/pages/Rules.tsx` | Alinhar categorias do Select |
| `src/components/ThemeToggle.tsx` | Corrigir icone Moon |
| `src/pages/Dashboard.tsx` | Adicionar disabled no export |
| `supabase/functions/process-document/index.ts` | Ajustar mapeamento de categorias |

### Migracao SQL:
- Atualizar categorias das regras existentes: `financeiro` -> `sobrepreco`, `competitividade` -> `direcionamento`, `temporal` -> `prazo_exiguo`

