

## Alterar Exportação de CSV para PDF na Página de Detalhes

### O que será feito

1. **Criar uma função `exportToPDF`** em `src/hooks/useExport.ts` que gera um PDF formatado usando a API nativa do navegador (`window.print` com um iframe oculto), sem necessidade de bibliotecas externas
2. **Atualizar `DocumentDetail.tsx`** para usar `exportToPDF` em vez de `exportToCSV`
3. **Atualizar o label do `ExportButton`** para "Exportar PDF"

### Detalhes Técnicos

**`src/hooks/useExport.ts`**
- Adicionar uma função `exportToPDF` que:
  - Recebe os dados do documento e alertas
  - Cria um HTML formatado com tabelas estilizadas (dados extraídos + alertas)
  - Abre uma janela/iframe oculto com esse HTML e dispara `window.print()`, que permite salvar como PDF nativamente no navegador
  - Sem dependências externas necessárias

**`src/pages/DocumentDetail.tsx`**
- Substituir o import de `exportToCSV` por `exportToPDF`
- Alterar o `onClick` do `ExportButton` para chamar `exportToPDF` com os dados do documento e alertas
- Passar `label="Exportar PDF"` ao `ExportButton`

**Estrutura do PDF gerado:**
- Cabecalho com titulo do documento
- Secao "Dados Extraidos": tabela com orgao, modalidade, valor estimado, prazo, status, risco
- Secao "Alertas": tabela com titulo, descricao, severidade, status
- Formatacao limpa para impressao

