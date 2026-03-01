

## Plano: Diff Visual entre Versoes do Prompt

### Abordagem

Implementar um diff visual inline (sem dependencias externas) que compara linha-a-linha a versao selecionada do historico com o valor atual salvo no banco. O diff sera exibido em um Dialog ao clicar em um botao "Comparar" em cada versao do historico.

### Implementacao

#### 1. Criar `src/lib/diff.ts`

Funcao utilitaria de diff linha-a-linha simples:
- Recebe dois textos (antigo e novo)
- Retorna array de `{ type: 'added' | 'removed' | 'unchanged', line: string }`
- Usa algoritmo LCS (Longest Common Subsequence) simplificado para identificar linhas adicionadas, removidas e inalteradas

#### 2. Criar `src/components/DiffViewer.tsx`

Componente que renderiza o resultado do diff:
- Linhas removidas com fundo vermelho claro e prefixo `-`
- Linhas adicionadas com fundo verde claro e prefixo `+`
- Linhas inalteradas com fundo neutro
- Fonte monoespacada, scroll vertical, numeracao de linhas
- Suporte a dark mode via classes Tailwind

#### 3. Atualizar `src/components/PromptManager.tsx`

- Adicionar estado `diffVersion` para a versao selecionada para comparacao
- Adicionar botao "Comparar" (icone `GitCompareArrows` do lucide) ao lado de "Restaurar" em cada item do historico
- Ao clicar, abrir um `Dialog` com:
  - Header: "Comparacao: [data da versao] vs Atual"
  - Corpo: `<DiffViewer oldText={versionValue} newText={savedPrompt} />`
  - Footer: botoes "Fechar" e "Restaurar esta versao"

### Arquivos
- `src/lib/diff.ts` (novo)
- `src/components/DiffViewer.tsx` (novo)
- `src/components/PromptManager.tsx` (editado)

