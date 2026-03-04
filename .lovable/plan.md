

## Plan: Add City (Municipio) Filter to PNCP Import

The PNCP API `/v1/contratacoes/publicacao` does not support a direct municipality parameter. The municipality info is available in the response data (inside `unidadeOrgao` or `orgaoEntidade` objects). The solution is to add a text input filter and do server-side filtering after fetching from PNCP.

### Changes

**1. `src/pages/ImportPNCP.tsx`**
- Add a new `municipio` state (text input)
- Add an `Input` field labeled "Município" in the filter row (between UF and Modalidade)
- Pass `municipio` in the search params
- Add a "Município" column to the results table

**2. `src/hooks/useImportPNCP.ts`**
- Add `municipio?: string` to `PNCPSearchParams` interface
- Add `municipality: string` to `PNCPItem` interface

**3. `supabase/functions/import-pncp/index.ts`**
- Extract `municipio` from search params
- After fetching PNCP results, extract municipality name from each item's `unidadeOrgao.municipioNome` or `orgaoEntidade` data
- Include municipality in the mapped response items
- If `municipio` filter is provided, filter results case-insensitively by municipality name (partial match)

### Technical Note
Since filtering happens after the API call, filtered pages may return fewer than 20 items. This is a known trade-off since the external API doesn't support municipality filtering natively.

