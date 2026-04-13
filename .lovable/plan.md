

## Fix: Suporte a arquivos maiores que 600MB (1GB+)

### Problema
O código atual tem um limite fixo de 600MB no client-side (linha 136 de `useDocumentUpload.ts`). Seu arquivo tem mais de 1GB, então o upload é bloqueado antes mesmo de tentar enviar.

### Solução

A abordagem mais eficiente para PDFs grandes e uma plataforma de auditoria: **extrair o texto no navegador primeiro, e fazer upload do arquivo usando Resumable Upload (protocolo TUS)** que o Supabase suporta nativamente para arquivos grandes.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useDocumentUpload.ts` | (1) Aumentar `MAX_SIZE` de 600MB para 2GB. (2) Para arquivos >50MB, usar upload resumable via protocolo TUS do Supabase (`supabase.storage.from("documents").uploadToSignedUrl()` ou `createSignedUploadUrl` + `tus-js-client`). (3) Mover a extração de texto (client-side) para **antes** do upload do arquivo ao Storage, de modo que se a extração funcionar, o conteúdo já está disponível e o upload do arquivo serve apenas como backup/referência. (4) Adicionar progresso de upload para arquivos grandes. |
| `src/lib/pdfSplitter.ts` | Nenhuma mudança necessária -- o splitting já funciona para PDFs grandes. |
| `package.json` | Adicionar `tus-js-client` para upload resumable de arquivos grandes. |

### Fluxo revisado para arquivos >50MB

```text
1. Extração de texto client-side (pdfjs-dist) ← já implementado
2. Se extração OK (>100 chars):
   → Upload resumable do PDF ao Storage (com progresso)
   → Criar documento com raw_content extraído
   → Processar normalmente via process-document
3. Se extração falhou (PDF escaneado):
   → Dividir PDF em partes (5 páginas cada) ← já implementado
   → Upload de cada parte separadamente
   → Processar multi-part ← já implementado
```

### Detalhes do Upload Resumable

O Supabase Storage suporta nativamente o protocolo TUS para uploads de arquivos grandes. Isso permite:
- Upload em chunks (não precisa carregar tudo na memória de uma vez)
- Retomada automática em caso de falha de rede
- Progresso de upload em tempo real

A configuração do bucket `documents` no Supabase Dashboard precisa ter o limite global de arquivo configurado para pelo menos 2GB (Settings > Storage > Global file size limit).

### Ação necessária do usuário

Antes da implementacao, voce precisa acessar o **Supabase Dashboard > Storage > Settings** e aumentar o **Global file size limit** para pelo menos 2GB, pois esse limite tem precedencia sobre o limite individual do bucket.

