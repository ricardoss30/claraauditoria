

## Corrigir erro de tamanho máximo no upload de documentos

O bucket `documents` tem limite de 50MB. O arquivo enviado excede esse limite.

### Alterações

1. **Migration SQL** — Aumentar limite do bucket `documents` para 600MB:
   ```sql
   UPDATE storage.buckets SET file_size_limit = 629145600 WHERE id = 'documents';
   ```

2. **`src/hooks/useDocumentUpload.ts`** — Adicionar validação client-side antes do upload:
   - Verificar se o arquivo excede 600MB
   - Exibir mensagem clara: "O arquivo excede o tamanho máximo de 600MB"

3. **`src/components/DocumentUploadDialog.tsx`** — Atualizar texto de referência de "20MB" para "600MB" na área de drag-and-drop.

