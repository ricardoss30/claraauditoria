

## Problema

Os botões de preview, download e exclusão na Base de Conhecimento falham com "Erro ao gerar link de download" porque as funções `getFileUrl`, `deleteFile` e `deleteFolder` aplicam `sanitizePath` no caminho recebido. Isso transforma o nome real do arquivo (ex: "GUIA COMPLETO DE AUDITORIA FISCAL.pdf") em "guia-completo-de-auditoria-fiscal.pdf", que não existe no storage.

O `sanitizePath` só deveria ser usado no **upload** (para criar o nome no storage). Nas operações de leitura/exclusão, o caminho já vem da listagem do storage e deve ser usado como está.

## Solução

**Arquivo: `src/services/knowledgeBaseService.ts`**

Remover a chamada a `sanitizePath` nas funções de leitura e exclusão:

1. `getFileUrl` -- usar `path` diretamente em vez de `sanitizePath(path)`
2. `deleteFile` -- usar `path` diretamente
3. `deleteFolder` -- usar `path` diretamente

Manter `sanitizePath` apenas em `uploadFile` e `createFolder` (onde o nome é criado).

Isso corrige preview, download e exclusão sem afetar o upload.

