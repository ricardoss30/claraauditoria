

## Plano: Integrar Base de Conhecimento na Análise + Preview Inline

### 1. Atualizar Edge Function `process-document/index.ts`

Adicionar etapa que busca arquivos relevantes do bucket `base_conhecimento` antes de chamar a IA:
- Listar recursivamente todos os arquivos do bucket (excluindo `.emptyFolderPlaceholder`)
- Para cada arquivo TXT: baixar e extrair conteúdo textual
- Para cada arquivo PDF: extrair texto via `unpdf`
- Arquivos DOCX: incluir apenas o nome como referência (extração complexa demais para edge)
- Concatenar todo o conteúdo extraído como "Contexto da Base de Conhecimento" no system prompt, limitado a ~15.000 caracteres
- Inserir esse contexto entre as regras ativas e antes da mensagem do usuário

### 2. Adicionar Preview Inline em `Sources.tsx`

- Adicionar estado `previewFile: { name: string; url: string; type: string } | null`
- Botão "Visualizar" (ícone `Eye`) ao lado de Download para arquivos PDF e TXT
- Dialog de preview com:
  - **PDF**: `<iframe>` apontando para a signed URL com largura/altura totais
  - **TXT**: Fetch do conteúdo via signed URL e exibir em `<pre>` com scroll, fonte mono
  - **DOCX**: Sem preview (badge "Preview não disponível")
- Header do dialog mostra o nome do arquivo

### 3. Criar função auxiliar no service

Adicionar `listAllFiles(folder)` recursiva em `knowledgeBaseService.ts` para a edge function poder listar todos os arquivos do bucket de forma flat.

### Arquivos
- `supabase/functions/process-document/index.ts` (editado — adicionar fetch de base de conhecimento)
- `src/services/knowledgeBaseService.ts` (adicionar `listAllFiles`)
- `src/pages/Sources.tsx` (adicionar botão preview + dialog com iframe/pre)

