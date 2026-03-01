

## Plano: Adicionar botões Eye, CheckCircle e XCircle na coluna Ações dos Documentos

Atualmente a coluna "Ações" na página de Documentos tem apenas o botão de excluir (Trash). O objetivo é adicionar os mesmos botões da página de Alertas: **Eye** (ver detalhes), e manter o **Trash** (excluir).

Nota: CheckCircle e XCircle da página de Alertas servem para mudar status de alertas (confirmed/dismissed) -- não se aplicam diretamente a documentos. O equivalente mais útil para documentos é o botão Eye para navegar aos detalhes.

### Mudanças em `src/pages/Documents.tsx`

1. Importar `Eye` do lucide-react
2. Ampliar coluna de ações para `w-[100px]`
3. Adicionar botão Eye ao lado do Trash, que navega para `/documents/:id` (mesmo comportamento do click na row, mas explícito)
4. Envolver os botões em `<div className="flex gap-1">`

