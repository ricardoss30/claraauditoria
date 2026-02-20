

## Corrigir Extração de Texto do PDF - unpdf retorna array

### Problema

Os logs mostram o erro:
```
TypeError: extractedText?.trim is not a function
```

A função `extractText` da biblioteca `unpdf` retorna `{ text: string[] }` (um array de strings, uma por página), mas o código trata como se fosse uma string única e tenta chamar `.trim()` nela.

### Solução

Alterar uma única linha na função `extractPdfText` em `supabase/functions/process-document/index.ts`:

**Antes:**
```typescript
const { text: extractedText } = await extractText(new Uint8Array(arrayBuffer));
const text = extractedText?.trim() || "";
```

**Depois:**
```typescript
const { text: extractedText } = await extractText(new Uint8Array(arrayBuffer));
const text = Array.isArray(extractedText) ? extractedText.join("\n").trim() : (extractedText || "").toString().trim();
```

Isso junta todas as páginas com quebra de linha e depois aplica o `.trim()`.

### Arquivo alterado

- `supabase/functions/process-document/index.ts` (linhas 31-32 da função `extractPdfText`)

