

## Problema

O Supabase Storage rejeita chaves (paths) com espaços e caracteres acentuados. O nome "Manual de Jurisprudência/.emptyFolderPlaceholder" falha por conter espaço e "ê".

## Solução

Sanitizar o nome da pasta/arquivo antes de usar como path no Storage, convertendo espaços em hífens e removendo acentos. O nome original é preservado visualmente na listagem (o Storage retorna o nome salvo).

### Alterações

1. **`src/services/knowledgeBaseService.ts`** — Adicionar função `sanitizePath(name: string)` que:
   - Remove acentos via `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`
   - Substitui espaços por hífens
   - Remove caracteres especiais (mantém alfanuméricos, hífens, underscores, pontos, barras)
   - Converte para lowercase
   - Aplicar em `createFolder`, `uploadFile` e nos paths gerados

2. **`src/pages/Sources.tsx`** — Aplicar a mesma sanitização ao construir o path de upload, para que os caminhos fiquem consistentes.

### Detalhes técnicos

```typescript
function sanitizePath(input: string): string {
  return input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // remove acentos
    .replace(/\s+/g, "-")                                // espaços → hífens
    .replace(/[^a-zA-Z0-9\-_./]/g, "")                  // remove especiais
    .toLowerCase();
}
```

A sanitização é aplicada por segmento de path (cada parte entre `/`) para preservar a estrutura de diretórios. A função `createFolder` e `uploadFile` receberão paths já sanitizados, pois a sanitização ocorre no ponto de construção do path (no componente Sources e no service).

