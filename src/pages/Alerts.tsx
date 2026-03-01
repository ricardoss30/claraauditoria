import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, Eye } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { exportToCSV } from "@/hooks/useExport";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AlertStatus = Database["public"]["Enums"]["alert_status"];

export default function Alerts() {
  const { data, isLoading, statusFilter, setStatusFilter, severityFilter, setSeverityFilter } = useAlerts();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Alertas de Risco</h1>
          <ExportButton
            disabled={!data?.length}
            onClick={() => data && exportToCSV(
              data.map((a: any) => ({
                título: a.title,
                tipo: a.alert_type,
                documento: a.procurement_documents?.title || "",
                severidade: a.severity,
                status: a.status,
                descrição: a.description || "",
                evidência: a.evidence || "",
                data: new Date(a.created_at).toLocaleDateString("pt-BR"),
              })),
              "alertas"
            )}
          />
        </div>

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
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedAlert(alert); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
                <div><p className="text-sm font-medium mb-1">Critérios</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAlert.criteria || "—"}</p></div>
                <div><p className="text-sm font-medium mb-1">Achados</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAlert.description || "—"}</p></div>
                <div><p className="text-sm font-medium mb-1">Evidência</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAlert.evidence || "—"}</p></div>
                <div><p className="text-sm font-medium mb-1">Recomendações</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAlert.review_notes || "—"}</p></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
