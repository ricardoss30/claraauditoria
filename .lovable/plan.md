## Diagnóstico

O arquivo não aparece como execução no workflow porque ele está sendo bloqueado antes de entrar no n8n:

- Os logs da edge function mostram `n8n webhook error 413 Payload Too Large` retornado pelo Cloudflare do `n8n.cloud`.
- Isso significa que a requisição chega até a borda do n8n, mas é rejeitada por tamanho antes do Webhook criar uma execução.
- O workflow `C.L.A.R.A - Webhook Análise do Título` também não está configurado para usar o binário recebido em `data`: o nó `EXTRAÇÃO_PDF` chama a Mistral OCR com `document_url: {{ $json.body.fileUrl }}`.
- Portanto, o caminho atual de enviar o PDF inteiro como `multipart/form-data` para o n8n está incompatível com o limite do n8n Cloud e com o desenho atual do workflow.

## Plano de correção

1. **Parar de enviar o PDF inteiro para o n8n**
   - Alterar a etapa 1 para fazer upload temporário do PDF no Supabase Storage pelo navegador.
   - O n8n receberá apenas JSON leve com `file_url`, `file_name` e `mime_type`, evitando o erro `413 Payload Too Large`.

2. **Usar a edge function como orquestradora segura**
   - Alterar `extract-metadata-n8n` para receber JSON com o caminho do arquivo no Storage, não multipart.
   - Validar o JWT do usuário.
   - Gerar uma signed URL com validade suficiente para o OCR.
   - Enviar ao webhook do n8n um JSON compatível com o workflow atual:

   ```json
   {
     "file_url": "https://...signed-url...",
     "file_name": "PROCESSO...pdf",
     "mime_type": "application/pdf"
   }
   ```

3. **Ajustar o frontend da etapa 1**
   - Em `StepDocumentData.tsx`, quando o PDF for escaneado:
     - fazer upload para um caminho temporário em `documents/_tmp/<user_id>/<uuid>-arquivo.pdf`;
     - chamar a edge function com `{ file_path, file_name, mime_type }`;
     - manter os campos preenchidos pela resposta do n8n.
   - Não enviar mais o arquivo binário para a edge function/n8n.

4. **Preservar o arquivo até o OCR terminar**
   - Não apagar o arquivo temporário antes da resposta do n8n.
   - A edge function poderá limpar o `_tmp` somente depois de receber resposta do webhook, ou manter o arquivo temporariamente se houver timeout para não quebrar uma execução ainda em andamento.

5. **Manter o workflow n8n quase igual**
   - O workflow já espera `body.file_url` no nó `Filtro de Dados` e repassa para `body.fileUrl`.
   - O nó `EXTRAÇÃO_PDF` já usa `document_url`, então deve funcionar com a signed URL persistente.
   - Apenas recomendo remover credenciais/API keys expostas diretamente nos parâmetros do nó e usar credenciais do n8n, mas isso é uma melhoria de segurança separada.

6. **Melhorar mensagens de erro**
   - Se a edge receber `413`, mostrar mensagem clara: “Arquivo muito grande para envio direto; usando URL temporária”.
   - Se a Mistral não conseguir baixar a signed URL, retornar detalhes para distinguir URL expirada, arquivo apagado ou permissão.

7. **Validação**
   - Testar com o mesmo arquivo `PROCESSO 3408.2026 - LOCAÇÃO SÃO GERALDO.pdf`.
   - Confirmar nos logs que o n8n não retorna mais `413`.
   - Confirmar que o workflow cria execução e que o nó `EXTRAÇÃO_PDF` recebe uma URL acessível.

## Resultado esperado

O PDF deixa de ser bloqueado pelo Cloudflare/n8n por tamanho, o workflow volta a receber a chamada como JSON, e o nó `EXTRAÇÃO_PDF` passa a buscar o documento por signed URL enquanto o arquivo ainda existe no Storage.