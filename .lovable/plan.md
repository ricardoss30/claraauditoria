# Plano de melhorias — Pipeline de PDF grande (até 2 GB)

## 1. Criar bucket `pdf-chunks` (migration SQL)

Migration via `supabase--migration`:

- `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('pdf-chunks', 'pdf-chunks', true, 52428800, ARRAY['application/pdf'])`
- Políticas em `storage.objects` (bucket_id = 'pdf-chunks'):
  - SELECT público (anon + authenticated) — necessário para URL pública usada pelo Mistral OCR
  - INSERT / DELETE restritos: usamos `service_role` nas Edge Functions, que já bypassa RLS, então criaremos apenas a policy SELECT pública. INSERT/DELETE ficam exclusivos do service_role por padrão.

## 2. Criar Edge Function `pdf-splitter`

Arquivo novo: `supabase/functions/pdf-splitter/index.ts` com o código fornecido pelo usuário (download do PDF, split com `pdf-lib` em chunks de 150 páginas, upload em `pdf-chunks/chunks/{document_id}/chunk_N.pdf`, retorna array de URLs públicas).

Registrar em `supabase/config.toml`:
```
[functions.pdf-splitter]
verify_jwt = false
```

Deploy automático pelo Lovable. Sem secrets novos (usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existentes).

## 3. App web — verificação do payload

Já verifiquei `supabase/functions/n8n-process-document/index.ts` (linhas 122-138): o payload enviado ao webhook do n8n **já inclui** `document_id`, `file_url`, `file_name`, `title`, `agency`, `modality`, `estimated_value`, `published_at`, `description`, `audit_criteria`, `analysis_rule_ids`, `risk_rule_ids`.

E `src/hooks/useDocumentUpload.ts` já envia `document_id` ao invocar `n8n-process-document`.

**Nenhuma alteração necessária no app web.**

## 4. Limpeza automática de chunks em `n8n-analysis-callback`

Edit cirúrgico em `supabase/functions/n8n-analysis-callback/index.ts`: inserir, imediatamente antes do `return new Response(...)` final de sucesso (após o `audit_logs.insert`), o bloco try/catch de cleanup fornecido — `storage.from("pdf-chunks").list(chunks/{document_id})` + `.remove(paths)`, com erro tratado como warning. Não toco em parsing, unwrap, severity, alerts.

## Fora de escopo (confirmado)

- Não criar/alterar tabelas
- Não modificar as outras 12 Edge Functions
- Não alterar payload de retorno do callback
- Não tocar em RLS de tabelas existentes, auth ou system prompts

## Detalhes técnicos

```text
App web ──► n8n-process-document ──► n8n webhook
                                       │
                                       ▼
                            pdf-splitter (Edge Fn)  ── baixa PDF
                                       │             ── divide 150 pp
                                       ▼             ── salva pdf-chunks/
                            retorna [url1, url2, ...]
                                       │
                            n8n itera URLs ──► Mistral OCR ──► GPT-5 (CLARA)
                                                                    │
                                                                    ▼
                                                  n8n-analysis-callback
                                                  (salva + limpa chunks)
```

Após sua aprovação, executo os 3 itens (bucket + função + cleanup) em uma única passada.
