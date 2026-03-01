

## Plano: Transformar "Fontes de Dados" em Gerenciador de Base de Conhecimento

### 1. Deletar fontes existentes do banco

Executar SQL para remover "Edital teste" e "Editais Alagoinhas" da tabela `data_sources`.

### 2. Criar `src/services/knowledgeBaseService.ts`

Serviço conforme especificado pelo usuário com funções:
- `uploadFile(file, path)` — upload com upsert
- `listFiles(folder)` — listar arquivos/pastas
- `getFileUrl(path)` — URL assinada (1h)
- `deleteFile(path)` — remover arquivo
- `createFolder(path)` — criar pasta (upload de `.emptyFolderPlaceholder`)
- `deleteFolder(path)` — listar e remover todos arquivos da pasta

### 3. Criar `src/hooks/useKnowledgeBase.ts`

Hook React Query para:
- `useFiles(folder)` — query que lista arquivos na pasta atual
- `uploadMutation` — upload de arquivo
- `deleteMutation` — remover arquivo
- `createFolderMutation` — criar pasta
- `deleteFolderMutation` — remover pasta
- Invalidação automática de queries após mutations

### 4. Reescrever `src/pages/Sources.tsx`

Substituir completamente a página atual por um gerenciador de arquivos:
- **Header**: Título "Base de Conhecimento" + botões "Nova Pasta" e "Upload Arquivo"
- **Breadcrumb**: Navegação por caminho de pastas (ex: `/ > contratos > 2024`)
- **Lista**: Tabela com colunas Nome, Tipo, Tamanho, Data — pastas primeiro, depois arquivos
- **Ações por item**: Download (arquivos), Excluir
- **Dialog Upload**: Aceita PDF, TXT, DOCX com drag-and-drop
- **Dialog Nova Pasta**: Input para nome da pasta
- **Filtro de tipos**: Badge para PDF/TXT/DOCX

### 5. Atualizar `src/components/layout/AppSidebar.tsx`

Renomear item "Fontes de Dados" para "Base de Conhecimento" no menu (manter rota `/sources`).

### 6. Configurar RLS no bucket `base_conhecimento`

Migration SQL para adicionar políticas de storage permitindo usuários autenticados fazerem upload, leitura e exclusão.

### Arquivos
- Migration SQL (delete data_sources + storage policies)
- `src/services/knowledgeBaseService.ts` (novo)
- `src/hooks/useKnowledgeBase.ts` (novo)
- `src/pages/Sources.tsx` (reescrito)
- `src/components/layout/AppSidebar.tsx` (renomear label)

