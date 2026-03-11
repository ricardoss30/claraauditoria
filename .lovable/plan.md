

## Add Audit Criteria Display to Document Detail

Add a new Card between "Dados Extraídos" and "Alertas" showing the audit criteria stored in `extracted_data.audit_criteria`.

### Change

**`src/pages/DocumentDetail.tsx`**
- After the "Dados Extraídos" Card (around line 200), add a new full-width Card titled "Critérios de Análise de Auditoria" that displays `extracted?.audit_criteria`
- Show a muted message if no criteria exist
- Use a `<pre>` with `whitespace-pre-wrap` styling (same pattern as "Conteúdo Original" section)
- Import `ClipboardCheck` icon from lucide-react for the card header

The card will render conditionally only when `extracted?.audit_criteria` has content, placed in a full-width row before the two-column grid of "Dados Extraídos" and "Alertas".

