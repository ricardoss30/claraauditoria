## Diagnóstico do workflow `CLARA Fase 2 - Analise Completa de Documentos`

Fluxo atual mapeado:

```text
Webhook (POST /claraauditoria)
  └─ Filtro de Dados (mapeia audit_criteria → message_webhook, file_url → body.fileUrl)
       └─ Switch
            ├─ saída "Site WebHook" → If ──┬─(true)─→ finalText → Clara
            │                              └─(false)→ Edit Fields → EXTRAÇÃO_PDF
            │                                          → Extract from File1
            │                                          → Code in JavaScript
            │                                          → finalText → Clara
            └─ saída "pdf"  →  ❌ NÃO CONECTADO (fluxo morre)
                              
Clara (agent) → Information Extractor → Respond to Webhook ❌ shape errada
```

### Problemas críticos (impedem o sistema CLARA de funcionar)

#### 1. ❌ "Respond to Webhook" devolve shape errada (CAUSA DA FALHA DA TELA)
Configuração atual:
```json
{ "myField": "{{ $json.output[0].text }}" }
```
A edge function `n8n-process-document` faz `JSON.parse(respText)` e procura por `result.risk_score`, `result.summary`, `result.extracted_data`, `result.alerts`. Como recebe `{ myField: "..." }`, todos os campos viram `undefined` → `risk_score = 0`, nenhum alerta gravado, `raw_content` vazio.

**Correção:** trocar para devolver o JSON do Information Extractor diretamente:
- `Respond With: JSON`
- `Response Body:` `={{ $json.output }}` (ou `={{ $json }}` se o Extractor expor as chaves no root)

#### 2. ❌ Saída "pdf" do Switch está desconectada
Quando o usuário envia apenas o PDF (sem `audit_criteria`), o Switch identifica corretamente a saída "pdf" — mas ela não vai a lugar nenhum. O workflow trava nesse fluxo e o webhook nunca responde → erro 502 no front (já visto antes).

**Correção:** ligar a saída "pdf" do Switch diretamente ao **Edit Fields** (que inicia o pipeline de OCR). Resultado:
```text
Switch
 ├─ "Site WebHook" → If (continua igual)
 └─ "pdf"          → Edit Fields → EXTRAÇÃO_PDF → ...
```

#### 3. ❌ Clara não recebe `audit_criteria` nem regras (`analysis_rule_ids` / `risk_rule_ids`)
O nó **Clara** é chamado com `text: {{ $json.text }}` — apenas o texto OCRizado. A edge function envia:
- `audit_criteria` (texto livre da Etapa 3 do wizard)
- `analysis_rule_ids` (regras de análise selecionadas)
- `risk_rule_ids` (regras de risco selecionadas)
- `title`, `agency`, `modality`, `estimated_value`, `published_at`, `description`

Nenhum desses dados chega ao prompt do agente — quebra o sistema híbrido (hybrid-rule-evaluation) e o filtro por critérios do auditor.

**Correção:** no nó **finalText** (ou novo Set antes do Clara), montar o user prompt incluindo:
```text
EDITAL (texto OCR):
{{ $json.textoCompleto }}

CRITÉRIOS DO AUDITOR:
{{ $('Webhook').item.json.body.audit_criteria }}

REGRAS DE ANÁLISE SELECIONADAS (IDs):
{{ $('Webhook').item.json.body.analysis_rule_ids }}

REGRAS DE RISCO SELECIONADAS (IDs):
{{ $('Webhook').item.json.body.risk_rule_ids }}

METADADOS CONHECIDOS:
- title: {{ $('Webhook').item.json.body.title }}
- agency: {{ $('Webhook').item.json.body.agency }}
- modality: {{ $('Webhook').item.json.body.modality }}
- estimated_value: {{ $('Webhook').item.json.body.estimated_value }}
- published_at: {{ $('Webhook').item.json.body.published_at }}
```

#### 4. ❌ System prompt do Clara referencia `{{ $json.file_url }}` que é undefined
No prompt: "analisar o edital recebido (PDF em `{{ $json.file_url }}`)". No ponto em que o Clara executa, `$json` vem do `finalText` e só contém `text`. Trocar referência para a expressão correta ou remover (o texto já vem OCRizado, o agente não precisa baixar o PDF).

#### 5. ⚠️ Chave da API Mistral hard-coded no nó EXTRAÇÃO_PDF
`Authorization: Bearer OJvNM4pv8LyOs8PZVAl9uRqN1TCLKvdm` exposta no JSON do workflow. Mover para um Credential do n8n (`HTTP Header Auth`).

#### 6. ⚠️ Condições do `If` confusas
O `If` está depois do Switch, recebendo só a saída "Site WebHook". A segunda condição (`body.fileUrl empty`) decide se vai para `finalText` (texto puro, sem PDF) ou `Edit Fields` (faz OCR). Com a correção do item 2 (Switch.pdf → Edit Fields direto), o `If` pode ser simplificado para apenas verificar se há `fileUrl` na branch "Site WebHook" — ou removido.

### Itens corretos (manter)

- ✅ Path do webhook: `ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoria` bate com a edge function.
- ✅ `responseMode: responseNode` correto.
- ✅ OCR via Mistral funciona bem para PDFs escaneados (faz sentido manter como fallback ao PDF.js do front).
- ✅ Agente Clara com GPT-4o + memória Postgres + Vector Store Supabase (base_conhecimento, manuais, regras_risco_analise) — alinhado com a memória do projeto (RAG System).
- ✅ Information Extractor com schema exemplo idêntico ao esperado pela edge function.

### Pontos não cobertos por este workflow

- O webhook `claraauditoriatitulo` (Etapa 1, extração de metadados) é um **outro workflow** — não está incluído neste. Verificar separadamente se ele existe e está ativo.

## Plano de correção

Como sou um agente Lovable, eu **não posso editar o workflow n8n diretamente**. O plano abaixo lista as alterações que o usuário precisa aplicar no n8n, na ordem:

1. **n8n → nó "Respond to Webhook"**
   - `Response Body` = `={{ $json.output }}`
   - Manter `Respond With: JSON`.

2. **n8n → conexão Switch**
   - Conectar a saída **"pdf"** do nó Switch ao nó **Edit Fields**.

3. **n8n → nó finalText (ou novo Set logo antes do Clara)**
   - Substituir o assignment `text` pelo template completo descrito no item 3 do diagnóstico (texto OCR + critérios + regras + metadados).

4. **n8n → nó Clara → systemMessage**
   - Remover/ajustar a referência a `{{ $json.file_url }}` (a partir de agora o agente recebe o texto pronto e não precisa baixar PDF).

5. **n8n → nó EXTRAÇÃO_PDF**
   - Mover a chave Mistral para um Credential `HTTP Header Auth` e selecionar em "Authentication".
   - Revogar a chave atual (`OJvNM4pv8...`) e gerar uma nova.

6. **(Opcional) Simplificar o `If`** depois que a saída "pdf" do Switch tiver caminho próprio — ou remover, deixando o roteamento todo no Switch.

### Mudanças no código Lovable

Nenhuma. O backend (`supabase/functions/n8n-process-document/index.ts`) já está preparado para o payload esperado — só precisa receber o JSON com a shape correta. Quando o item 1 for aplicado, a Etapa 4 do wizard volta a funcionar.

Opcionalmente, posso (em build mode) endurecer a edge function para também tolerar o wrapper `{ myField: "..." }` enquanto o n8n não é corrigido, parseando a string interna como JSON. Mas a correção definitiva é no n8n.

## Resumo

| # | Onde | Mudança | Impacto |
|---|------|---------|---------|
| 1 | n8n Respond to Webhook | Body = `{{ $json.output }}` | Destrava Etapa 4 (causa do 502/HTML) |
| 2 | n8n Switch | Conectar saída "pdf" → Edit Fields | Permite análise quando só PDF é enviado |
| 3 | n8n finalText | Incluir critérios, regras e metadados no prompt | Faz CLARA realmente usar regras selecionadas |
| 4 | n8n Clara prompt | Remover `{{ $json.file_url }}` undefined | Limpa instruções inválidas |
| 5 | n8n EXTRAÇÃO_PDF | Migrar chave Mistral p/ Credential | Segurança |
| 6 | n8n If | Simplificar/remover | Higiene de fluxo |
