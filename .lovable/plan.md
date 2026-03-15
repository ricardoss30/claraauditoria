

## Chatbot de IA no Cabeçalho

### Visão Geral
Criar um botão de chat IA no header global (`AppLayout`) que abre um painel flutuante de chat, permitindo ao usuário tirar dúvidas durante a auditoria. A IA usará o Lovable AI Gateway com streaming.

### Alterações

**1. Edge Function `supabase/functions/chat-assistant/index.ts`** (novo)
- Recebe `messages` (array de mensagens) do frontend
- Envia ao Lovable AI Gateway (`google/gemini-3-flash-preview`) com system prompt focado em auditoria/conformidade
- Retorna resposta em streaming (SSE)
- Trata erros 429/402

**2. `supabase/config.toml`** — adicionar:
```toml
[functions.chat-assistant]
verify_jwt = false
```

**3. `src/components/chatbot/ChatBot.tsx`** (novo)
- Componente de chat flutuante (fixed bottom-right), baseado no design do CRM Tais Cravo
- Mensagens user/assistant com bolhas, timestamps, scroll automático
- Streaming token-by-token via SSE do edge function
- Textarea com auto-resize, envio com Enter
- Botão X para fechar
- Renderização markdown com `react-markdown`
- Mensagem inicial: "Olá! Sou a Clara, assistente de IA para auditoria. Como posso ajudar?"

**4. `src/components/layout/AppLayout.tsx`** — modificar header:
- Adicionar estado `showChat` e botão com ícone `MessageSquare` + tooltip "Assistente IA"
- Renderizar `<ChatBot>` quando `showChat === true`
- Passar `onClose` e `userId` do contexto de auth

### Detalhes Técnicos

- **Modelo**: `google/gemini-3-flash-preview`
- **System prompt**: Especialista em auditoria de conformidade, licitações e contratos públicos brasileiros
- **Streaming**: SSE line-by-line parsing no frontend, token-by-token rendering
- **Auth**: Valida JWT no edge function usando `supabase.auth.getUser(token)`
- **Sem persistência**: Mensagens ficam apenas em memória (state) durante a sessão

