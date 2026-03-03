import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { ExportButton } from "@/components/ExportButton";
import { exportToCSV } from "@/hooks/useExport";
import { useTrendsData } from "@/hooks/useTrendsData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { Link } from "react-router-dom";

export default function Trends() {
  const { riskScoreOverTime, agenciesByAlerts, documentComparison, alertsSeverityTrend } = useTrendsData();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tendências</h1>
            <p className="text-muted-foreground text-sm mt-1">Análise comparativa e evolução temporal dos indicadores de risco</p>
          </div>
          <ExportButton
            label="Exportar Dados"
            disabled={documentComparison.isLoading}
            onClick={() => {
              if (documentComparison.data) {
                exportToCSV(documentComparison.data.map((d) => ({
                  titulo: d.title,
                  score_risco: d.risk_score,
                  modalidade: d.modality || "—",
                  orgao: d.agency || "—",
                  data: new Date(d.created_at).toLocaleDateString("pt-BR"),
                })), "comparativo-documentos");
              }
            }}
          />
        </div>

        {/* Risk Score Evolution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução do Score de Risco (média semanal)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {riskScoreOverTime.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : riskScoreOverTime.data && riskScoreOverTime.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskScoreOverTime.data}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}`, "Score Médio"]} />
                  <Area type="monotone" dataKey="avgScore" stroke="hsl(var(--destructive))" fill="url(#riskGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados de score de risco ainda.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Agencies by Alerts */}
          <Card>
            <CardHeader><CardTitle className="text-base">Órgãos com Mais Alertas</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {agenciesByAlerts.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : agenciesByAlerts.data && agenciesByAlerts.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agenciesByAlerts.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados de órgãos.</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts Severity Trend */}
          <Card>
            <CardHeader><CardTitle className="text-base">Tendência de Severidade dos Alertas</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {alertsSeverityTrend.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : alertsSeverityTrend.data && alertsSeverityTrend.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertsSeverityTrend.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="critical" name="Crítico" stackId="a" fill="hsl(var(--destructive))" />
                    <Bar dataKey="high" name="Alto" stackId="a" fill="hsl(var(--chart-4, 25 95% 53%))" />
                    <Bar dataKey="medium" name="Médio" stackId="a" fill="hsl(var(--chart-3, 45 93% 47%))" />
                    <Bar dataKey="low" name="Baixo" stackId="a" fill="hsl(var(--chart-2, 173 58% 39%))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Sem dados de tendência.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Comparison Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Análise Comparativa de Documentos (Top 20 por Score de Risco)</CardTitle></CardHeader>
          <CardContent>
            {documentComparison.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : documentComparison.data && documentComparison.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Score de Risco</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentComparison.data.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Link to={`/documents/${doc.id}`} className="font-medium text-primary hover:underline">
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell><RiskScoreBadge score={doc.risk_score ?? 0} /></TableCell>
                      <TableCell>{doc.modality || "—"}</TableCell>
                      <TableCell>{doc.agency || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento processado para comparação.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
