

## Solução: Extração de texto do PDF no navegador (client-side)

O problema raiz é que PDFs grandes (>20MB) não podem ser baixados na Edge Function por limite de memória, e o Gemini também tem limites para processar PDFs muito grandes via URL. Pedir para o usuário colar texto manualmente é inviável.

**A solução é extrair o texto do PDF diretamente no navegador** usando `pdfjs-dist` antes de enviar para o backend. O navegador não tem os mesmos limites de memória da Edge Function e pode processar PDFs grandes sem problemas.

### Fluxo revisado

```text
Usuário seleciona PDF
  → Browser extrai texto via pdf.js (client-side)
  → Upload do arquivo ao Storage (para referência)
  → Envia texto extraído + document_id à Edge Function
  → Edge Function analisa o texto (sem precisar baixar/processar o PDF)
```

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `package.json` | Adicionar dependência `pdfjs-dist` |
| `src/hooks/useDocumentUpload.ts` | Adicionar função `extractTextFromPdf(file)` que usa `pdfjs-dist` para extrair texto de todas as páginas do PDF no browser. Usar esse texto como `rawContent` em vez de `[Arquivo PDF: ...]` |
| `src/components/DocumentUploadDialog.tsx` | Adicionar step visual "Extraindo texto do PDF..." durante a extração client-side. Mostrar progresso por página |
| `src/hooks/useDocumentUpload.ts` | Novo step `"extracting_local"` para diferenciar extração local da extração server-side |

### Detalhes da extração client-side

1. Carregar o PDF com `pdfjs-dist` usando `getDocument(arrayBuffer)`
2. Iterar por todas as páginas (`pdf.numPages`)
3. Para cada página, chamar `page.getTextContent()` e concatenar os itens de texto
4. Se o texto extraído for muito curto (<100 chars), manter o fluxo atual (enviar para a Edge Function tentar OCR)
5. Se o texto for suficiente, enviar diretamente como `rawContent` — a Edge Function pula a extração de PDF

### Benefícios
- Funciona para PDFs de qualquer tamanho (o browser suporta)
- Elimina o problema de memória na Edge Function
- Extração é mais rápida (sem rede envolvida)
- Fallback para OCR server-side caso o PDF seja escaneado (sem texto extraível)

