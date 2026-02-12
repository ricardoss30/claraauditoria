

# Fase 4: Relatorios, Auditoria e Notificacoes

## Resumo

Com as fases 1-3 concluidas (autenticacao, dashboard, processamento de documentos com IA), esta fase foca em tornar o sistema mais completo para uso real: visualizacao de logs de auditoria, exportacao de relatorios, notificacoes por email para alertas criticos, e melhorias de UX.

---

## 1. Pagina de Auditoria (Audit Logs)

A tabela `audit_logs` ja existe no banco mas nao tem interface. Criar pagina `/audit`:

- **Tabela paginada** com colunas: acao, tipo de recurso, usuario, data/hora, IP, detalhes
- **Filtros**: por acao (create, update, delete), por tipo de recurso, por data
- **Busca**: por usuario ou recurso
- **Apenas admin/auditor** tem acesso
- **Registro automatico**: criar trigger ou logica na edge function para registrar acoes importantes (upload de documento, mudanca de status de alerta, criacao/edicao de regra)

---

## 2. Exportacao de Relatorios (CSV/PDF)

Adicionar botoes de exportacao nas paginas existentes:

- **Documentos**: exportar lista filtrada em CSV
- **Alertas**: exportar alertas com detalhes em CSV
- **Dashboard**: botao para gerar relatorio resumido (quantidade de documentos, alertas por categoria, score medio de risco)
- Usar geracao de CSV no frontend (sem dependencia externa)

---

## 3. Notificacoes por Email

Criar edge function `send-notification` para enviar emails quando:

- Um alerta de **severidade 4 ou 5** e gerado automaticamente
- Um documento muda para status **error**
- Usar Supabase integrado (ou Resend se configurado) para envio
- Configuracao de preferencias de notificacao na pagina de Settings

---

## 4. Melhorias de UX

- **Dark mode**: toggle na sidebar usando `next-themes` (ja instalado)
- **Responsividade mobile**: ajustar tabelas e layout para telas pequenas
- **Breadcrumbs**: navegacao contextual nas paginas de detalhe
- **Loading states aprimorados**: skeleton loaders mais fieis ao layout final
- **Confirmacao de acoes destrutivas**: AlertDialog antes de excluir regras, fontes ou descartar alertas

---

## 5. Edge Function para Registrar Auditoria

Criar edge function `log-audit` ou adicionar logica na `process-document` existente para:

- Registrar upload de documentos
- Registrar mudancas de status de alertas
- Registrar criacao/edicao/exclusao de regras
- Incluir user_id e IP quando disponivel

---

## Detalhes Tecnicos

### Arquivos a criar:

| Arquivo | Descricao |
|---|---|
| `src/pages/AuditLogs.tsx` | Pagina de logs de auditoria |
| `src/hooks/useAuditLogs.ts` | Hook para consulta de audit_logs |
| `src/hooks/useExport.ts` | Hook utilitario para exportacao CSV |
| `src/components/ThemeToggle.tsx` | Toggle de dark/light mode |
| `src/components/ExportButton.tsx` | Botao reutilizavel de exportacao |
| `supabase/functions/send-notification/index.ts` | Edge function de notificacao |

### Arquivos a modificar:

| Arquivo | Descricao |
|---|---|
| `src/App.tsx` | Adicionar rota `/audit` |
| `src/components/layout/AppSidebar.tsx` | Adicionar item "Auditoria" no menu |
| `src/components/layout/AppLayout.tsx` | Integrar ThemeProvider e dark mode |
| `src/pages/Dashboard.tsx` | Adicionar botao de exportar relatorio |
| `src/pages/Documents.tsx` | Adicionar botao de exportar CSV |
| `src/pages/Alerts.tsx` | Adicionar botao de exportar CSV |
| `src/pages/Settings.tsx` | Adicionar secao de preferencias de notificacao |
| `src/hooks/useAlerts.ts` | Adicionar logica de registro de auditoria nas mutacoes |
| `src/hooks/useRules.ts` | Adicionar logica de registro de auditoria |
| `supabase/config.toml` | Registrar edge function send-notification |
| `src/index.css` | Ajustes para dark mode |

### Fluxo de Notificacao:

1. Edge function `process-document` gera alerta com severidade >= 4
2. Apos inserir alerta, chama `send-notification` com dados do alerta
3. `send-notification` busca usuarios com role admin/gestor
4. Envia email com detalhes do alerta (titulo, documento, severidade, evidencia)

### Exportacao CSV:

- Funcao utilitaria que converte array de objetos em string CSV
- Download via Blob URL no navegador
- Sem dependencias externas necessarias

### Dark Mode:

- `next-themes` ja esta instalado
- Wrapper `ThemeProvider` no App.tsx
- Toggle na sidebar com icone sol/lua
- Classes Tailwind `dark:` para ajustes pontuais

