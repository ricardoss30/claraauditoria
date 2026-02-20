

## Corrigir Analise de PDFs - Extrair Conteudo Real do Arquivo

### Problema Identificado

Quando um PDF e enviado pelo upload, o sistema envia apenas o texto `[Arquivo PDF: nome.pdf]` para a IA, em vez do conteudo real do arquivo. A IA, sem conteudo real para analisar, acaba gerando resultados inventados baseados apenas no nome do arquivo.

O fluxo atual:
1. Cliente faz upload do PDF para o Storage (funciona)
2. Cliente envia `[Arquivo PDF: nome.pdf]` como conteudo para a edge function (problema)
3. A IA recebe esse placeholder e inventa uma analise (resultado incorreto)

### Solucao

Modificar a **edge function `process-document`** para que, quando o conteudo recebido for um placeholder de PDF, ela:
1. Busque o `file_url` do documento no banco de dados
2. Baixe o arquivo PDF do Supabase Storage
3. Extraia o texto do PDF usando uma biblioteca Deno
4. Use o texto real extraido para a analise da IA

### Arquivos Alterados

**`supabase/functions/process-document/index.ts`**
- Adicionar deteccao de conteudo placeholder (`[Arquivo PDF: ...]`)
- Buscar o `file_url` da tabela `procurement_documents`
- Baixar o PDF do bucket `documents` usando a API de Storage do Supabase
- Extrair texto do PDF usando a biblioteca `pdf-parse` (compativel com Deno via esm.sh)
- Atualizar o campo `raw_content` do documento com o texto real extraido
- Enviar o texto real extraido para a IA

**`src/hooks/useDocumentUpload.ts`**
- Pequeno ajuste: ao enviar um PDF, passar o placeholder de forma mais explicita para que a edge function saiba que precisa processar o arquivo do Storage

### Detalhes Tecnicos

Para extracacao de texto de PDF no Deno, sera usada a biblioteca `pdf-parse` via `esm.sh`. O fluxo na edge function ficara:

```text
1. Recebe document_id + content
2. Se content comeca com "[Arquivo PDF:" 
   -> Busca file_url do documento no banco
   -> Baixa o PDF do Storage via supabase.storage.from("documents").download(file_url)
   -> Extrai texto com pdf-parse
   -> Usa texto extraido como content
3. Envia content real para a IA
4. Atualiza raw_content no banco com o texto real
```

Isso garante que a IA sempre analise o conteudo real do documento, independente do formato do arquivo.
