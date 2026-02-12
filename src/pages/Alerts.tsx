import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AlertStatus = Database["public"]["Enums"]["alert_status"];

export default function Alerts() {
  const { data, isLoading, statusFilter, setStatusFilter, severityFilter, setSeverityFilter, updateAlert } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleUpdate = (id: string, status: AlertStatus) => {
    updateAlert.mutate({ id, status, review_notes: reviewNotes || undefined }, {
      onSuccess: () => { toast.success("Alerta atualizado"); setSelectedAlert(null); setReviewNotes(""); },
      onError: () => toast.error("Erro ao atualizar alerta"),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Alertas de Risco</h1>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="under_review">Em Revisão</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="dismissed">Descartado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)}>Severidade {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data || data.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Nenhum alerta encontrado" description="Alertas gerados pela análise automática aparecerão aqui." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>{alert.alert_type}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{alert.procurement_documents?.title ?? "—"}</TableCell>
                      <TableCell><SeverityIndicator severity={alert.severity} /></TableCell>
                      <TableCell><StatusBadge status={alert.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(alert.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedAlert(alert); setReviewNotes(alert.review_notes ?? ""); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {alert.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-[hsl(var(--clara-success))]" onClick={() => handleUpdate(alert.id, "confirmed")}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleUpdate(alert.id, "dismissed")}>
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

        <Dialog open={!!selectedAlert} onOpenChange={(open) => { if (!open) setSelectedAlert(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedAlert?.title}</DialogTitle></DialogHeader>
            {selectedAlert && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Tipo:</span> {selectedAlert.alert_type}</div>
                  <div><span className="text-muted-foreground">Severidade:</span> <SeverityIndicator severity={selectedAlert.severity} /></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedAlert.status} /></div>
                  <div><span className="text-muted-foreground">Data:</span> {new Date(selectedAlert.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                {selectedAlert.description && <div><p className="text-sm font-medium mb-1">Descrição</p><p className="text-sm text-muted-foreground">{selectedAlert.description}</p></div>}
                {selectedAlert.evidence && <div><p className="text-sm font-medium mb-1">Evidência</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAlert.evidence}</p></div>}
                <div>
                  <p className="text-sm font-medium mb-1">Notas de Revisão</p>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Adicione suas observações..." />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleUpdate(selectedAlert.id, "dismissed")}>Descartar</Button>
              <Button variant="outline" className="text-[hsl(var(--clara-warning))]" onClick={() => handleUpdate(selectedAlert.id, "under_review")}>Em Revisão</Button>
              <Button onClick={() => handleUpdate(selectedAlert.id, "confirmed")}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
