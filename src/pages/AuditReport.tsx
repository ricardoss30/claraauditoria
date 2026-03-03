import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Edit3, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

interface ReportContent {
  capa: string;
  sumario: string;
  introducao: string;
  metodologia: string;
  contextualizacao: string;
  analise_tecnica: string;
  constatacoes: string;
  avaliacao_risco: string;
  recomendacoes: string;
  plano_acao: string;
  conclusao: string;
  anexos: string;
}

const SECTION_LABELS: Record<keyof ReportContent, string> = {
  capa: "1. Capa e Identificação",
  sumario: "2. Sumário",
  introducao: "3. Introdução",
  metodologia: "4. Metodologia",
  contextualizacao: "5. Contextualização da Situação Auditada",
  analise_tecnica: "6. Análise Técnica",
  constatacoes: "7. Constatações",
  avaliacao_risco: "8. Avaliação de Risco",
  recomendacoes: "9. Recomendações",
  plano_acao: "10. Plano de Ação Sugerido",
  conclusao: "11. Conclusão",
  anexos: "12. Anexos",
};

const SECTION_KEYS: (keyof ReportContent)[] = [
  "capa", "sumario", "introducao", "metodologia", "contextualizacao",
  "analise_tecnica", "constatacoes", "avaliacao_risco", "recomendacoes",
  "plano_acao", "conclusao", "anexos",
];

function generateDefaultContent(doc: any, alerts: any[]): ReportContent {
  const dateStr = new Date().toLocaleDateString("pt-BR");
  const valor = doc.estimated_value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(doc.estimated_value)
    : "Não informado";
  const prazo = doc.deadline_at ? new Date(doc.deadline_at).toLocaleDateString("pt-BR") : "Não informado";

  const confirmedAlerts = alerts.filter(a => a.status !== "dismissed");
  const constatacoesList = confirmedAlerts.map((a, i) =>
    `${i + 1}. ${a.title}\n   Achado: ${a.description || "—"}\n   Critério: ${a.criteria || "—"}\n   Evidência: ${a.evidence || "—"}`
  ).join("\n\n") || "Nenhuma constatação identificada.";

  const riskText = doc.risk_score != null
    ? `Score de Risco Geral: ${doc.risk_score}/100\n\n` +
      confirmedAlerts.map(a => `• ${a.title} — Severidade: ${a.severity}/5`).join("\n")
    : "Não avaliado.";

  const recomendacoesList = confirmedAlerts
    .filter(a => a.review_notes)
    .map((a, i) => `${i + 1}. ${a.title}: ${a.review_notes}`)
    .join("\n") || "Nenhuma recomendação registrada. Preencha conforme análise.";

  const sumarioItems = SECTION_KEYS.map((_, i) => `${i + 1}. ${Object.values(SECTION_LABELS)[i]}`).join("\n");

  return {
    capa: `RELATÓRIO DE AUDITORIA FISCAL\n\nEntidade Auditada: ${doc.agency || "Não informado"}\nDocumento: ${doc.title}\nModalidade: ${doc.modality || "Não informada"}\nTipo de Auditoria: Auditoria de Conformidade em Licitação\nPeríodo Auditado: ${doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "—"} a ${dateStr}\nData de Emissão: ${dateStr}`,

    sumario: sumarioItems,

    introducao: `Objetivo: Verificar a conformidade do processo licitatório "${doc.title}" com a legislação vigente, incluindo a Lei nº 14.133/2021 (Nova Lei de Licitações), a Lei nº 8.666/93, a Lei Complementar nº 101/2000 (LRF) e demais normativos aplicáveis.\n\nEscopo e Abrangência: A presente auditoria abrange a análise do edital, seus anexos, termos de referência e demais documentos relacionados ao processo de ${doc.modality || "licitação"} promovido pelo(a) ${doc.agency || "órgão"}.\n\nNormas e Critérios: Lei nº 14.133/2021, Lei nº 8.666/93, LC nº 101/2000, Decreto nº 10.024/2019 e normativos internos do órgão.`,

    metodologia: `Técnicas de auditoria utilizadas:\n• Exame documental do edital e anexos\n• Análise automatizada por Inteligência Artificial\n• Verificação de conformidade com base de conhecimento normativa\n• Cruzamento de dados com parâmetros de risco pré-definidos\n\nProcedimentos adotados:\n1. Upload e extração do conteúdo do documento\n2. Processamento por IA com regras de risco configuradas\n3. Identificação automática de alertas e inconformidades\n4. Revisão e validação pelo auditor responsável`,

    contextualizacao: `Descrição do Objeto Auditado:\n${doc.description || "Sem descrição disponível."}\n\nDados Relevantes:\n• Órgão/Entidade: ${doc.agency || "Não informado"}\n• Modalidade: ${doc.modality || "Não informada"}\n• Valor Estimado: ${valor}\n• Prazo/Data Limite: ${prazo}\n• Status do Processamento: ${doc.status}`,

    analise_tecnica: `A análise técnica foi conduzida mediante verificação automatizada e revisão manual dos seguintes aspectos:\n\n• Conformidade do edital com os requisitos legais obrigatórios\n• Adequação das cláusulas contratuais\n• Verificação de restrições indevidas à competitividade\n• Análise de preços e valores de referência\n• Verificação de prazos e condições de participação\n\nForam identificados ${confirmedAlerts.length} ponto(s) de atenção que requerem análise detalhada, conforme descrito na seção de Constatações.`,

    constatacoes: constatacoesList,

    avaliacao_risco: riskText,

    recomendacoes: recomendacoesList,

    plano_acao: `Ação | Responsável | Prazo\n---|---|---\nCorrigir irregularidades identificadas | Setor de Licitações | 15 dias\nRevisar edital conforme recomendações | Assessoria Jurídica | 10 dias\nImplementar controles preventivos | Controle Interno | 30 dias\n\n(Ajuste conforme necessidade)`,

    conclusao: `Com base na análise realizada, foram identificadas ${confirmedAlerts.length} constatação(ões) no processo licitatório "${doc.title}".\n\nO score de risco geral atribuído foi de ${doc.risk_score ?? "N/A"}/100.\n\nParecer do Auditor: ${confirmedAlerts.length === 0 ? "SEM RESSALVA" : confirmedAlerts.some(a => a.severity >= 4) ? "COM RESSALVA" : "COM RESSALVA (pontos de atenção menores)"}\n\nRecomenda-se a adoção das medidas corretivas indicadas neste relatório para adequação do processo aos normativos vigentes.`,

    anexos: `Documentos complementares:\n• Edital original (disponível para download na plataforma)\n• Relatório de alertas detalhado\n• Base normativa utilizada na análise\n\n(Adicione outros anexos conforme necessário)`,
  };
}

export default function AuditReport() {
  const { id, reportId } = useParams<{ id: string; reportId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState<ReportContent | null>(null);
  const [editing, setEditing] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const { data: doc, isLoading: loadingDoc } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("procurement_documents").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: alerts } = useQuery({
    queryKey: ["document-alerts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("risk_alerts").select("*").eq("document_id", id!).order("severity", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingReport, isLoading: loadingReport } = useQuery({
    queryKey: ["audit-report", reportId || id],
    queryFn: async () => {
      if (reportId) {
        const { data, error } = await supabase.from("audit_reports").select("*").eq("id", reportId).single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("audit_reports").select("*").eq("document_id", id!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (initialized) return;
    if (loadingDoc || loadingReport) return;

    if (existingReport?.content) {
      setContent(existingReport.content as unknown as ReportContent);
      setEditing(false);
    } else if (doc) {
      setContent(generateDefaultContent(doc, alerts || []));
      setEditing(true);
    }
    setInitialized(true);
  }, [doc, alerts, existingReport, loadingDoc, loadingReport, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!content || !id) throw new Error("Sem conteúdo");
      const { data: { user } } = await supabase.auth.getUser();

      if (existingReport?.id) {
        const { error } = await supabase.from("audit_reports")
          .update({ content: content as any, status: "saved", updated_at: new Date().toISOString() })
          .eq("id", existingReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("audit_reports")
          .insert({ document_id: id, created_by: user?.id, content: content as any, status: "saved" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Relatório salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["audit-report"] });
      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
    },
    onError: () => toast.error("Erro ao salvar relatório"),
  });

  const handleExportPDF = () => {
    if (!printRef.current || !content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Auditoria - ${doc?.title || ""}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
      h1 { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 16px; color: #1a365d; }
      h2 { color: #1a365d; border-bottom: 1px solid #cbd5e0; padding-bottom: 8px; margin-top: 32px; }
      .section { margin-bottom: 24px; white-space: pre-wrap; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>Relatório de Auditoria Fiscal</h1>
    ${SECTION_KEYS.map(key => `<h2>${SECTION_LABELS[key]}</h2><div class="section">${(content[key] || "").replace(/\n/g, "<br>")}</div>`).join("")}
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const updateSection = (key: keyof ReportContent, value: string) => {
    if (!content) return;
    setContent({ ...content, [key]: value });
  };

  if (loadingDoc || loadingReport) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!doc || !content) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Documento não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/documents")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6" ref={printRef}>
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/documents/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">Relatório de Auditoria</h1>
            <p className="text-sm text-muted-foreground truncate">{doc.title}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? <><Eye className="h-4 w-4 mr-1" /> Visualizar</> : <><Edit3 className="h-4 w-4 mr-1" /> Editar</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          </div>
        </div>

        {SECTION_KEYS.map(key => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{SECTION_LABELS[key]}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  value={content[key]}
                  onChange={e => updateSection(key, e.target.value)}
                />
              ) : (
                <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">{content[key]}</pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
