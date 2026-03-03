import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { exportToCSV } from "@/hooks/useExport";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ title, icon: Icon, value, loading, iconClass }: {
  title: string; icon: React.ElementType; value: string | number; loading: boolean; iconClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClass ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { documentsProcessed, alertsPending, activeRules, accuracy, alertsByCategory, documentsOverTime, recentAlerts, avgRiskScore, documentsByStatus, modalityDistribution } = useDashboardStats();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <ExportButton
            label="Exportar Resumo"
            disabled={documentsProcessed.isLoading || alertsPending.isLoading}
            onClick={() => exportToCSV([{
              documentos_analisados: documentsProcessed.data ?? 0,
              alertas_pendentes: alertsPending.data ?? 0,
              regras_ativas: activeRules.data ?? 0,
              taxa_precisao: accuracy.data != null ? `${accuracy.data}%` : "—",
            }], "resumo-dashboard")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Documentos Analisados" icon={FileText} value={documentsProcessed.data ?? 0} loading={documentsProcessed.isLoading} />
          <StatCard title="Alertas Pendentes" icon={AlertTriangle} value={alertsPending.data ?? 0} loading={alertsPending.isLoading} iconClass="text-[hsl(var(--clara-warning))]" />
          <StatCard title="Regras Ativas" icon={Shield} value={activeRules.data ?? 0} loading={activeRules.isLoading} iconClass="text-primary" />
          <StatCard title="Score Médio de Risco" icon={TrendingUp} value={avgRiskScore.data != null ? avgRiskScore.data : "—"} loading={avgRiskScore.isLoading} iconClass="text-destructive" />
          <StatCard title="Taxa de Precisão" icon={TrendingUp} value={accuracy.data != null ? `${accuracy.data}%` : "—"} loading={accuracy.isLoading} iconClass="text-[hsl(var(--clara-success))]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Alertas por Categoria</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              {alertsByCategory.data && alertsByCategory.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertsByCategory.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados de alertas ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Documentos (últimos 30 dias)</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              {documentsOverTime.data && documentsOverTime.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={documentsOverTime.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem documentos recentes.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Documentos por Status</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              {documentsByStatus.data && documentsByStatus.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={documentsByStatus.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição por Modalidade</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
              {modalityDistribution.data && modalityDistribution.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modalityDistribution.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados de modalidade.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Alertas Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentAlerts.data && recentAlerts.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAlerts.data.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>{alert.alert_type}</TableCell>
                      <TableCell><SeverityIndicator severity={alert.severity} /></TableCell>
                      <TableCell><StatusBadge status={alert.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(alert.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta gerado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
