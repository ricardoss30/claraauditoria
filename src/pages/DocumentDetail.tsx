import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, RefreshCw, FileText, Database, Eye, CheckCircle, XCircle, ClipboardList, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ExportButton";
import { exportToPDF } from "@/hooks/useExport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import type { Database as DB } from "@/integrations/supabase/types";

type AlertStatus = DB["public"]["Enums"]["alert_status"];

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { reprocess, step } = useDocumentUpload();
  const queryClient = useQueryClient();

  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [criteriaValue, setCriteriaValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [evidenceValue, setEvidenceValue] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: doc, isLoading } = useQuery({
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

  const { data: existingReport } = useQuery({
    queryKey: ["audit-report-exists", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_reports").select("id").eq("document_id", id!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateAlert = useMutation({
    mutationFn: async ({ alertId, status, criteria, description, evidence, review_notes }: { alertId: string; status: AlertStatus; criteria?: string; description?: string; evidence?: string; review_notes?: string }) => {
      const { error } = await supabase
        .from("risk_alerts")
        .update({ status, criteria, description, evidence, review_notes, reviewed_at: new Date().toISOString() } as any)
        .eq("id", alertId);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        action: "status_change",
        resource_type: "alert",
        resource_id: alertId,
        user_id: user?.id,
        details: { new_status: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-alerts", id] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const handleStatusChange = (alertId: string, status: AlertStatus) => {
    updateAlert.mutate({ alertId, status }, {
      onSuccess: () => toast.success(`Alerta ${status === "confirmed" ? "confirmado" : status === "dismissed" ? "descartado" : "atualizado"}`),
      onError: () => toast.error("Erro ao atualizar alerta"),
    });
  };

  const handleDialogStatusChange = (status: AlertStatus) => {
    if (!selectedAlert) return;
    updateAlert.mutate({
      alertId: selectedAlert.id,
      status,
      criteria: criteriaValue,
      description: descriptionValue,
      evidence: evidenceValue,
      review_notes: reviewNotes,
    }, {
      onSuccess: () => {
        toast.success(`Alerta ${status === "confirmed" ? "confirmado" : status === "dismissed" ? "descartado" : "em revisão"}`);
        setSelectedAlert(null);
      },
      onError: () => toast.error("Erro ao atualizar alerta"),
    });
  };

  const openAlertDialog = (alert: any) => {
    setSelectedAlert(alert);
    setCriteriaValue(alert.criteria || "");
    setDescriptionValue(alert.description || "");
    setEvidenceValue(alert.evidence || "");
    setReviewNotes(alert.review_notes || "");
  };

  const handleReprocess = async () => {
    if (!doc?.raw_content || !id) {
      uiToast({ title: "Sem conteúdo", description: "Documento não possui conteúdo para reprocessar.", variant: "destructive" });
      return;
    }
    await reprocess(id, doc.raw_content);
  };

  const handleDownload = async () => {
    if (!doc?.file_url) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const extracted = doc?.extracted_data as Record<string, any> | null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!doc) {
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={doc.status} />
              <RiskScoreBadge score={doc.risk_score} />
              {extracted?.rag_context_used && (
                <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                  <Database className="h-3 w-3" />
                  Base de Conhecimento ({extracted.rag_chunks_count} chunks · {extracted.rag_method === "vector_search" ? "vetorial" : "palavras-chave"})
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {doc.file_url && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReprocess} disabled={["uploading", "extracting", "analyzing"].includes(step)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reprocessar
            </Button>
            <ExportButton
              label="Exportar PDF"
              onClick={() => exportToPDF(doc, alerts || [])}
            />
            <Button
              variant="default"
              size="sm"
              onClick={() => existingReport?.id
                ? navigate(`/documents/${id}/report/${existingReport.id}`)
                : navigate(`/documents/${id}/report`)
              }
            >
              <ClipboardList className="h-4 w-4 mr-1" />
              {existingReport ? "Ver Relatório" : "Gerar Relatório"}
            </Button>
          </div>
        </div>

        {extracted?.audit_criteria && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Critérios de Análise de Auditoria</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">{extracted.audit_criteria}</pre>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Extraídos</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Órgão" value={doc.agency} />
              <Row label="Modalidade" value={doc.modality} />
              <Row label="Valor Estimado" value={doc.estimated_value != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(doc.estimated_value) : null} />
              <Row label="Prazo" value={doc.deadline_at ? new Date(doc.deadline_at).toLocaleDateString("pt-BR") : null} />
              <Row label="Descrição" value={doc.description} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Alertas ({alerts?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {!alerts?.length ? (
                <p className="text-sm text-muted-foreground">Nenhum alerta identificado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alerta</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </TableCell>
                        <TableCell><SeverityIndicator severity={a.severity} /></TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAlertDialog(a)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {a.status === "pending" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--clara-success))]" onClick={() => handleStatusChange(a.id, "confirmed")}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleStatusChange(a.id, "dismissed")}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {doc.raw_content && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Conteúdo Original</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-auto bg-muted p-4 rounded-md">{doc.raw_content}</pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => { if (!open) { setSelectedAlert(null); setReviewNotes(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Alerta</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium">{selectedAlert.alert_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Severidade</span>
                  <div className="mt-1"><SeverityIndicator severity={selectedAlert.severity} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1"><StatusBadge status={selectedAlert.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Data</span>
                  <p className="font-medium">{new Date(selectedAlert.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Critérios</span>
                <Textarea
                  className="mt-1"
                  placeholder="Descreva os critérios aplicados..."
                  value={criteriaValue}
                  onChange={(e) => setCriteriaValue(e.target.value)}
                />
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Achados</span>
                <Textarea
                  className="mt-1"
                  placeholder="Descreva os achados..."
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                />
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Evidência</span>
                <Textarea
                  className="mt-1"
                  placeholder="Descreva as evidências..."
                  value={evidenceValue}
                  onChange={(e) => setEvidenceValue(e.target.value)}
                />
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Recomendações</span>
                <Textarea
                  className="mt-1"
                  placeholder="Adicione recomendações..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDialogStatusChange("dismissed")}>
              <XCircle className="h-4 w-4 mr-1" /> Descartar
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDialogStatusChange("under_review")}>
              Em Revisão
            </Button>
            <Button size="sm" onClick={() => handleDialogStatusChange("confirmed")}>
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
