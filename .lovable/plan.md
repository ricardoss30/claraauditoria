

## Fix: "Conteúdo Original" showing raw PDF metadata instead of readable text

### Problem
The raw-text fallback regex (`/[\x20-\x7E\xC0-\xFF]{10,}/g`) matches PDF internal structure strings like `/Filter /FlateDecode /Length...` as "readable" text. This prevents the OCR fallback from triggering, so the document stores garbage content.

The logs confirm: `Fallback text extraction: 990 characters` — those 990 chars are PDF metadata, not document text.

### Fix: `supabase/functions/process-document/index.ts`

Add a quality check after the raw-text fallback. If the extracted text contains PDF structural keywords (like `/Filter`, `/FlateDecode`, `/Length`, `/Type`, `/Page`), treat it as non-readable and fall through to OCR.

```text
unpdf fails → raw fallback extracts text → quality check detects PDF metadata → skip to OCR → real text extracted
```

Specifically:
- After line 46, check if the "readable" text is actually PDF internals by counting occurrences of PDF markers (`/Filter`, `/FlateDecode`, `/Length`, `/Type /Page`, `/obj`, `endobj`)
- If PDF markers represent a significant portion of the matches, discard the text (`text = ""`) so OCR triggers
- This ensures the already-working OCR path handles scanned/protected PDFs properly

### Reprocess existing document
The already-stored document has bad `raw_content`. The fix only helps future uploads. To fix the existing document, the user will need to re-upload or reprocess it.

Redeploy the `process-document` edge function after the change.

