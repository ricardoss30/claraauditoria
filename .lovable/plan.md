

## Corrigir menu "Regras" com submenus colapsáveis

O problema: "Regras de Risco" e "Regras de Análise" estão como itens soltos no menu principal (linhas 40-41), sem um menu pai "Regras". Precisam ficar como submenus de um grupo colapsável "Regras", igual ao padrão já usado em "Configurações".

### Alteração

| Arquivo | O que muda |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Remover "Regras de Risco" e "Regras de Análise" do array `mainItems`. Adicionar um bloco `Collapsible` com label "Regras" (ícone `Shield`) entre os itens do menu principal, contendo dois subitens: "Regras de Risco" (`/rules/risk`) e "Regras de Análise" (`/rules/analysis`). Usar `defaultOpen` baseado em `location.pathname.startsWith("/rules")`. Mesmo padrão visual do grupo "Configurações". |

### Resultado visual

```text
Menu Principal
  Dashboard
  Documentos
  Alertas
  ▸ Regras              ← grupo colapsável (novo)
      Regras de Risco
      Regras de Análise
  Tendências
  Relatórios
  Importar Editais
  Base de Conhecimento
  Auditoria
```

