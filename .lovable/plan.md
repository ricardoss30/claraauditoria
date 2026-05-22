## Reavaliação do workflow CLARA Fase 2 (versão `d3192b29`, 22/05 14:54)

Inspeção feita nó a nó via MCP do n8n. Os ajustes pendentes da rodada anterior foram aplicados.

### Fluxo (linear, sem branches mortas)

```text
Webhook (POST /claraauditoria)
  → Filtro de Dados  (mapeia body.fileUrl/fileName/title)
    → EXTRAÇÃO_PDF   (Mistral OCR — agora via Credential)
      → Extract from File1
        → Code in JavaScript (concatena markdown das páginas)
          → finalText  (injeta OCR + audit_criteria + rule_ids + metadados)
            → Clara    (GPT-4o + RAG + memória)
              → Information Extractor  (text = $json.output)
                → Respond to Webhook   (JSON.stringify($json.output))
```

### Conferência por item

| # | Item | Status | Evidência no nó |
|---|------|--------|-----------------|
| 1 | Fluxo linear, sem Switch/If | ✅ | `connections` segue Webhook→Filtro→OCR→…→Respond |
| 2 | Critérios, regras e metadados no prompt | ✅ | `finalText.text` referencia `audit_criteria`, `analysis_rule_ids`, `risk_rule_ids`, `title`, `agency`, `modality`, `estimated_value`, `published_at` |
| 3 | `Respond to Webhook` devolve JSON limpo | ✅ | `responseBody: ={{ JSON.stringify($json.output) }}` |
| 4 | Information Extractor usa output correto | ✅ | `text: ={{ $json.output }}` |
| 5 | Chave Mistral fora do JSON | ✅ | `authentication: genericCredentialType` (HTTP Header Auth) |
| 6 | Schema do Information Extractor bate com a edge function | ✅ | `risk_score`, `summary`, `extracted_data{...}`, `alerts[{alert_type,title,severity,evidence,criteria,review_notes}]` |

### Pendência menor (não bloqueia funcionamento)

**System prompt do nó `Clara` ainda contém uma instrução incoerente:**

```
## Tarefa
1. leia o PDF de file_url.
```

Nesse ponto o agente já recebe o **texto OCR** via user message (campo `texto_edital`/`EDITAL`), não uma URL. Manter "leia o PDF de file_url" pode induzir o modelo a tentar buscar uma URL inexistente e a alucinar.

**Correção sugerida (trocar o passo 1):**
```
1. Use o texto fornecido em "EDITAL (texto OCR)" como fonte única de análise — não tente acessar URLs.
```

### Higiene fora do workflow

- **Revogar no console Mistral** a chave antiga `OJvNM4pv8LyOs8PZVAl9uRqN1TCLKvdm` (exposta em versões anteriores do JSON), mesmo que agora esteja via Credential.
- **Workflow Etapa 1** (`/claraauditoriatitulo`, extração de metadados a partir do título) — não faz parte deste workflow; precisa ser verificado separadamente se for o caso.

### Validação end-to-end

Tudo no contrato Webhook → Edge Function (`n8n-process-document`) está casado. Para confirmar em produção, suba um documento novo pelo wizard e me peça para conferir `procurement_documents.risk_score` + `risk_alerts` + logs da edge function.

### Conclusão

O workflow está **funcionalmente conforme** o sistema CLARA. Resta apenas o ajuste cosmético no system prompt (passo 1) e a rotação da chave Mistral antiga. Posso aplicar o ajuste no prompt assim que você mudar para build mode — ele é feito direto no n8n, não no código do projeto.
