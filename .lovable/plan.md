

## Add OCR Support for Scanned PDFs

When `unpdf` and the raw-text fallback both fail to extract text, use the Lovable AI gateway's vision model (Gemini) to perform OCR on the PDF pages.

### Approach

Use the already-available `LOVABLE_API_KEY` with the Gemini vision model to extract text from the PDF. Send the PDF content as a base64-encoded data URL to the AI, which will perform OCR and return the extracted text. No new API keys or external services needed.

### Change: `supabase/functions/process-document/index.ts`

In the `extractPdfText` function (lines 39-55), after the raw-text fallback fails, add an OCR step:

1. Convert the PDF `arrayBuffer` to a base64 data URL
2. Call the Lovable AI gateway with `google/gemini-3-flash-preview` using an image content part (Gemini accepts PDF as image input)
3. Ask the model to extract all readable text from the document
4. Use the OCR result as the document content
5. If OCR also fails, throw the existing error suggesting manual text paste

The function signature changes to accept `lovableApiKey` as parameter (passed from the main handler where it's already available).

```text
extractPdfText flow:
  unpdf → raw text fallback → OCR via Gemini vision → error
```

Single file change, redeploy edge function.

