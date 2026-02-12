import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, RefreshCw, FileText } from "lucide-react";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ExportButton";
import { exportToPDF } from "@/hooks/useExport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reprocess, step } = useDocumentUpload();

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

  const handleReprocess = async () => {
    if (!doc?.raw_content || !id) {
      toast({ title: "Sem conteúdo", description: "Documento não possui conteúdo para reprocessar.", variant: "destructive" });
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
          </div>
        </div>

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
