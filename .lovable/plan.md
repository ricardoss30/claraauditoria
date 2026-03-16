

## Diagnóstico: "Memory limit exceeded" na Edge Function

Os logs da Edge Function `process-document` mostram claramente:
```
Extracting text from storage PDF...
Memory limit exceeded
shutdown
```

O problema: a função baixa o PDF inteiro para memória (`fileData.arrayBuffer()`) e tenta extrair texto com `unpdf`. Edge Functions do Supabase têm limite de ~150MB de RAM. PDFs grandes estouram esse limite.

## Solução proposta

Modificar `supabase/functions/process-document/index.ts` para **não carregar o PDF inteiro em memória** quando o arquivo for grande. Em vez disso, usar diretamente o OCR via Gemini com uma URL assinada do Storage, evitando o download completo.

### Alterações em `supabase/functions/process-document/index.ts`

1. **Verificar o tamanho do arquivo antes de baixar** — Usar metadata do Storage ou HEAD request para obter o tamanho.

2. **Para arquivos grandes (>20MB)**: Pular o download + `unpdf`. Em vez disso:
   - Gerar uma URL assinada do Storage
   - Enviar a URL ao Gemini para extração de texto via OCR (o Gemini aceita URLs de PDF)
   - Isso evita carregar o PDF na memória da Edge Function

3. **Para arquivos pequenos (<=20MB)**: Manter o fluxo atual (download + `unpdf` + fallbacks).

4. **Fallback para OCR via base64**: Remover a conversão `btoa` para PDFs grandes (é isso que estoura a memória), usar apenas URL assinada.

### Fluxo revisado da função `extractPdfText`

```text
Arquivo no Storage
  ├── <= 20MB → download → unpdf → fallback regex → fallback OCR base64
  └── > 20MB  → URL assinada → Gemini OCR via URL (sem download)
```

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/process-document/index.ts` | Adicionar verificação de tamanho e caminho alternativo para PDFs grandes via URL assinada + Gemini |

