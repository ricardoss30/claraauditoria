

## Mover Exportação CSV para a Página de Detalhes do Documento

### O que será feito

1. **Remover o botão "Exportar CSV"** da página de listagem de documentos (`src/pages/Documents.tsx`)
2. **Adicionar um botão "Exportar CSV"** na página de detalhes (`src/pages/DocumentDetail.tsx`) que exporta os dados extraídos e os alertas do documento

### Detalhes Técnicos

**`src/pages/Documents.tsx`**
- Remover o import de `ExportButton` e `exportToCSV`
- Remover o componente `<ExportButton>` do header

**`src/pages/DocumentDetail.tsx`**
- Importar `ExportButton` e `exportToCSV`
- Adicionar botão ao lado dos botões "Download" e "Reprocessar"
- A exportação gerará um CSV com:
  - Dados extraídos: título, órgão, modalidade, valor estimado, prazo, descrição, status, risco
  - Alertas: título do alerta, descrição, severidade, status
- Tudo em um único arquivo CSV organizado por seções

