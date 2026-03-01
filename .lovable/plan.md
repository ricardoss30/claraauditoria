

## Plano: Reestruturar Configuracoes com Submenus e Historico de Versoes

### 1. Migration: Criar tabela `setting_versions`

Tabela para armazenar historico de versoes dos prompts com rollback:

```sql
CREATE TABLE public.setting_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.setting_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage versions" ON public.setting_versions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 2. Reestruturar rotas em `src/App.tsx`

Adicionar sub-rotas para Settings:
- `/settings/users` — Gestao de Usuarios
- `/settings/prompts/agent` — Prompt do Agente de IA
- `/settings/prompts/user` — Prompt do Usuario (User)
- `/settings/prompts/structured-output` — Saida Estruturada
- `/settings` redireciona para `/settings/users`

### 3. Atualizar `src/components/layout/AppSidebar.tsx`

Substituir o link unico "Configuracoes" por um grupo colapsavel (usando `Collapsible` do shadcn) visivel apenas para admins, com submenus:

```text
Configuracoes (colapsavel)
  ├── Gestao de Usuarios        → /settings/users
  └── Gerenciamento de Prompt (colapsavel)
        ├── Prompt do Agente     → /settings/prompts/agent
        ├── Prompt do Usuario    → /settings/prompts/user
        └── Saida Estruturada    → /settings/prompts/structured-output
```

### 4. Refatorar `src/pages/Settings.tsx`

Transformar em layout wrapper com `Outlet` do react-router que renderiza as sub-paginas. Manter a verificacao `hasRole("admin")`.

### 5. Criar paginas de sub-rotas

- **`src/pages/settings/UsersManagement.tsx`** — Extrair o conteudo atual de gestao de usuarios do Settings.tsx
- **`src/pages/settings/AgentPrompt.tsx`** — Wrapper simples que renderiza `<AgentPromptManager />`
- **`src/pages/settings/UserPrompt.tsx`** — Novo componente, reutilizando o padrao do `AgentPromptManager` com key `user_system_prompt`
- **`src/pages/settings/StructuredOutput.tsx`** — Novo componente, mesmo padrao com key `structured_output_prompt`

### 6. Criar `src/components/PromptManager.tsx` (componente generico)

Refatorar `AgentPromptManager` em componente reutilizavel que recebe props:
- `settingKey: string` — chave no `system_settings`
- `title: string` — titulo exibido
- `placeholder: string`

Incluir secao de **historico de versoes** no mesmo componente:
- Ao salvar, inserir versao anterior na tabela `setting_versions`
- Listar ultimas versoes com data/hora e botao "Restaurar"
- Restaurar atualiza o textarea com o valor da versao selecionada (sem salvar automaticamente)

### 7. Atualizar `src/hooks/useSystemSettings.ts`

Adicionar ao hook:
- `saveWithHistory`: mutation que primeiro insere a versao atual em `setting_versions`, depois faz upsert do novo valor
- `useSettingVersions(key)`: query para buscar historico de versoes ordenado por `created_at DESC`
- `restoreVersion`: funcao que retorna o valor de uma versao especifica

### 8. Atualizar `supabase/functions/process-document/index.ts`

Adicionar fetch dos novos prompts (`user_system_prompt` e `structured_output_prompt`) e usar na construcao das mensagens para a IA:
- `user_system_prompt` → usado na mensagem `role: "user"` como prefixo
- `structured_output_prompt` → usado na descricao da tool/function `process_document_analysis`

### Arquivos alterados/criados
- Nova migration SQL (`setting_versions`)
- `src/integrations/supabase/types.ts` (auto-regenerado)
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/Settings.tsx` (refatorado como layout)
- `src/pages/settings/UsersManagement.tsx` (novo)
- `src/pages/settings/AgentPrompt.tsx` (novo)
- `src/pages/settings/UserPrompt.tsx` (novo)
- `src/pages/settings/StructuredOutput.tsx` (novo)
- `src/components/PromptManager.tsx` (novo, substitui AgentPromptManager)
- `src/hooks/useSystemSettings.ts` (expandido com historico)
- `supabase/functions/process-document/index.ts`

