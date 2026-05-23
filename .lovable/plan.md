## Diagnóstico

Puxei o JSON do workflow `j4d43UZrYceItJ5z`. O nó `HTTP Request` (id `79243cd8...`) que chama `n8n-analysis-callback` está com dois problemas:

### Problema 1 — `document_id` vai com `=` extra (causa o 404)

Body atual do nó:
```json
={
  "document_id": "={{ $('Webhook').item.json.body.document_id }}",
  "result": {{ JSON.stringify($json.output) }}
}
```

No n8n, o `jsonBody` já começa com `=` (modo expressão). Quando você coloca **outro** `=` dentro da string (`"={{ ... }}"`), o n8n trata o `=` como literal e envia:

```
"document_id": "=f8239aee-b885-461c-aa9e-cd1844f2533e"
```

A edge function recebe esse UUID com `=` na frente, faz `.eq("id", "=f8239...")`, não encontra → retorna `404 "Documento não encontrado"`. É exatamente o erro que apareceu.

### Problema 2 — `x-callback-secret` está com o service_role JWT

O header `x-callback-secret` está com o mesmo valor do `Authorization` (JWT do service role). Isso **não** é o `N8N_CALLBACK_SECRET` configurado no Supabase. Quando o problema 1 for resolvido, o callback vai responder **401 Unauthorized** por causa desse mismatch.

Curiosamente o secret também não deveria ser o JWT — é um shared secret separado que vive em `Deno.env.get("N8N_CALLBACK_SECRET")`.

## Ações no n8n (workflow `j4d43UZrYceItJ5z`, nó `HTTP Request`)

1. **Trocar o body JSON** para (remover o `=` antes de `{{` em `document_id`):
   ```json
   ={
     "document_id": "{{ $('Webhook').item.json.body.document_id }}",
     "result": {{ JSON.stringify($json.output) }}
   }
   ```

2. **Trocar o header `x-callback-secret`** para o valor real do secret `N8N_CALLBACK_SECRET` (o que está cadastrado no Supabase em Settings → Functions). O ideal é guardá-lo em uma Credential do n8n e referenciar, em vez de hardcoded.

3. **Remover o header `Authorization`** — a função está com `verify_jwt = false`, não precisa de JWT. Manter o JWT do service role exposto no n8n é risco de segurança. Só o `x-callback-secret` + `Content-Type: application/json` bastam.

4. (Opcional) Mover a chave Mistral hardcoded no nó `EXTRAÇÃO_PDF` para uma Credential.

## Validação

Após os ajustes, subir um novo PDF de teste. O esperado:
- n8n responde 200 imediato no webhook inicial
- Ao final, `HTTP Request` retorna 200 do callback
- `procurement_documents.status` vira `processed`, `risk_score` é preenchido e `risk_alerts` são inseridos
- `audit_logs` recebe entrada `action: n8n_callback`

Se quiser, depois disso eu também posso adicionar um log mais detalhado no `n8n-analysis-callback` (logar `document_id` recebido) para facilitar diagnóstico futuro.

## Sem mudanças de código

Os ajustes são 100% no n8n. Nenhum arquivo do projeto precisa ser editado.
