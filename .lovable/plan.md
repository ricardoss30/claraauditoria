

## Plan: Replace "Título" with "Critérios de Análise de Auditoria"

### Changes

**1. `src/components/DocumentUploadDialog.tsx`**
- Remove the "Título (opcional)" `Input` field
- Add a required "Critérios de Análise de Auditoria" `Textarea` field with helper text explaining the user should describe methodology and audit techniques
- Rename state from `title` to `auditCriteria`
- Disable submit buttons when `auditCriteria` is empty
- Pass `auditCriteria` to the upload hook instead of `title`

**2. `src/hooks/useDocumentUpload.ts`**
- Accept `audit_criteria` parameter in the `upload` function
- Store `audit_criteria` in the document's `extracted_data` JSONB field on insert
- Pass `audit_criteria` to the `process-document` edge function body

**3. `supabase/functions/process-document/index.ts`**
- Read `audit_criteria` from the request body
- Include audit criteria in the AI system/user prompt so the AI uses them as analysis parameters
- Store `audit_criteria` in `extracted_data` alongside other extracted fields

**4. `supabase/functions/generate-report/index.ts`**
- Read `audit_criteria` from `doc.extracted_data`
- Include the criteria in the user prompt, specifically instructing the AI to incorporate them into section "7. Constatações" (the `constatacoes` field)

### Data Flow

```text
Upload Dialog (user types criteria)
  → useDocumentUpload (stores in extracted_data + sends to edge fn)
    → process-document (uses criteria as AI analysis parameters)
    → generate-report (injects criteria into "Constatações" section)
```

### UI Preview
The dialog will show a `Textarea` labeled "Critérios de Análise de Auditoria *" with placeholder text like "Descreva a metodologia e técnicas de auditoria a serem aplicadas na análise deste documento..." replacing the old single-line title input. The submit buttons will be disabled until this field is filled.

