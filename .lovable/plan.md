

## Atualizar Relatório de Auditoria com base nos comentários do auditor

### Problema identificado

O relatório atual é **genérico demais**: usa siglas em vez de nomes completos, confunde metodologia com análise técnica, não incorpora os critérios do auditor adequadamente, menciona "edital" quando o documento é um Processo Administrativo, e apresenta constatações superficiais sem evidências detalhadas.

### Comentários catalogados do PDF

| Seção | Problema | Correção |
|-------|----------|----------|
| Capa | Usa sigla (SEDUC), falta nº do PA, fase, auditor | Nome completo do órgão, nº do processo, "Fase Interna", nome e matrícula do auditor |
| Introdução | Legislação genérica, não usa critérios do auditor | Objetivo e normas devem refletir os critérios inseridos pelo auditor |
| Metodologia | Confunde-se com análise técnica, menciona "edital" | Técnicas específicas ao caso, referir "Processo Administrativo" |
| Contextualização | Falta período, fiscal, gestor do contrato | Incluir dados contratuais completos |
| Análise Técnica | Genérica, menciona "edital" e "contrato" inexistentes | Análise específica ao tipo de documento |
| Constatações | Superficiais, sem evidência detalhada | Aprofundar achados com trechos do documento como evidência |
| Recomendações | Plano de Ação deveria fazer parte | Incorporar prazos e responsáveis nas recomendações |
| Anexos | Menciona "edital" inexistente | Listar critérios e evidências de auditoria |

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/generate-report/index.ts` | (1) Buscar perfil do auditor (nome) via `profiles` usando `created_by`. (2) Reescrever `systemPrompt` com instruções detalhadas contra genericidade. (3) Reescrever `userPrompt` incluindo nome do auditor, trecho do conteúdo do documento (`raw_content` truncado a 15000 chars) para evidências, e instruções explícitas por seção. (4) Atualizar descrições dos campos na tool/function para guiar a IA. (5) Renomear `plano_acao` → integrado nas recomendações (manter campo mas instruir IA a incluir prazos nas recomendações e usar plano_acao como complemento). |
| `src/pages/AuditReport.tsx` | Atualizar `SECTION_LABELS` para refletir novos títulos: "9. Recomendações de Auditoria", "10. Plano de Ação (integrado às Recomendações)", "12. Evidências de Auditoria". |

### Detalhes do novo prompt

**System prompt** — instruções rígidas:
- NUNCA usar siglas sem o nome completo
- NUNCA referir "edital" se o documento é um Processo Administrativo
- NUNCA usar frases genéricas como "conforme legislação vigente" sem citar o artigo específico
- Constatações devem incluir: Condição (o que foi encontrado), Critério (norma violada com artigo), Causa (por que ocorreu), Efeito (consequência), Evidência (trecho literal do documento)
- Metodologia deve descrever técnicas aplicadas ao caso específico, não procedimentos genéricos do sistema

**User prompt** — dados adicionais:
- Nome completo do auditor (da tabela `profiles`)
- Trecho do conteúdo do documento (`raw_content`) para a IA citar evidências textuais
- Critérios do auditor incorporados em TODAS as seções (não só contextualização e constatações)
- Instruções explícitas por campo da tool function

**Descrições atualizadas nos campos da tool**:
- `capa`: "Nome completo do órgão (sem siglas), nº do processo administrativo, fase (interna/externa), tipo de auditoria, auditor responsável com matrícula"
- `metodologia`: "Técnicas de auditoria aplicadas ESPECIFICAMENTE a este caso. NÃO descrever procedimentos do sistema. Diferenciar da análise técnica."
- `contextualizacao`: "Escopo de auditoria, critérios utilizados, período da contratação, fiscal e gestor do contrato quando aplicável"
- `constatacoes`: "Para cada achado: Condição, Critério (artigo específico), Causa, Efeito, Evidência (trecho literal do documento)"
- `recomendacoes`: "Recomendações de auditoria com prazos e responsáveis sugeridos (incorporar plano de ação)"
- `anexos`: "Lista enumerada de critérios aplicados e evidências de auditoria coletadas"

