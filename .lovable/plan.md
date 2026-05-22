## Contexto e decisão

Suas respostas: arquivos de 500 MB – 1 GB, e este webhook (`C.L.A.R.A - Webhook Análise do Título`) precisa **apenas dos metadados de cabeçalho** (título, órgão, modalidade, valor estimado, data, descrição/objeto).

Esses campos sempre estão nas **páginas iniciais do edital** (capa, preâmbulo, item "DO OBJETO"). Não há motivo técnico nem de negócio para mandar 1 GB ao n8n só para ler a capa.

Sobre a opção "n8n baixa via Range/streaming" que você escolheu: ela só ajuda se o workflow do n8n for reescrito para ler o PDF em partes — o Lovable sozinho não consegue mudar isso, e mesmo com Range o n8n Cloud (Cloudflare) continuaria estourando timeout em arquivos enormes. **Como o escopo é só cabeçalho, a solução correta e que funciona dentro dos limites é fatiar no navegador antes de subir.**

Resumo: o navegador recorta as primeiras N páginas com `pdf-lib`, gera um PDF pequeno (~5–15 MB), faz upload desse recorte, e a Edge Function envia ao n8n exatamente como hoje. O arquivo original de 1 GB continua sendo salvo normalmente para o pipeline de análise de risco completo (que é outro fluxo, fora deste plano).

## O que vai mudar

```text
ANTES                                       DEPOIS
─────                                       ─────
Upload do PDF 1GB → Edge Function           Upload do PDF 1GB → guardado normal (pipeline de risco)
                  → signed URL              Recorte 1ªs 30 pgs (~5-15MB) → upload _tmp
                  → n8n (502 Bad Gateway)   → Edge Function → signed URL → n8n (OK)
```

## Detalhes técnicos

### 1. Frontend — `src/components/wizard/StepDocumentData.tsx`

- Adicionar dependência `pdf-lib` (já estamos usando libs de PDF no projeto, confirmar).
- Nova função `extractFirstPagesPdf(file: File, maxPages = 30): Promise<Blob>`:
  - Lê o `File` como `ArrayBuffer` em streaming (`file.slice` por trechos se necessário — `pdf-lib` aceita o buffer inteiro, mas para 1 GB pode estourar memória do browser; nesse caso ler o arquivo todo é inevitável para abrir o PDF, então fica como está).
  - **Plano B se 1 GB não couber em memória do browser:** usar `pdfjs-dist` (que já lida com PDFs grandes em streaming) para extrair as primeiras páginas em modo `range` e remontar com `pdf-lib`. Decisão na implementação.
  - Cria um novo `PDFDocument`, copia as primeiras `min(maxPages, total)` páginas e devolve um `Blob application/pdf`.
- Em `extractMetadataViaN8n(selectedFile)`:
  - Gerar o recorte: `const slice = await extractFirstPagesPdf(selectedFile, 30)`.
  - Fazer upload do recorte em `_tmp/<userId>/<uuid>-header-<safeName>` (ao invés do arquivo inteiro).
  - Chamar a Edge Function com o `file_path` do recorte, `file_name` original e `file_size` do recorte.
  - Remover o `setExtractionDone(true)` no caminho de 413, pois o caminho de 413 deixa de existir.
- Não tocar no upload do PDF completo usado em outras etapas do wizard / pipeline de risco.

### 2. Edge Function — `supabase/functions/extract-metadata-n8n/index.ts`

- Remover o bloqueio `MAX_N8N_BYTES = 100 MB` que adicionei no último ciclo (não é mais necessário, o frontend já manda recorte pequeno).
- Manter o resto igual: gera signed URL de 2h, envia payload duplicado ao n8n, parseia resposta.
- Manter logs de tamanho recebido para auditar que está chegando pequeno.

### 3. UX no wizard

- Toast informativo: "Analisando primeiras 30 páginas do edital para extrair metadados…" antes da chamada.
- Em caso de erro do n8n (502 transitório), manter o fallback amigável que já existe ("preencha manualmente"), sem travar o wizard.

## O que NÃO está neste plano

- Mudar o workflow do n8n para Range/streaming — exige editar lá, não no Lovable.
- Análise de risco/conformidade do PDF inteiro (cláusulas, anexos, planilhas). Esse pipeline continua usando o arquivo completo via o caminho atual (RAG/chunks) e deve ser tratado num plano separado quando você quiser revisitá-lo.

## Validação

1. Subir um PDF pequeno (~5 MB) → confirmar que ainda funciona (recorte vira o próprio arquivo).
2. Subir o PDF de 287 MB do teste anterior → confirmar que o recorte sobe em poucos segundos e o n8n responde 200 com metadados preenchidos.
3. Conferir logs da Edge Function: `file_size` recebido deve ser < 20 MB.
