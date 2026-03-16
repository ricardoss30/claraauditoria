import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDocuments } from "@/hooks/useDocuments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { EmptyState } from "@/components/EmptyState";
import { FileText, Search, ChevronLeft, ChevronRight, Plus, Trash2, Eye, ClipboardCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Documents() {
  const { data, isLoading, search, setSearch, statusFilter, setStatusFilter, page, setPage, pageSize } = useDocuments();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<{ id: string; title: string; file_url: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      // 1. Delete associated alerts
      await supabase.from("risk_alerts").delete().eq("document_id", deleteDoc.id);
      // 2. Delete file from storage
      if (deleteDoc.file_url) {
        await supabase.storage.from("documents").remove([deleteDoc.file_url]);
      }
      // 3. Delete document
      const { error } = await supabase.from("procurement_documents").delete().eq("id", deleteDoc.id);
      // Verify deletion actually happened
      const { data: stillExists } = await supabase.from("procurement_documents").select("id").eq("id", deleteDoc.id).maybeSingle();
      if (error) throw error;
      if (count === 0) {
        toast({ title: "Não foi possível excluir", description: "Você não tem permissão para excluir este documento.", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Documento excluído com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir documento", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDoc(null);
    }
  };
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Documentos</h1>
          <Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo Documento</Button>
        </div>
        <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

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
                      <TableHead>Relatório</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((doc) => (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/documents/${doc.id}`)}>
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
                        <TableCell>
                          {data.reportDocIds.has(doc.id) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary/80"
                              onClick={(e) => { e.stopPropagation(); navigate(`/documents/${doc.id}/report`); }}
                              title="Ver Relatório"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm pl-2">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); navigate(`/documents/${doc.id}`); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteDoc({ id: doc.id, title: doc.title, file_url: doc.file_url }); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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

        <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir documento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deleteDoc?.title}"? Esta ação não pode ser desfeita e removerá também os alertas associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
