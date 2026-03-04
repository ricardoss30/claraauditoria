

## Issue: 429 Too Many Requests from PNCP API

The edge function logs clearly show that when "Todas" is selected, all 13 modality requests fire simultaneously via `Promise.all`, and the PNCP API rate-limits them with HTTP 429 responses. This means most results are silently dropped.

### Fix: Sequential fetching with delay

**`supabase/functions/import-pncp/index.ts`**

Replace the parallel `Promise.all` approach with sequential requests that include a small delay between each call to avoid rate limiting:

```typescript
// Instead of:
const promises = Array.from({ length: 13 }, (_, i) =>
  fetchSingleModality({ ...baseParams, codigoModalidadeContratacao: String(i + 1) })
);
const results = await Promise.all(promises);

// Use sequential with delay:
const allRaw: any[] = [];
for (let i = 1; i <= 13; i++) {
  const items = await fetchSingleModality({ ...baseParams, codigoModalidadeContratacao: String(i) });
  allRaw.push(...items);
  if (i < 13) await new Promise(r => setTimeout(r, 300)); // 300ms delay between requests
}
```

Also add retry logic in `fetchSingleModality` for 429 responses: wait 1 second and retry once.

### Scope
- Single file change: `supabase/functions/import-pncp/index.ts`
- Redeploy the edge function after the fix

