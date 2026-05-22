## Diagnóstico

O upload temporário para o bucket `documents` está funcionando e a Edge Function responde `200`, mas retorna campos vazios. Pelo workflow `C.L.A.R.A - Webhook Análise do Título`, o problema provável não é o token em si: tokens assinados do Supabase mudam a cada geração porque incluem `iat`, `exp` e o caminho do arquivo. O que mudou de forma relevante é que a função atual remove o arquivo temporário logo após o n8n responder. Como o n8n pode responder antes de o OCR/serviço externo terminar de buscar o `file_url`, o arquivo pode estar sendo apagado cedo demais ou a URL pode estar sendo enviada em um formato que o nó de OCR não consome corretamente.

Também identifiquei que o workflow espera campos aninhados como `body.fileUrl`/`body.fileName` após o primeiro filtro, enquanto a Edge Function envia `file_url`/`file_name` no corpo raiz. Embora parte do workflow tente mapear `$('Webhook').item.json.body.file_url`, há nós seguintes usando `body.fileUrl`, então vou tornar o payload compatível com ambos os formatos.

## Plano de correção

1. **Ajustar a Edge Function `extract-metadata-n8n`**
   - Manter o arquivo temporário disponível por mais tempo; remover o cleanup imediato `remove([file_path])`.
   - Gerar URL assinada com TTL maior, por exemplo 2 horas, para evitar expiração durante OCR/filas do n8n/Mistral.
   - Enviar payload redundante e compatível com o workflow:
     ```json
     {
       "file_url": "...",
       "fileUrl": "...",
       "file_name": "...",
       "fileName": "...",
       "mime_type": "application/pdf",
       "body": {
         "file_url": "...",
         "fileUrl": "...",
         "file_name": "...",
         "fileName": "..."
       }
     }
     ```
   - Adicionar logs seguros da função: caminho, nome, status do n8n e tamanho da resposta, sem imprimir o token completo.

2. **Ajustar o frontend em `StepDocumentData.tsx`**
   - Manter o upload temporário como está, mas melhorar a mensagem de erro quando a Edge Function retornar `200` com campos vazios.
   - Opcionalmente enviar também `file_size` para diagnóstico.

3. **Validar o fluxo**
   - Chamar a Edge Function com um payload semelhante ao último request para confirmar que a função chega ao n8n e retorna erro útil quando o arquivo não existe/expirou.
   - Depois da implementação, você testa novamente com o PDF real no app; a evidência esperada é uma execução nova no n8n e resposta preenchida ou erro explícito do OCR.

## Observação importante

A diferença entre o token antigo e o atual é esperada: cada URL assinada do Supabase gera um JWT novo. O ponto crítico é o valor interno `url` do token apontar para `documents/_tmp/...pdf` existente e acessível durante todo o processamento.