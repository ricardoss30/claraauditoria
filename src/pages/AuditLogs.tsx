import { AppLayout } from "@/components/layout/AppLayout";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ExportButton } from "@/components/ExportButton";
import { exportToCSV } from "@/hooks/useExport";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  upload: "Upload",
  status_change: "Mudança de Status",
};

export default function AuditLogs() {
  const { hasAnyRole } = useAuth();
  const { data, isLoading, actionFilter, setActionFilter, resourceFilter, setResourceFilter, page, setPage, pageSize } = useAuditLogs();

  if (!hasAnyRole(["admin", "auditor"])) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores e auditores.</p>
        </div>
      </AppLayout>
    );
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <ExportButton
            disabled={!data?.data.length}
            onClick={() => data?.data && exportToCSV(
              data.data.map((l) => ({
                ação: actionLabels[l.action] || l.action,
                recurso: l.resource_type,
                recurso_id: l.resource_id || "",
                usuario: l.user_id || "",
                ip: l.ip_address || "",
                detalhes: l.details ? JSON.stringify(l.details) : "",
                data: new Date(l.created_at).toLocaleString("pt-BR"),
              })),
              "auditoria"
            )}
          />
        </div>

        <div className="flex gap-3">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="create">Criação</SelectItem>
              <SelectItem value="update">Atualização</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="status_change">Mudança de Status</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Recurso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os recursos</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
              <SelectItem value="alert">Alerta</SelectItem>
              <SelectItem value="rule">Regra</SelectItem>
              <SelectItem value="source">Fonte de Dados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data || data.data.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Nenhum registro de auditoria" description="As ações realizadas no sistema serão registradas aqui." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="secondary">{actionLabels[log.action] || log.action}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.resource_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{log.user_id?.substring(0, 8) ?? "Sistema"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.ip_address ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">{data.total} registro(s)</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">{page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
