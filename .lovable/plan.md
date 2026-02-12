

# Fase 3: Processamento de Documentos com Upload e Analise por IA

## Resumo

Implementar o fluxo completo de processamento de documentos de licitacao: upload de arquivos (PDF/texto), extracao automatica de dados estruturados via Lovable AI (Gemini), analise de risco baseada nas regras cadastradas, e geracao automatica de alertas.

---

## 1. Storage - Bucket para Documentos

Criar um bucket no Supabase Storage para armazenar os arquivos enviados:

- Bucket `documents` (privado) com politicas RLS para usuarios autenticados
- Upload permitido para admin/gestor
- Leitura permitida para todos autenticados

**Migracao SQL** para criar bucket e politicas de acesso.

---

## 2. Edge Function: `process-document`

Criar uma edge function que recebe o conteudo de um documento e usa Lovable AI para:

1. **Extrair dados estruturados** usando tool calling (nao JSON livre):
   - Titulo, orgao, modalidade, valor estimado, prazo, descricao
2. **Analisar riscos** contra as regras ativas do banco:
   - Sobrepeco: comparar valor com referencias
   - Direcionamento de marca: detectar mencoes a marcas
   - Prazo exiguo: verificar se prazo e inferior ao minimo legal
3. **Calcular score de risco** (0-100)
4. **Gerar alertas** automaticamente na tabela `risk_alerts`
5. **Salvar cache** da analise em `text_analysis_cache`

A edge function usara o modelo `google/gemini-3-flash-preview` via Lovable AI Gateway.

---

## 3. Frontend - Dialog de Upload

Adicionar botao "Novo Documento" na pagina de Documentos com dialog contendo:

- **Upload de arquivo** (PDF ate 20MB) com arrastar-e-soltar
- **Entrada manual de texto** (textarea) como alternativa ao upload
- **Campos opcionais**: titulo, orgao, modalidade (preenchidos automaticamente pela IA)
- **Barra de progresso** mostrando etapas: upload, extracao, analise, concluido
- **Feedback em tempo real** com status de processamento

---

## 4. Frontend - Pagina de Detalhes do Documento

Criar rota `/documents/:id` com visualizacao completa:

- **Dados extraidos**: titulo, orgao, modalidade, valor, prazo, descricao
- **Score de risco** com indicador visual
- **Lista de alertas** vinculados ao documento
- **Conteudo original** do documento (texto bruto)
- **Link para download** do arquivo original
- **Botao "Reprocessar"** para refazer a analise

---

## 5. Hook `useDocumentUpload`

Novo hook para gerenciar o fluxo de upload:

- Upload do arquivo para Supabase Storage
- Criacao do registro em `procurement_documents` com status `pending`
- Chamada a edge function `process-document`
- Atualizacao do status em tempo real (pending -> processing -> processed/error)
- Invalidacao do cache do react-query apos conclusao

---

## Detalhes Tecnicos

### Arquivos a criar:

| Arquivo | Descricao |
|---|---|
| `supabase/migrations/...` | Bucket de storage + politicas |
| `supabase/functions/process-document/index.ts` | Edge function de processamento com IA |
| `src/hooks/useDocumentUpload.ts` | Hook de upload e processamento |
| `src/components/DocumentUploadDialog.tsx` | Dialog de upload com progresso |
| `src/pages/DocumentDetail.tsx` | Pagina de detalhes do documento |

### Arquivos a modificar:

| Arquivo | Descricao |
|---|---|
| `src/pages/Documents.tsx` | Adicionar botao "Novo Documento" e link para detalhes |
| `src/App.tsx` | Adicionar rota `/documents/:id` |
| `supabase/config.toml` | Registrar a edge function |

### Fluxo de Processamento:

1. Usuario faz upload do arquivo ou cola texto
2. Arquivo salvo no Storage, registro criado com status `pending`
3. Edge function chamada com o conteudo do documento
4. Lovable AI extrai dados estruturados (tool calling)
5. Sistema compara dados contra regras ativas
6. Score de risco calculado, alertas criados
7. Documento atualizado para status `processed`
8. Interface atualiza automaticamente via react-query

### Modelo de IA:

- **Modelo**: `google/gemini-3-flash-preview` (default Lovable AI)
- **Abordagem**: Tool calling para extracao estruturada (nao JSON livre)
- **Gateway**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Chave**: `LOVABLE_API_KEY` (ja configurada automaticamente)

### Tratamento de Erros:

- Rate limit (429): toast informando para tentar novamente
- Creditos insuficientes (402): toast informando para adicionar creditos
- Falha na IA: documento marcado como `error` com mensagem no campo `extracted_data`
- Arquivo invalido: validacao no frontend antes do upload

