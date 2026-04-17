
## Diagnóstico
Do I know what the issue is? Sim.

O erro real não é mais o crash genérico da Edge Function. Agora há 3 problemas encadeados:

1. O backend já retorna uma mensagem útil, mas o frontend continua mostrando só `Edge Function returned a non-2xx status code`.
2. O splitter ainda divide por página fixa (`5 páginas`), e isso está gerando chunks de `10.2MB`, acima do novo teto de OCR (`8MB`).
3. O fluxo multipart está incompleto: `append_mode` é enviado pelo frontend, mas não é tratado na função, então mesmo quando passar a funcionar ele tende a sobrescrever dados/alertas da parte anterior.

Evidência confirmada nos logs da função:
- `Skipping OCR: file size 10.2MB exceeds OCR limit of 8MB`
- depois disso a função retorna erro descritivo de extração
- o frontend perde esse detalhe e exibe só o erro genérico

## Plano de correção

### 1. Corrigir a leitura de erro no frontend
**Arquivo:** `src/hooks/useDocumentUpload.ts`

- Criar um helper para tratar erros de `supabase.functions.invoke()`
- Quando o erro for HTTP, ler `await error.context.json()` e usar `body.error`
- Aplicar isso em:
  - upload normal
  - upload multipart
  - retry 429
  - reprocessamento

Resultado: a UI passa a mostrar a causa real em vez de `non-2xx`.

### 2. Trocar o splitter por um modo baseado em tamanho
**Arquivo:** `src/lib/pdfSplitter.ts`

- Remover a lógica fixa de “5 páginas por parte”
- Montar os chunks página a página, salvando partes com alvo de ~`5MB`
- Garantir folga abaixo do limite de OCR de `8MB`
- Se uma única página já passar do limite sozinha, retornar erro específico orientando dividir/comprimir manualmente

Resultado: PDFs escaneados deixam de gerar chunks grandes demais para OCR.

### 3. Acionar multipart antes
**Arquivo:** `src/hooks/useDocumentUpload.ts`

- Hoje o multipart só entra quando o arquivo original passa de `20MB`
- Ajustar a regra: se a extração local falhar/for insuficiente e o PDF estiver acima do limite seguro para OCR, usar multipart
- Manter os PDFs pequenos no fluxo simples

Resultado: arquivos escaneados entre `8MB` e `20MB` também entram no caminho seguro.

### 4. Consertar o fluxo multipart no backend
**Arquivo:** `supabase/functions/process-document/index.ts`

- Ler e tratar `append_mode`
- Em multipart:
  - concatenar `raw_content`
  - preservar/acumular alertas das partes anteriores
  - manter `risk_score` como o maior valor entre as partes
- Opcionalmente retornar um código estável de erro para “chunk grande demais para OCR”

Resultado: o processamento em partes fica correto de ponta a ponta, não só “sem erro”.

### 5. Melhorar a mensagem da etapa 4
**Arquivo:** `src/components/wizard/StepProcessing.tsx`
**Opcional para consistência:** `src/components/DocumentUploadDialog.tsx`

- Atualizar a detecção de erro para reconhecer também a mensagem descritiva nova
- Exibir orientação clara quando o problema for tamanho/extração de PDF escaneado

Resultado: o usuário recebe instrução útil mesmo sem olhar logs.

## Arquivos que precisam mudar
- `src/hooks/useDocumentUpload.ts`
- `src/lib/pdfSplitter.ts`
- `supabase/functions/process-document/index.ts`
- `src/components/wizard/StepProcessing.tsx`
- `src/components/DocumentUploadDialog.tsx` (se quiser manter o mesmo comportamento no modal)

## Resultado esperado
- some o erro genérico `non-2xx`
- os chunks passam a respeitar o limite prático do OCR
- PDFs escaneados grandes conseguem processar
- multipart deixa de sobrescrever o que já foi analisado nas partes anteriores
