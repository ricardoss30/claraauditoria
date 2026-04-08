

## Fluxo de criação de documento em etapas (Wizard)

Transformar o dialog atual de "Novo Documento" em uma página dedicada com wizard de etapas, seguindo o padrão visual do projeto SPM (WizardStepper com círculos numerados e linha conectora).

### Etapas do Wizard

```text
  ①─────────②─────────③─────────④
Dados do    Conteúdo   Critérios  Processamento
Documento              de Auditoria
```

**Etapa 1 — Dados do Documento**: Título, Órgão, Modalidade, Valor Estimado, Data de Publicação, Descrição (campos que hoje ficam como "Documento sem título" e são preenchidos pela IA depois)

**Etapa 2 — Conteúdo**: Upload de PDF ou Colar Texto (mesma interface atual com drag-and-drop e tabs)

**Etapa 3 — Critérios de Auditoria**: Textarea para os critérios (já existe no dialog atual), com descrição explicativa

**Etapa 4 — Processamento**: Barra de progresso, status por etapa (extração, divisão, análise), resultado final com link para o documento

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/wizard/WizardStepper.tsx` | **Novo** — Componente copiado/adaptado do projeto SPM com círculos numerados, check em etapas concluídas, linha conectora |
| `src/pages/NewDocument.tsx` | **Novo** — Página dedicada com o wizard de 4 etapas, gerencia `currentStep` e formulários por etapa |
| `src/components/wizard/StepDocumentData.tsx` | **Novo** — Etapa 1: formulário com título, órgão, modalidade, valor estimado, data publicação |
| `src/components/wizard/StepDocumentContent.tsx` | **Novo** — Etapa 2: upload de arquivo ou colar texto (lógica extraída do DocumentUploadDialog) |
| `src/components/wizard/StepAuditCriteria.tsx` | **Novo** — Etapa 3: textarea de critérios de auditoria |
| `src/components/wizard/StepProcessing.tsx` | **Novo** — Etapa 4: progresso do processamento, exibe resultado e link para o documento |
| `src/App.tsx` | Adicionar rota `/documents/new` para `NewDocument` |
| `src/pages/Documents.tsx` | Botão "Novo Documento" navega para `/documents/new` em vez de abrir dialog |
| `src/hooks/useDocumentUpload.ts` | Ajustar para aceitar metadata (título, órgão, etc.) no `upload()` e usá-los ao criar o registro no banco |

### Detalhes técnicos

- O `WizardStepper` usa a mesma estrutura visual do projeto SPM: círculos com número/check, linha conectora, labels abaixo
- Na etapa 1, os campos são opcionais exceto Título (obrigatório), permitindo avançar sem preencher tudo
- Na etapa 2, validação exige arquivo ou texto antes de avançar
- Na etapa 3, critérios de auditoria são obrigatórios (como hoje)
- Na etapa 4, o `useDocumentUpload` é chamado e o progresso é exibido em tempo real
- Botões "Voltar" e "Próximo" em cada etapa, "Processar" na etapa 3 → avança para etapa 4
- O `DocumentUploadDialog` pode ser mantido para compatibilidade mas não será mais usado na listagem

