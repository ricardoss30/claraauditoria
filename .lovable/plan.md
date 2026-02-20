

## Adicionar Botao de Excluir Documentos

### O que sera feito

Adicionar um botao de exclusao em cada linha da tabela de documentos, com dialogo de confirmacao antes de excluir. A exclusao remove o documento do banco de dados, seus alertas associados e o arquivo do Storage.

### Alteracoes

**`src/pages/Documents.tsx`**
- Importar icone `Trash2` do lucide-react
- Importar componentes `AlertDialog` para confirmacao
- Adicionar coluna "Acoes" na tabela
- Adicionar botao de lixeira em cada linha (com `e.stopPropagation()` para nao navegar ao clicar)
- Adicionar estado para controlar o dialogo de confirmacao e o documento selecionado
- Implementar funcao `handleDelete` que:
  1. Deleta alertas associados (`risk_alerts` onde `document_id` = id)
  2. Remove o arquivo do bucket `documents` no Storage (se `file_url` existir)
  3. Deleta o documento da tabela `procurement_documents`
  4. Invalida a query para atualizar a lista
  5. Exibe toast de sucesso ou erro

**`src/hooks/useDocuments.ts`**
- Nenhuma alteracao necessaria (a invalidacao sera feita diretamente via `useQueryClient`)

### Detalhes Tecnicos

- A RLS ja permite que admins deletem documentos (`Admin can delete documents` - DELETE policy)
- Alertas (`risk_alerts`) nao tem policy de DELETE, entao sera necessario criar uma migration para permitir que admins deletem alertas associados
- A exclusao segue a ordem: alertas -> arquivo do storage -> documento (para evitar orfaos)
- O dialogo de confirmacao usa `AlertDialog` do shadcn/ui ja disponivel no projeto

### Migration SQL necessaria

Adicionar policy de DELETE na tabela `risk_alerts` para admins:

```sql
CREATE POLICY "Admin can delete alerts"
ON public.risk_alerts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
```
