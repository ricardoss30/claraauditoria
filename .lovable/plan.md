

## Cadastro dinâmico de Categorias e Tipos de Regra

Criar duas tabelas no Supabase para armazenar categorias e tipos de regra customizados, e adicionar botões de gerenciamento nas páginas de regras.

### Banco de dados

**Tabela `rule_categories`**:
- `id uuid PK default gen_random_uuid()`
- `name text NOT NULL` (valor slug, ex: "sobrepreco")
- `label text NOT NULL` (nome exibido, ex: "Sobrepreço")
- `scope text NOT NULL default 'risk'` ("risk" ou "analysis")
- `created_at timestamptz default now()`
- RLS: SELECT para authenticated, ALL para admin/gestor
- Seed com as 4 categorias existentes (sobrepreco, direcionamento, prazo_exiguo, outro) para scope "risk" e "analysis"

**Tabela `rule_types`**:
- `id uuid PK default gen_random_uuid()`
- `name text NOT NULL` (valor slug, ex: "keyword")
- `label text NOT NULL` (nome exibido, ex: "Palavra-chave")
- `scope text NOT NULL default 'risk'`
- `created_at timestamptz default now()`
- RLS: SELECT para authenticated, ALL para admin/gestor
- Seed com os 4 tipos existentes (keyword, numeric, pattern, ai) para ambos os scopes

### Hook compartilhado

**Novo `src/hooks/useRuleOptions.ts`**:
- Queries para `rule_categories` e `rule_types` filtrados por scope
- Mutations para criar e excluir categorias/tipos
- Exporta `{ categories, types, addCategory, deleteCategory, addType, deleteType }`

### Alterações nas páginas

**`src/pages/RiskRules.tsx` e `src/pages/AnalysisRules.tsx`**:
- Importar `useRuleOptions(scope)`
- Adicionar dois botões ao lado de "Nova Regra": "Categorias" e "Tipos de Regra"
- Cada botão abre um Dialog com lista das opções existentes (com botão de excluir) e um campo + botão para adicionar nova
- Nos selects de Categoria e Tipo de Regra do formulário de regra, usar os dados dinâmicos do hook em vez das opções hardcoded

### Resultado visual

```text
[+ Nova Regra]  [Categorias]  [Tipos de Regra]
```

Cada dialog de gerenciamento:
```text
┌─ Gerenciar Categorias ──────────┐
│                                  │
│  Sobrepreço              [🗑]   │
│  Direcionamento          [🗑]   │
│  Prazo Exíguo            [🗑]   │
│  Outro                   [🗑]   │
│                                  │
│  [___Nome___] [___Label___] [+] │
│                                  │
│                      [Fechar]    │
└──────────────────────────────────┘
```

