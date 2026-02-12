

# Fase 1: Estrutura Base e Autenticacao - CLARA

## Resumo

Configurar toda a base do sistema CLARA no Supabase: tabelas do banco de dados, sistema de autenticacao com roles (auditor, gestor, admin), politicas de seguranca (RLS), e o layout base da aplicacao com sidebar e rotas principais.

---

## 1. Banco de Dados - Tabelas e Tipos

Criar todas as tabelas principais do sistema com uma migracao SQL:

**Tipo enum para roles:**
- `app_role`: admin, gestor, auditor

**Tipo enum para status de documentos:**
- `processing_status`: pending, processing, processed, error

**Tipo enum para status de alertas:**
- `alert_status`: pending, under_review, confirmed, dismissed

**Tabelas a criar:**

| Tabela | Descricao |
|---|---|
| `profiles` | Dados do usuario (nome, avatar) vinculados ao auth.users |
| `user_roles` | Roles dos usuarios (admin, gestor, auditor) - tabela separada por seguranca |
| `data_sources` | Fontes de dados (Compras.gov.br, etc) |
| `procurement_documents` | Documentos de licitacao coletados |
| `risk_rules` | Regras parametrizadas de analise de risco |
| `risk_alerts` | Alertas gerados pelo sistema |
| `text_analysis_cache` | Cache de analises de IA |
| `audit_logs` | Log de todas as acoes no sistema |

**Funcoes de seguranca:**
- `has_role(user_id, role)` - funcao SECURITY DEFINER para verificar roles sem recursao RLS
- `handle_new_user()` - trigger que cria profile automaticamente no signup

---

## 2. Politicas de Seguranca (RLS)

Todas as tabelas terao RLS habilitado com as seguintes regras:

- **profiles**: usuarios autenticados podem ler todos os perfis; cada usuario so edita o proprio
- **user_roles**: somente admins podem gerenciar roles; usuarios podem ver suas proprias roles
- **data_sources**: leitura para todos autenticados; escrita apenas para admin/gestor
- **procurement_documents**: leitura para todos autenticados; escrita para admin/gestor
- **risk_rules**: leitura para todos autenticados; escrita para admin
- **risk_alerts**: leitura para todos autenticados; atualizacao para auditor/gestor/admin
- **text_analysis_cache**: leitura para todos autenticados; escrita via service role (edge functions)
- **audit_logs**: leitura para admin; insercao para todos autenticados

---

## 3. Autenticacao

- Login/Signup por email e senha usando Supabase Auth
- Pagina `/auth` com formulario de login e cadastro
- Componente `AuthProvider` com contexto React para sessao do usuario
- Hook `useAuth` para acessar usuario logado e suas roles
- Rota protegida (`ProtectedRoute`) que redireciona para `/auth` se nao autenticado
- Primeiro usuario cadastrado recebe role `admin` automaticamente via trigger

---

## 4. Layout e Navegacao

- **Sidebar** com navegacao principal usando componentes Shadcn/ui:
  - Dashboard (icone LayoutDashboard)
  - Documentos (icone FileText)
  - Alertas (icone AlertTriangle)
  - Regras (icone Shield)
  - Fontes de Dados (icone Database)
  - Configuracoes (icone Settings) - visivel apenas para admin
- **Header** com nome do usuario logado e botao de logout
- Tema de cores: azul/roxo para IA, verde para sucesso, laranja/vermelho para alertas

**Rotas:**

| Rota | Pagina |
|---|---|
| `/auth` | Login/Cadastro |
| `/` | Dashboard (protegida) |
| `/documents` | Lista de Documentos (protegida) |
| `/alerts` | Gerenciador de Alertas (protegida) |
| `/rules` | Configuracao de Regras (protegida) |
| `/sources` | Fontes de Dados (protegida) |
| `/settings` | Configuracoes (protegida, admin) |

---

## 5. Regras Iniciais Pre-configuradas

Inserir via seed 3 regras de risco iniciais:
1. **Sobrepre\u00e7o** - detecta valores acima de referencia de mercado
2. **Direcionamento de marca** - detecta mencoes a marcas especificas
3. **Prazo exiguo** - detecta prazos de publicacao menores que o legal

---

## Detalhes Tecnicos

**Arquivos a criar/modificar:**

1. **Migracao SQL** - via ferramenta de migracao do Supabase:
   - Criar enums, tabelas, funcoes, triggers, RLS policies, seed de regras

2. **src/contexts/AuthContext.tsx** - Provider de autenticacao
3. **src/hooks/useAuth.ts** - Hook para acessar auth e roles
4. **src/components/ProtectedRoute.tsx** - Wrapper de rota protegida
5. **src/pages/Auth.tsx** - Pagina de login/cadastro
6. **src/components/layout/AppLayout.tsx** - Layout com sidebar + header
7. **src/components/layout/AppSidebar.tsx** - Sidebar de navegacao
8. **src/pages/Dashboard.tsx** - Pagina placeholder do dashboard
9. **src/pages/Documents.tsx** - Pagina placeholder de documentos
10. **src/pages/Alerts.tsx** - Pagina placeholder de alertas
11. **src/pages/Rules.tsx** - Pagina placeholder de regras
12. **src/pages/Sources.tsx** - Pagina placeholder de fontes
13. **src/pages/Settings.tsx** - Pagina placeholder de configuracoes
14. **src/App.tsx** - Atualizar com novas rotas e AuthProvider
15. **src/index.css** - Adicionar variaveis de cor do tema CLARA

**Variaveis de tema CSS adicionais:**
- `--clara-primary`: azul/roxo (IA)
- `--clara-success`: verde
- `--clara-warning`: laranja
- `--clara-danger`: vermelho

