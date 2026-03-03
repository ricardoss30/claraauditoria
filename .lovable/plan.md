

## Análise

O erro "The object exceeded the maximum allowed size" é provavelmente uma mensagem enganosa do Supabase Storage para paths com caracteres inválidos (acentos, espaços). O `sanitizePath` já foi adicionado ao service, mas preciso verificar se está sendo aplicado corretamente em todos os pontos.

Analisando o fluxo:
1. `handleCreateFolder` → `createFolderMutation` → `createFolder(path)` → `sanitizePath(path)` ✅
2. Porém, ao navegar dentro de pastas existentes (que têm nomes com espaços como "Manual de Compras"), o `currentPath` armazena o nome original não-sanitizado. Ao criar subpastas, o path fica `Manual de Compras/nova-pasta`, misturando segmentos sanitizados e não-sanitizados.

### Correções

1. **`src/pages/Sources.tsx`** — Aplicar `sanitizePath` ao construir o path de upload de arquivos (linha ~101):
   ```typescript
   const path = sanitizePath(folder ? `${folder}/${file.name}` : file.name);
   ```
   Atualmente o path do upload no handler só sanitiza no service, mas o path passado ao `embedFile` não é sanitizado.

2. **`src/pages/Sources.tsx`** — Sanitizar o path do embed para consistência (linhas 100-103), pois `embedFile` recebe o path original com acentos.

3. **`src/pages/Sources.tsx`** — Sanitizar o `folderName` no `handleCreateFolder` e o path nos `handleDelete`/`handleDownload`/`handlePreview` para que o path enviado ao Storage seja sempre limpo.

4. **`src/services/knowledgeBaseService.ts`** — Aplicar `sanitizePath` também em `deleteFile`, `deleteFolder`, e `getFileUrl` para garantir que TODOS os paths passados ao Storage sejam sanitizados, independentemente da origem.

Essas mudanças garantem que nenhum path com acentos ou espaços chegue à API do Supabase Storage.

