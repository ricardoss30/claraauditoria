## Contexto
Você aumentou o limite global do Supabase Storage para 5 GB. Com isso o erro `413 Maximum size exceeded` no TUS deve sumir para a maioria dos arquivos. Resta blindar o frontend para casos residuais e alinhar os limites exibidos ao usuário.

## Alterações propostas

### 1. `src/hooks/useDocumentUpload.ts`
- Aumentar `MAX_SIZE` de 2 GB → 5 GB (alinhar ao novo limite global).
- Tratar erro `413` / "Maximum size exceeded" também dentro do `uploadWithTus` (hoje só é tratado no upload simples). Mensagem PT-BR clara: "O arquivo excede o limite global de upload do Supabase Storage (5 GB). Reduza o arquivo ou aumente o limite no dashboard."
- Mensagem específica quando o erro vier do TUS com `response code: 413`.

### 2. `src/components/DocumentUploadDialog.tsx`
- Atualizar o hint de tamanho: "PDF ou texto (até 5 GB)".

### 3. `src/components/wizard/StepDocumentContent.tsx` (se exibir limite)
- Conferir e atualizar qualquer texto que mencione 2 GB para 5 GB.

## O que NÃO muda
- Fluxo `n8n-process-document` continua igual.
- TUS resumable continua sendo usado para arquivos > 50 MB.
- Nenhuma mudança de backend / edge function / banco.

## Resultado esperado
- Uploads de até 5 GB passam sem `413`.
- Se ainda assim estourar (arquivo > 5 GB ou config divergente), o usuário vê uma mensagem clara em vez do erro cru do `tus-js-client`.

## Arquivos afetados
- `src/hooks/useDocumentUpload.ts`
- `src/components/DocumentUploadDialog.tsx`
- `src/components/wizard/StepDocumentContent.tsx` (verificação)
