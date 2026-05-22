## Reavaliação do workflow CLARA Fase 2 (versão 24dd9f87, 22/05 14:00)

### Fluxo atual (simplificado)

```text
Webhook (POST /claraauditoria)
  └─ Filtro de Dados (mapeia file_url, file_name, title, audit_criteria→message_webhook)
       └─ EXTRAÇÃO_PDF (Mistral OCR)
            └─ Extract from File1 (JSON binário)
                 └─ Code in JavaScript (concatena markdown das páginas)
                      └─ finalText (monta prompt com OCR + critérios + regras + metadados)
                           └─ Clara (Agent GPT-4o + RAG + memória)
                                └─ Information Extractor (GPT structured output)
                                     └─ Respond to Webhook
```

### O que foi corrigido ✅

1. **Switch e If removidos** → fluxo linear e claro, sem branches mortas.
2. **`Filtro de Dados` → `EXTRAÇÃO_PDF` direto** → resolve o problema da saída "pdf" do Switch que estava desconectada.
3. **`finalText` agora injeta no prompt do Clara**: texto OCR completo, `audit_criteria`, `analysis_rule_ids`, `risk_rule_ids` e os metadados (`title`, `agency`, `modality`, `estimated_value`, `published_at`). O agente passa a usar os critérios do auditor e as regras selecionadas. ✅
4. **Encadeamento Clara → Information Extractor → Respond to Webhook** está intacto.

### O que ainda precisa ser corrigido ❌

#### 1. ❌ CRÍTICO — `Respond to Webhook` continua devolvendo shape errada
Configuração atual (inalterada):
```json
{ "myField": "{{ $json.output[0].text }}" }
```
A edge function `n8n-process-document` espera o JSON da CLARA no root (`risk_score`, `summary`, `extracted_data`, `alerts`). Hoje recebe:
```json
{ "myField": "{\"risk_score\":72, \"summary\":\"...\", \"alerts\":[...]}" }
```
> **Observação**: na sessão anterior eu endureci a edge function para tolerar esse wrapper (faz unwrap automático de `myField`, `output`, `text` mesmo com `\`\`\`json` fences). Então o sistema deve funcionar mesmo sem corrigir esse nó. Porém, o ideal continua sendo entregar o JSON limpo.
>
> **Correção definitiva no n8n:**
> - `Response Body:` `={{ $json.output }}`
> - (ou) `={{ JSON.stringify($json.output) }}` se vier como objeto aninhado
>
> Após isso, posso reverter o unwrap na edge function.

Além disso, há um erro estrutural: `$json.output[0].text` assume que a saída do Information Extractor é um **array**. Os Information Extractors do n8n geralmente retornam o objeto direto em `$json.output`. Validar.

#### 2. ❌ Prompt do Clara ainda referencia `{{ $json.file_url }}`
No `systemMessage`:
> "analisar o edital recebido (PDF em `{{ $json.file_url }}`)"

Nesse ponto, `$json` é o resultado do `finalText` (só tem `text`). A expressão resolve para string vazia. Não quebra (o agente recebe o texto OCR via user prompt), mas é instrução errada no system prompt.

**Correção:** trocar por `{{ $('Webhook').item.json.body.file_url }}` ou simplesmente remover a frase, deixando claro no prompt que o texto do edital já vem pronto no user message.

#### 3. ❌ Chave Mistral hard-coded em `EXTRAÇÃO_PDF`
```
Authorization: Bearer OJvNM4pv8LyOs8PZVAl9uRqN1TCLKvdm
```
Continua exposta. **Ações:**
1. Criar Credential `HTTP Header Auth` no n8n com `Name=Authorization` e `Value=Bearer ...`.
2. No nó, mudar Authentication → "Generic Credential Type" → "HTTP Header Auth".
3. Remover a chave do JSON.
4. **Revogar a chave atual** no console Mistral e gerar nova.

#### 4. ⚠️ Edge case — requisição sem PDF
Com a remoção do Switch, qualquer chamada sem `file_url` quebra no `EXTRAÇÃO_PDF` (Mistral rejeita URL vazia). O wizard CLARA sempre envia `file_url`, então na prática não acontece — mas se houver intenção futura de aceitar análise de texto puro (sem PDF), precisará reintroduzir uma branch condicional.

#### 5. ⚠️ Webhook `claraauditoriatitulo` (Etapa 1)
Este workflow não cobre a extração de metadados do título (Etapa 1 do wizard). Verificar separadamente se existe outro workflow ativo respondendo em `…/claraauditoriatitulo`.

### Resumo

| # | Item | Status |
|---|------|--------|
| 1 | Switch/If removidos, fluxo linear | ✅ Feito |
| 2 | Critérios, regras e metadados no prompt | ✅ Feito |
| 3 | Respond to Webhook devolver JSON limpo | ❌ Pendente (mitigado na edge function) |
| 4 | Remover `{{ $json.file_url }}` do system prompt | ❌ Pendente |
| 5 | Mover chave Mistral para Credential e rotacionar | ❌ Pendente |
| 6 | Workflow de `claraauditoriatitulo` | ⚠️ Verificar à parte |

### Próximo passo proposto

Posso, em build mode, **rodar um teste real** chamando a edge function `n8n-process-document` com um document_id existente para verificar end-to-end se o workflow agora produz `risk_score`, `summary` e `alerts` corretamente (graças ao unwrap automático já em produção). Se passar, fica só pendente a higiene dos itens 3-6 acima.
