

## Plano: Paginacao na Busca PNCP

O hook e a edge function ja suportam `totalPages` e `currentPage` nos resultados, e o parametro `pagina` nos params de busca. Falta apenas a UI de paginacao e a logica de navegacao entre paginas.

### Alteracoes

1. **`src/pages/ImportPNCP.tsx`**:
   - Adicionar estado `currentPage` para rastrear a pagina atual
   - Salvar os parametros de busca atuais para reutilizar ao mudar de pagina
   - Adicionar componente de paginacao (Anterior / paginas / Proximo) abaixo da tabela usando os componentes `Pagination*` existentes em `src/components/ui/pagination.tsx`
   - Ao clicar em uma pagina, chamar `searchMutation.mutate` com `pagina` atualizado
   - Resetar `currentPage` para 1 ao fazer nova busca

2. **Nenhuma alteracao na edge function ou hook** - ja suportam paginacao.

