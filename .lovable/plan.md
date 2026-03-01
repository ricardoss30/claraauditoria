

## Gerenciar Prompt do Agente - Plano

### 1. Migration: Criar tabela `system_settings`

Tabela key-value para armazenar configurações do sistema, incluindo o prompt:

```sql
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read settings" ON public.system_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can upsert settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed com o prompt atual
INSERT INTO public.system_settings (key, value) VALUES ('agent_system_prompt', 
'Voce e um especialista em analise de licitacoes publicas brasileiras...');
```

### 2. Criar `src/hooks/useSystemSettings.ts`

Hook com `useQuery` para buscar o valor por key e `useMutation` para upsert, invalidando a query no sucesso.

### 3. Criar `src/components/AgentPromptManager.tsx`

Componente com:
- **Textarea** grande (min 400px altura) com o conteúdo do prompt
- **Botão "Salvar"** — upsert na tabela `system_settings` com loading spinner
- **Botão "Limpar Prompt"** — limpa o textarea (com confirmação)
- **Botão "Exportar Prompt em PDF"** — reutiliza padrão `window.print` via iframe oculto
- **Botão "Visualizar Atual"** — recarrega o valor do banco descartando edições locais
- Toast de sucesso/erro via `sonner`

### 4. Atualizar `src/pages/Settings.tsx`

Adicionar o componente `AgentPromptManager` como um novo `Card` abaixo da gestão de usuários.

### 5. Atualizar `supabase/functions/process-document/index.ts`

Antes de montar as mensagens para a IA, buscar o prompt da tabela `system_settings` (key `agent_system_prompt`). Se existir, usar como system message; caso contrário, usar o prompt hardcoded como fallback.

### Arquivos alterados
- Nova migration SQL (`system_settings`)
- `src/integrations/supabase/types.ts` (auto-regenerado)
- `src/hooks/useSystemSettings.ts` (novo)
- `src/components/AgentPromptManager.tsx` (novo)
- `src/pages/Settings.tsx`
- `supabase/functions/process-document/index.ts`

