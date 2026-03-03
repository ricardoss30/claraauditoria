

## Plano: Adicionar logo CLARA no PDF do relatório de auditoria

### O que será feito
Copiar a logo enviada para `public/images/clara-logo.png` e incluí-la no topo do HTML gerado pela função `handleExportPDF` em `AuditReport.tsx`. A logo será convertida para base64 inline no momento da exportação para garantir que apareça corretamente no PDF impresso.

### Implementação

**1. Copiar logo para o projeto**
- Salvar `user-uploads://Modelo_1_SEM_FUNDO.png` em `public/images/clara-logo.png`

**2. Editar `src/pages/AuditReport.tsx` — função `handleExportPDF`**
- Antes de gerar o HTML, fazer fetch da imagem e convertê-la para base64 (data URI)
- Inserir a logo centralizada acima do título `<h1>` no template HTML
- Adicionar estilos para a logo (centralizada, largura ~200px, margem inferior)

### Arquivos
- **Copiar**: logo para `public/images/clara-logo.png`
- **Editar**: `src/pages/AuditReport.tsx` (handleExportPDF)

