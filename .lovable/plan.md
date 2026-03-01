

## Plano: Reestruturar dialogs de "Detalhes do Alerta"

### 1. Migração SQL — nova coluna `criteria`

```sql
ALTER TABLE risk_alerts ADD COLUMN criteria text;
```

### 2. `src/pages/DocumentDetail.tsx` — Dialog editável

- Adicionar estados: `criteriaValue`, `descriptionValue`, `evidenceValue`
- Inicializar todos ao abrir dialog (`openAlertDialog`)
- Reestruturar campos do dialog na ordem:
  1. **Critérios** — `Textarea` editável (campo `criteria`)
  2. **Achados** — `Textarea` editável (era "Descrição", campo `description`)
  3. **Evidência** — `Textarea` editável (campo `evidence`)
  4. **Recomendações** — `Textarea` editável (era "Notas de Revisão", campo `review_notes`)
- Atualizar mutation para salvar todos os 4 campos ao clicar nos botões de ação
- Manter botões Descartar / Em Revisão / Confirmar no footer

### 3. `src/pages/Alerts.tsx` — Somente visualização

- **Tabela**: remover botões CheckCircle e XCircle da coluna Ações, manter apenas Eye
- **Dialog**: mostrar os 4 campos (Critérios, Achados, Evidência, Recomendações) como texto read-only (sem Textarea)
- Remover botões de ação do `DialogFooter` (sem Descartar/Em Revisão/Confirmar)

### Arquivos alterados
- Nova migração SQL (coluna `criteria`)
- `src/pages/DocumentDetail.tsx`
- `src/pages/Alerts.tsx`

