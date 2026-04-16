

## Adicionar suporte a arquivos .doc na Base de Conhecimento

### Problema
O upload na Base de Conhecimento (`Sources.tsx`) aceita apenas PDF, TXT e DOCX. Arquivos `.doc` (formato legado do Word) são rejeitados.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Sources.tsx` | Adicionar `"application/msword"` ao array `ACCEPTED_TYPES`, adicionar `.doc` ao `ACCEPTED_EXTENSIONS`, e atualizar a mensagem de erro e o texto da UI para incluir DOC. |

### Detalhes
- `ACCEPTED_TYPES`: adicionar `"application/msword"` (MIME type do `.doc`)
- `ACCEPTED_EXTENSIONS`: mudar de `".pdf,.txt,.docx"` para `".pdf,.txt,.docx,.doc"`
- Texto de erro: `"Apenas PDF, TXT, DOCX e DOC são aceitos."`
- Label de UI: `"PDF, TXT, DOCX, DOC"`

