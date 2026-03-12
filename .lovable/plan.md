
Diagnóstico confirmado (com evidências):
- A requisição de reprocessamento está enviando `content` já corrompido no body (começando com `/Filter /FlateDecode ...`), então a edge function não entra no fluxo de extração do PDF/OCR.
- Logs da função mostram `Keyword ranking with terms: filter, flatedecode...`, provando que o texto analisado ainda é metadado de PDF.
- No banco, `procurement_documents.raw_content` do documento continua com marcadores de PDF.

Causa raiz:
- `DocumentDetail` chama `reprocess(id, doc.raw_content)`.
- `useDocumentUpload.reprocess` repassa esse conteúdo para `process-document`.
- Em `process-document`, extração do arquivo só ocorre quando `content` está vazio ou com placeholder `[Arquivo PDF: ...]`. Como chega texto “não vazio” (mas ilegível), o OCR não é acionado.

Plano de ajuste (implementação):
1) Frontend: forçar reextração ao reprocessar PDF
- Arquivo: `src/pages/DocumentDetail.tsx`
- Alterar `handleReprocess` para:
  - se `doc.file_url` existir: reprocessar com placeholder de PDF (não com `doc.raw_content`);
  - se não houver `file_url`: manter reprocessamento com texto atual.
- Benefício: ativa imediatamente o fluxo de extração/OCR para documentos em Storage.

2) Hook de upload: suportar “reprocessamento forçado”
- Arquivo: `src/hooks/useDocumentUpload.ts`
- Ajustar `reprocess` para aceitar um modo/flag de reextração (ex.: `forcePdfExtraction`), enviando payload apropriado para `process-document`.
- Manter compatibilidade com documentos de texto puro.

3) Backend: blindagem para não reutilizar conteúdo ilegível
- Arquivo: `supabase/functions/process-document/index.ts`
- Adicionar validação do `rawContent` de entrada (mesma lógica de marcadores PDF já usada no fallback).
- Se detectar conteúdo com padrão de metadados PDF e houver arquivo no Storage, ignorar `rawContent` e extrair novamente do PDF (com OCR fallback).
- Isso evita regressão mesmo se algum cliente voltar a mandar conteúdo corrompido.

4) Cache: evitar resposta antiga em reprocessamento forçado
- Ainda em `process-document`, incluir um sinal explícito no payload (ex.: `force_reextract`) para pular retorno de cache quando necessário.
- Assim o usuário realmente obtém nova extração.

5) Validação pós-implementação
- Reprocessar o documento atual.
- Confirmar no “Conteúdo Original” ausência de tokens como `/Filter`, `/FlateDecode`, `/obj`.
- Conferir logs com mensagens de extração real (placeholder detectado / OCR acionado quando necessário).
- Validar que documentos de texto colado continuam funcionando sem regressão.

Resultado esperado:
- “Conteúdo Original” passa a mostrar texto legível após reprocessar PDFs escaneados/protegidos.
- O fluxo fica resiliente tanto no cliente quanto no backend.
