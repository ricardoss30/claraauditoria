## Substituir IA do Lovable pelo Webhook n8n no módulo Documentos

### Objetivo
Em todos os fluxos de processamento de Documentos (wizard "Novo Documento", diálogo de upload rápido e botão "Reprocessar"), parar de chamar `process-document` (Gemini via Lovable AI) e encaminhar arquivo + critérios para o webhook n8n. A resposta JSON do n8n alimenta o relatório existente.

### Webhook
- URL: `https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoria`
- Método: `POST`, `multipart/form-data`, público (sem auth header)

### Contrato (frontend → n8n)
Campos do `FormData`:
- `file` (binário) — arquivo original anexado (PDF/DOCX/TXT). Em modo "colar texto", enviar um `text/plain` gerado a partir do conteúdo.
- `document_id` (string UUID)
- `audit_criteria` (string)
- `title`, `agency`, `modality`, `estimated_value`, `published_at` (strings, opcionais — metadados do wizard)
- `analysis_rule_ids`, `risk_rule_ids` (JSON stringificado, opcionais)
- `mode` = `"new"` ou `"reprocess"`

### Contrato (n8n → frontend) — esperado
```json
{
  "risk_score": 0-100,
  "summary": "texto da análise",
  "alerts": [
    { "title": "...", "description": "...", "severity": "low|medium|high|critical" }
  ],
  "extracted_data": { ... }
}
```

### Arquitetura escolhida
Criar uma **nova edge function** `n8n-process-document` que:
1. Valida JWT do chamador (padrão das demais funções).
2. Baixa o arquivo do Storage (`documents` bucket) usando `file_url` recebido do frontend, ou recebe `raw_text` quando for modo texto colado.
3. Monta `FormData` e faz `POST` ao webhook n8n.
4. Recebe o JSON, persiste no Supabase:
   - `procurement_documents`: `status = 'processed'`, `risk_score`, `extracted_data` (merge), `raw_content` (se vier `summary`).
   - `risk_alerts`: insere cada alerta retornado, vinculado ao `document_id` e `created_by`.
5. Retorna `{ success, risk_score, alerts_count }` ao frontend (mesmo shape atual, para não quebrar `useDocumentUpload`).

**Por que edge function e não chamar direto do navegador:**
- Evita expor o usuário a CORS do n8n.
- Garante validação JWT e RLS (inserção de alertas precisa de service role).
- Centraliza tratamento de erro e auditoria (IP via `x-forwarded-for`).
- O upload pesado para o Storage continua direto do navegador (TUS) — a função só repassa o arquivo já no Storage.

### Mudanças por arquivo

| Arquivo | Mudança |
|---|---|
| `supabase/functions/n8n-process-document/index.ts` | **Novo.** Lê `document_id` + `file_path` (ou `raw_text`), baixa do Storage, faz multipart POST ao webhook, grava resultado em `procurement_documents` e `risk_alerts`. |
| `supabase/config.toml` | Registrar `n8n-process-document` com `verify_jwt = false` (validação manual em código, padrão do projeto). |
| `src/hooks/useDocumentUpload.ts` | Substituir todas as chamadas `supabase.functions.invoke("process-document", …)` por `"n8n-process-document"`. Remover lógica de chunking/multipart (n8n faz o OCR sozinho — envia o arquivo inteiro). Manter upload via TUS para arquivos grandes. Em `reprocess`, enviar `file_path` existente. |
| `src/components/wizard/StepProcessing.tsx` | Simplificar mensagens (sem "parte X/Y"). Remover dica de iLovePDF/OCR (não se aplica mais). |
| `src/components/DocumentUploadDialog.tsx` | Remover `splitProgress` e `multiPartProgress` da UI (deixar apenas upload + processamento). |

### Fluxo final
```
Wizard/Dialog
  → upload do arquivo ao Storage (direto do browser, TUS se >50MB)
  → INSERT em procurement_documents (status=pending)
  → invoke("n8n-process-document", { document_id, file_path, audit_criteria, metadata })
      ↓
Edge Function
  → download do arquivo do Storage
  → POST multipart ao webhook n8n
  → parse da resposta JSON
  → UPDATE procurement_documents (status=processed, risk_score, extracted_data)
  → INSERT em risk_alerts
  → retorna { success, risk_score, alerts_count }
      ↓
Frontend mostra "done" e navega para o relatório
```

### Itens removidos
- Chunking de PDF (`splitPdf`), extração local via `pdfExtractor`, fallback OCR Gemini, cache `text_analysis_cache`, RAG via `conhecimento_chunks` no fluxo de processamento. O n8n é responsável por todo o pré-processamento e análise.
- Arquivos `src/lib/pdfSplitter.ts` e `src/lib/pdfExtractor.ts` **permanecem** (podem ser usados em outros lugares como Knowledge Base), mas deixam de ser chamados em `useDocumentUpload`.

### Considerações
- **Timeout:** webhooks n8n podem demorar. A edge function fica aguardando a resposta síncrona. Se o n8n responder em >150s (limite da edge), precisaremos migrar para um modelo assíncrono (n8n callback → outra edge function). Para já, mantemos síncrono.
- **Tamanho:** edge functions Supabase aceitam até ~256MB de body, mas o repasse ao n8n também precisa caber. Para arquivos >100MB, considerar enviar URL assinada em vez de binário (decisão futura).
- **Função antiga `process-document`:** mantida no projeto, mas deixa de ser chamada. Não removo neste momento para permitir rollback rápido.
