

## Bug: "Todas" Modalities Returns Empty Results

### Root Cause

In the `handleSearch` "all" modalities path (line 134-137), the `baseParams` passed to `fetchSingleModality` is missing the `pagina` parameter. The PNCP API requires `pagina` and returns an error when it's absent. Since `fetchSingleModality` silently returns `[]` on any error (line 102), all 13 parallel calls return empty arrays, resulting in zero items.

Evidence: Single modality path (line 168) explicitly sets `pagina` and works. The "all" path does not, and always returns empty.

### Fix

**`supabase/functions/import-pncp/index.ts`** - Add `pagina: "1"` to `baseParams` in the "all" modalities block (around line 137):

```typescript
const baseParams: Record<string, string> = {
  dataInicial,
  dataFinal,
  pagina: "1",
  tamanhoPagina: "20",
};
```

Also add logging inside `fetchSingleModality` to aid future debugging (log the URL and any non-ok status).

Redeploy the `import-pncp` edge function after the fix.

