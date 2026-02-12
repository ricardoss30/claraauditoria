import { AppLayout } from "@/components/layout/AppLayout";
import { useDocuments } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { EmptyState } from "@/components/EmptyState";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Documents() {
  const { data, isLoading, search, setSearch, statusFilter, setStatusFilter, page, setPage, pageSize } = useDocuments();
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Documentos</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou órgão..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="processed">Processado</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !data || data.data.length === 0 ? (
              <EmptyState icon={FileText} title="Nenhum documento encontrado" description="Os documentos coletados das fontes de dados aparecerão aqui." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead className="text-right">Valor Estimado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Publicação</TableHead>
                      <TableHead>Risco</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium max-w-[250px] truncate">{doc.title}</TableCell>
                        <TableCell>{doc.agency ?? "—"}</TableCell>
                        <TableCell>{doc.modality ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {doc.estimated_value != null
                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(doc.estimated_value)
                            : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={doc.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.published_at ? new Date(doc.published_at).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell><RiskScoreBadge score={doc.risk_score} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">{data.total} documento(s)</p>
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
