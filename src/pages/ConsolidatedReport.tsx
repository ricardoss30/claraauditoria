import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, subQuarters, startOfQuarter, endOfQuarter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileText, Download, Printer } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useConsolidatedReport, ConsolidatedMetrics } from "@/hooks/useConsolidatedReport";
import { exportToCSV } from "@/hooks/useExport";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { SeverityIndicator } from "@/components/SeverityIndicator";

const severityLabel = (s: number) =>
  ["", "Muito Baixa", "Baixa", "Média", "Alta", "Crítica"][s] || String(s);

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ConsolidatedReport() {
  const [periodType, setPeriodType] = useState("last_month");
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [filters, setFilters] = useState<{ startDate: string; endDate: string } | null>(null);

  const { data: metrics, isLoading, isFetching } = useConsolidatedReport(filters);

  const handleGenerate = () => {
    let start: Date, end: Date;
    const now = new Date();

    switch (periodType) {
      case "last_month":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "last_quarter":
        start = startOfQuarter(subQuarters(now, 1));
        end = endOfQuarter(subQuarters(now, 1));
        break;
      case "custom":
        if (!customStart || !customEnd) return;
        start = customStart;
        end = customEnd;
        break;
      default:
        return;
    }

    setFilters({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!metrics) return;
    exportToCSV(
      metrics.documents.map((d) => ({
        Título: d.title,
        Órgão: d.agency || "—",
        Modalidade: d.modality || "—",
        "Score de Risco": d.risk_score ?? "—",
        Status: d.status,
        Alertas: d.alert_count,
        "Data Criação": d.created_at,
      })),
      "relatorio-consolidado"
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatório Consolidado</h1>
            <p className="text-muted-foreground">Gere relatórios agregados por período</p>
          </div>
        </div>

        {/* Filters - hide on print */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Período</label>
                <Select value={periodType} onValueChange={setPeriodType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_month">Último Mês</SelectItem>
                    <SelectItem value="last_quarter">Último Trimestre</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodType === "custom" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Início</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStart ? format(customStart, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Fim</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEnd ? format(customEnd, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <Button onClick={handleGenerate} disabled={isLoading || isFetching}>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report content */}
        {metrics && (
          <>
            {/* Export buttons */}
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Documentos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-foreground">{metrics.totalDocuments}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Score Médio</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-foreground">{metrics.averageRiskScore}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Alertas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-foreground">{metrics.totalAlerts}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Órgãos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-foreground">{Object.keys(metrics.agencyDistribution).length}</p></CardContent>
              </Card>
            </div>

            {/* Distributions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(metrics.statusDistribution).map(([status, count]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{status}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Alertas por Severidade</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(metrics.alertsBySeverity)
                      .sort(([a], [b]) => Number(b) - Number(a))
                      .map(([sev, count]) => (
                        <div key={sev} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{severityLabel(Number(sev))}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Alerts */}
            <Card>
              <CardHeader><CardTitle className="text-base">Top 10 Alertas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alerta</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topAlerts.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell className="text-muted-foreground">{a.document_title}</TableCell>
                        <TableCell>{severityLabel(a.severity)}</TableCell>
                        <TableCell className="capitalize">{a.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Documents table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Documentos Analisados</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell className="text-muted-foreground">{d.agency || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{d.modality || "—"}</TableCell>
                        <TableCell>{d.risk_score != null ? <RiskScoreBadge score={d.risk_score} /> : "—"}</TableCell>
                        <TableCell>{d.alert_count}</TableCell>
                        <TableCell className="capitalize">{d.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {!metrics && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="mb-4 h-12 w-12" />
            <p>Selecione um período e clique em "Gerar Relatório"</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
