

## Plan: Add "Todas" (All Modalities) Option to PNCP Import

Since the PNCP API requires `codigoModalidadeContratacao` as a mandatory parameter, fetching all modalities requires making parallel requests for each modality code and merging the results.

### Changes

**1. `src/pages/ImportPNCP.tsx`**
- Add a "Todas" option (value `"all"`) at the top of the modality `Select` dropdown
- Change default modality from `"6"` to `"all"`
- Remove the mandatory modality validation (since "all" is now valid)

**2. `supabase/functions/import-pncp/index.ts` — `handleSearch`**
- Remove the check that rejects missing `codigoModalidadeContratacao`
- If `codigoModalidadeContratacao` is `"all"` or absent:
  - Make parallel `fetch` calls for all 13 modality codes (1-13)
  - Merge all results into a single array
  - Sort by `dataPublicacaoPncp` descending
  - Apply municipality filter if provided
  - Pagination becomes client-side within the merged set (slice by page)
- If a specific modality is provided, keep existing single-call behavior

### Technical Notes
- Each parallel call uses `tamanhoPagina=20`, so up to 260 items may be fetched per search. This is acceptable for a filtered search with date range + UF constraints.
- Pagination for "all modalities" mode will be approximate since we aggregate across multiple API responses. Total pages will be calculated from the merged item count.
- Failed individual modality calls are silently skipped (some modalities may have zero results for a given period/UF).

