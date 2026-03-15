

## Diagnóstico: Critérios de Auditoria na Seção 5

### Análise Realizada

1. **Código do template padrão** (`AuditReport.tsx` linha 82): Está correto — inclui `audit_criteria` de `doc.extracted_data` ao final da seção 5 (`contextualizacao`).

2. **Prompt da IA** (`generate-report/index.ts` linhas 102-105): Está correto — envia os critérios e instrui a IA a incluí-los na seção 5.

3. **Dados no banco**: O único documento existente (`5a0429f2-...`) **possui** `audit_criteria: "Utilize como base os critérios que estão na base de conhecimento."` em `extracted_data`.

4. **Relatórios salvos**: Nenhum relatório salvo na tabela `audit_reports`. Portanto, o template padrão deveria ser usado.

### Problema Identificado

O documento na URL atual (`/documents/97b58de5-...`) **não existe no banco de dados**. Isso significa que a tela do relatório mostra "Documento não encontrado" ou dados em cache do navegador. O documento real é `5a0429f2-57a9-4c29-86fc-6e1935c56910`.

### Conclusão

O código já está implementado corretamente. Não há alteração de código necessária. Para testar:

1. Navegue até o documento existente: `/documents/5a0429f2-57a9-4c29-86fc-6e1935c56910/report`
2. A seção 5 do template padrão já deve exibir os critérios
3. O botão "Gerar com IA" também deve incluir os critérios na seção 5

Se ao navegar ao documento correto os critérios **ainda** não aparecerem, farei uma investigação mais profunda.

