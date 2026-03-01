

## Plano: Adicionar coluna de Ações nos alertas do DocumentDetail

A tabela de alertas na página de detalhes do documento (`DocumentDetail.tsx`) atualmente mostra apenas Alerta, Severidade e Status — sem coluna de ações. O objetivo é adicionar os mesmos botões da página principal de Alertas:

- **Olho (Eye)**: abrir dialog com detalhes do alerta + notas de revisão
- **CheckCircle**: confirmar alerta (mudar status para `confirmed`)
- **XCircle**: descartar alerta (mudar status para `dismissed`)
- Confirm/Dismiss só aparecem se `status === "pending"`

### Mudanças em `src/pages/DocumentDetail.tsx`

1. Importar `Eye`, `CheckCircle`, `XCircle` do lucide-react, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Textarea`, `toast` (sonner), e o hook `useAlerts` (para reutilizar `updateAlert`)
2. Adicionar estados: `selectedAlert`, `reviewNotes`
3. Adicionar coluna "Ações" no `TableHeader`
4. Adicionar `TableCell` com os 3 botões (Eye, CheckCircle condicionado a pending, XCircle condicionado a pending)
5. Adicionar o `Dialog` de detalhes do alerta (mesmo layout da página Alerts: tipo, severidade, status, data, descrição, evidência, notas de revisão, botões Descartar/Em Revisão/Confirmar)
6. Usar mutation direta do supabase para atualizar o alerta (ou importar `useAlerts` apenas para o `updateAlert`)

### Arquivo
- `src/pages/DocumentDetail.tsx`

