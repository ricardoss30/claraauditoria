

## Fix: Upload de .doc rejeitado por MIME type inconsistente

### Problema
A validação de upload em `Sources.tsx` usa apenas o MIME type do arquivo (`f.type`). Em muitos sistemas operacionais, arquivos `.doc` são reportados pelo navegador com MIME types inconsistentes como `application/octet-stream` ou string vazia, em vez de `application/msword`. Isso faz com que o filtro rejeite o arquivo mesmo sendo um formato válido.

### Solução
Adicionar validação por **extensão de arquivo** como fallback quando o MIME type não bate. Se o arquivo tiver uma extensão aceita (`.pdf`, `.txt`, `.docx`, `.doc`), deve ser permitido mesmo que o MIME type seja genérico.

### Alteração

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Sources.tsx` | Alterar a função de filtro em `handleUpload` (linha 87) para aceitar arquivos tanto por MIME type quanto por extensão do nome do arquivo. |

### Código atual (linha 87)
```typescript
const validFiles = Array.from(uploadFiles).filter((f) => ACCEPTED_TYPES.includes(f.type));
```

### Código corrigido
```typescript
const ACCEPTED_EXT_LIST = ["pdf", "txt", "docx", "doc"];

const validFiles = Array.from(uploadFiles).filter((f) => {
  if (ACCEPTED_TYPES.includes(f.type)) return true;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXT_LIST.includes(ext);
});
```

Isso garante que `.doc` (e outros formatos) sejam aceitos independentemente do MIME type reportado pelo navegador.

