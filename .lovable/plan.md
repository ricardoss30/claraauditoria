

## Problem Analysis

The multi-part PDF processing flow is broken. Here's what happens:

1. Client-side text extraction fails (scanned PDF, <100 chars extracted)
2. `needsMultiPart = true` — PDF is split into ~30-page chunks via `pdf-lib`
3. Each chunk is uploaded to storage with its own path (e.g., `uuid.pdf`)
4. Edge function is called with `content: "[Arquivo PDF: parte1.pdf]"` and `document_id`
5. **Bug**: Edge function sees `[Arquivo PDF:` prefix → triggers extraction → looks up the **document's** `file_url` from the database → finds the **original 275MB file** → tries to OCR it → fails (empty response from Gemini)

The edge function never knows about the part files. It always falls back to the main document's `file_url` (the original massive file).

## Solution

Pass each part's storage path to the edge function via a new `file_path` parameter, so it extracts from the small ~30-page chunk instead of the original 275MB file.

### Changes

**`supabase/functions/process-document/index.ts`**
- Accept optional `file_path` parameter in the request body
- In `extractPdfText`, use `file_path` (if provided) instead of querying the document's `file_url` from the database
- This way each part (~30 pages) gets OCR'd individually, well within Gemini's limits

**`src/hooks/useDocumentUpload.ts`**
- In `processMultiPart`, pass the uploaded part's storage path (`partPath`) to the edge function as `file_path`
- After all parts are processed, update the document's `raw_content` with combined text and set status to `processed` with the aggregate risk score

### Technical Detail

Edge function change (simplified):
```typescript
const { document_id, content, file_path, audit_criteria, ... } = await req.json();

// In extractPdfText, accept optional override path
async function extractPdfText(supabase, documentId, lovableApiKey, overrideFilePath?) {
  const fileUrl = overrideFilePath || (await getDocFileUrl(supabase, documentId));
  // ... rest of extraction using fileUrl
}
```

Upload hook change:
```typescript
// In processMultiPart, pass file_path
await supabase.functions.invoke("process-document", {
  body: {
    document_id: documentId,
    content: `[Arquivo PDF: ${parts[i].name}]`,
    file_path: partPath,  // NEW: tells edge function which file to OCR
    audit_criteria,
  },
});
```

