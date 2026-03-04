import { useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { CalendarIcon, Search, Download, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useImportPNCP, PNCPSearchParams } from "@/hooks/useImportPNCP";

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const MODALITY_OPTIONS = [
  { value: "1", label: "Leilão - Eletrônico" },
  { value: "2", label: "Diálogo Competitivo" },
  { value: "3", label: "Concurso" },
  { value: "4", label: "Concorrência - Eletrônica" },
  { value: "5", label: "Concorrência - Presencial" },
  { value: "6", label: "Pregão - Eletrônico" },
  { value: "7", label: "Pregão - Presencial" },
  { value: "8", label: "Dispensa de Licitação" },
  { value: "9", label: "Inexigibilidade" },
  { value: "10", label: "Manifestação de Interesse" },
  { value: "11", label: "Pré-qualificação" },
  { value: "12", label: "Credenciamento" },
  { value: "13", label: "Leilão - Presencial" },
];

const formatCurrency = (v: number | null) =>
  v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

export default function ImportPNCP() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [uf, setUf] = useState<string>("");
  const [municipio, setMunicipio] = useState<string>("");
  const [modality, setModality] = useState<string>("6");

  const lastSearchParams = useRef<PNCPSearchParams | null>(null);

  const { searchResults, selectedIds, searchMutation, importMutation, toggleSelection, toggleAll } = useImportPNCP();

  const currentPage = searchResults?.currentPage ?? 1;
  const totalPages = searchResults?.totalPages ?? 1;

  const handleSearch = () => {
    if (!modality) {
      toast({ title: "Modalidade obrigatória", description: "Selecione uma modalidade para buscar.", variant: "destructive" });
      return;
    }
    if (startDate > endDate) {
      toast({ title: "Período inválido", description: "A data inicial deve ser anterior ou igual à data final.", variant: "destructive" });
      return;
    }
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      toast({ title: "Período inválido", description: "O período máximo de busca é de 365 dias.", variant: "destructive" });
      return;
    }
    const params: PNCPSearchParams = {
      dataInicial: format(startDate, "yyyyMMdd"),
      dataFinal: format(endDate, "yyyyMMdd"),
      pagina: 1,
      codigoModalidadeContratacao: modality,
    };
    if (uf && uf !== "all") params.uf = uf;
    if (municipio.trim()) params.municipio = municipio.trim();
    lastSearchParams.current = params;
    searchMutation.mutate(params);
  };

  const handlePageChange = (page: number) => {
    if (!lastSearchParams.current || page < 1 || page > totalPages) return;
    searchMutation.mutate({ ...lastSearchParams.current, pagina: page });
  };

  const handleImport = () => {
    if (selectedIds.size === 0) return;
    importMutation.mutate(Array.from(selectedIds));
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Editais - PNCP</h1>
          <p className="text-muted-foreground">Busque e importe editais do Portal Nacional de Contratações Públicas</p>
        </div>

        {/* Search filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-40 justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-40 justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">UF</label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {UF_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Município</label>
                <Input
                  placeholder="Ex: Salvador"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="w-44"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Modalidade *</label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITY_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                {searchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searchResults && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {searchResults.items.length} edital(is) encontrado(s)
              </CardTitle>
              <Button onClick={handleImport} disabled={selectedIds.size === 0 || importMutation.isPending} size="sm">
                {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Importar Selecionados ({selectedIds.size})
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={searchResults.items.length > 0 && selectedIds.size === searchResults.items.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Valor Estimado</TableHead>
                    <TableHead>Publicação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.agency}</TableCell>
                      <TableCell>{item.uf}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.municipality}</TableCell>
                      <TableCell>{formatCurrency(item.value)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.publishedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={cn(currentPage <= 1 && "pointer-events-none opacity-50", "cursor-pointer")}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === currentPage}
                            onClick={() => handlePageChange(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={cn(currentPage >= totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        )}

        {!searchResults && !searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="mb-4 h-12 w-12" />
            <p>Defina os filtros e clique em "Buscar" para encontrar editais no PNCP</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
