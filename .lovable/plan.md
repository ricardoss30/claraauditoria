

## Diagnóstico: Exclusão silenciosa sem efeito

O documento **não está sendo excluído** porque a política RLS da tabela `procurement_documents` só permite exclusão para usuários com role `admin`. O usuário logado provavelmente é **André (gestor)**, que não tem permissão de DELETE.

O problema no código: `supabase.from("procurement_documents").delete().eq("id", ...)` retorna sem erro mesmo quando 0 linhas são afetadas pelo RLS. O toast "Documento excluído com sucesso" aparece sem que nada tenha sido removido.

### Correções

1. **Migration SQL** — Adicionar política RLS para gestores poderem excluir documentos:
   ```sql
   CREATE POLICY "Gestor can delete documents"
   ON procurement_documents FOR DELETE TO authenticated
   USING (has_role(auth.uid(), 'gestor'));
   ```

2. **`src/pages/Documents.tsx`** — Verificar se a exclusão realmente aconteceu, checando o retorno do delete (contar linhas afetadas ou fazer select após delete) e exibir erro caso o documento não tenha sido removido.

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Política de DELETE para gestores |
| `src/pages/Documents.tsx` | Verificar resultado real da exclusão |

