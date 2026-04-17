

## Diagnóstico

A imagem mostra o erro na **Etapa 4 (Processamento)** do wizard. Os logs da edge function `process-document` revelam o problema real:

```
File size: 15.0MB, threshold: 20MB, isChunk: true
Attempting OCR via Gemini vision model...
CPU Time exceeded   ← ERRO
shutdown
```

### Causa raiz
O PDF é escaneado (não tem texto extraível), então o sistema cai no fallback de OCR via Gemini Vision. Enviar um chunk de **10–15MB** inteiro para o Gemini Vision em uma única chamada **estoura o limite de CPU** das edge functions Supabase (~150s wall / CPU bound). A função morre antes de responder, gerando o erro genérico "non-2xx status code".

Outros chunks menores no mesmo lote completaram com sucesso (5–12k caracteres extraídos), confirmando que o problema é específico de chunks grandes/pesados em OCR.

## Correção proposta

Reduzir agressivamente o trabalho que o OCR faz por chamada na edge function `process-document`:

### 1. Limite de tamanho para OCR
Em `process-document/index.ts`, antes de chamar o Gemini Vision, verificar o tamanho do PDF:
- **Se chunk > 8MB**: pular OCR neste chunk e registrar aviso no `processing_log` ("Chunk muito grande para OCR — divida o PDF em partes menores no upload").
- Manter o limite de 20MB apenas para PDFs com texto nativo.

### 2. Timeout explícito na chamada Gemini
Envolver o `fetch` para `ai.gateway.lovable.dev` em um `AbortController` com timeout de **90 segundos**. Se estourar, retornar erro tratável ao invés de matar a função inteira por CPU.

### 3. Reduzir `max_tokens` do OCR
Atualmente provavelmente alto. Limitar a `4096` por chunk reduz tempo de geração e custo de CPU.

### 4. Mensagem de erro útil no frontend
Em `StepProcessing.tsx`, quando a mensagem de erro contém "CPU Time" ou "non-2xx", exibir orientação:
> "O documento parece ser escaneado e muito grande. Tente dividir o PDF em arquivos menores (até 5MB cada) antes de enviar."

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-document/index.ts` | Skip OCR para chunks > 8MB; AbortController 90s no fetch Gemini; max_tokens reduzido |
| `src/components/wizard/StepProcessing.tsx` | Mensagem de erro mais clara para falhas de OCR |

Após a correção, redeploy automático da função `process-document`.

### Recomendação ao usuário (workaround imediato)
Enquanto a correção não é aplicada — ou se o PDF continuar muito pesado — divida o PDF original em arquivos de no máximo **5MB** usando ferramentas como iLovePDF/SmallPDF e envie-os separadamente.

