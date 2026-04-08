

## Preencher metadados automaticamente na Etapa 1

Adicionar upload de PDF / colar texto na Etapa 1 do wizard para que os campos de metadados sejam preenchidos automaticamente via IA, mantendo o layout de 4 etapas.

### Fluxo

1. Usuário faz upload de PDF ou cola texto na Etapa 1
2. Sistema extrai texto do PDF (client-side via `pdfExtractor`) ou usa o texto colado
3. Chama uma nova edge function `extract-metadata` que usa Lovable AI para extrair apenas título, órgão, modalidade, valor e descrição
4. Campos do formulário são preenchidos automaticamente (editáveis pelo usuário)
5. Etapa 2 já terá o arquivo/texto pré-selecionado

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/wizard/StepDocumentData.tsx` | Adicionar área de upload/colar texto no topo do formulário. Ao enviar arquivo ou colar texto, dispara extração de metadados. Mostra loading enquanto IA processa. Campos são preenchidos automaticamente mas permanecem editáveis |
| `src/pages/NewDocument.tsx` | Passar `file`, `text`, `onFileChange`, `onTextChange` para StepDocumentData. Quando avançar para Etapa 2, arquivo/texto já estarão preenchidos |
| `supabase/functions/extract-metadata/index.ts` | **Nova** edge function leve que recebe texto (até 5000 chars) e retorna apenas `{title, agency, modality, estimated_value, description}` via tool calling. Usa `gemini-2.5-flash-lite` para ser rápida e barata |

### Detalhes técnicos

**StepDocumentData** receberá props adicionais (`file`, `text`, `onFileChange`, `onTextChange`) e terá:
- Tabs "Upload de Arquivo" / "Colar Texto" no topo (mesmo padrão da Etapa 2)
- Quando arquivo PDF é selecionado: extrai texto client-side → envia primeiros 5000 chars para `extract-metadata` → preenche campos
- Quando texto é colado: envia primeiros 5000 chars para `extract-metadata` → preenche campos
- Indicador de loading "Extraindo dados..." enquanto IA processa
- Campos preenchidos ficam editáveis para correção manual

**Edge function `extract-metadata`**: versão simplificada do `process-document`, sem RAG, sem regras, sem alertas. Apenas extrai metadados do texto usando tool calling com `gemini-2.5-flash-lite`.

**Etapa 2 (StepDocumentContent)**: continua existindo mas já mostrará o arquivo/texto selecionado na Etapa 1, permitindo alterar se necessário.

