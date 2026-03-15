

## Persistência de Chat + RAG com Base de Conhecimento

### 1. Nova tabela `chat_conversations` e `chat_messages`

```sql
-- Conversas do chatbot
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'Nova conversa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.chat_conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mensagens individuais
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));
```

### 2. Edge Function `chat-assistant` — adicionar RAG

Antes de chamar a IA, buscar chunks relevantes da `conhecimento_chunks` usando keyword search (BM25-like, sem embeddings — consistente com o padrão do projeto):

- Extrair palavras-chave da última mensagem do usuário
- Buscar chunks com `ilike` nas palavras principais
- Limitar a 10 chunks / 8000 chars de contexto
- Injetar no system prompt como seção "Base de Conhecimento"

### 3. Frontend `ChatBot.tsx` — persistência

- Ao abrir, carregar a conversa mais recente do usuário (ou criar uma nova)
- Cada mensagem enviada/recebida é salva em `chat_messages`
- Botão "Nova conversa" para iniciar um novo thread
- Lista de conversas anteriores não incluída nesta fase (simplicidade)
- Auto-gerar título da conversa a partir da primeira mensagem do usuário

### 4. Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Criar tabelas `chat_conversations` + `chat_messages` |
| `supabase/functions/chat-assistant/index.ts` | Adicionar busca RAG por keyword nos chunks antes de enviar à IA |
| `src/components/chatbot/ChatBot.tsx` | Persistir mensagens no Supabase, carregar histórico ao abrir, botão "nova conversa" |

