import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSources } from "@/hooks/useSources";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Database, Plus, Pencil, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const defaultForm = { name: "", source_type: "api", base_url: "" };

export default function Sources() {
  const { data, isLoading, toggleActive, upsertSource } = useSources();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "gestor"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (source: any) => { setForm({ name: source.name, source_type: source.source_type, base_url: source.base_url ?? "" }); setEditId(source.id); setDialogOpen(true); };

  const handleSubmit = () => {
    upsertSource.mutate({ ...form, id: editId ?? undefined }, {
      onSuccess: () => { toast.success(editId ? "Fonte atualizada" : "Fonte criada"); setDialogOpen(false); },
      onError: () => toast.error("Erro ao salvar fonte"),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fontes de Dados</h1>
          {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nova Fonte</Button>}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Database} title="Nenhuma fonte cadastrada" description="Configure fontes de dados para coleta automática de documentos." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((source) => (
              <Card key={source.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{source.name}</CardTitle>
                    {source.base_url && <CardDescription className="text-xs truncate max-w-[250px]">{source.base_url}</CardDescription>}
                  </div>
                  {canManage && (
                    <Switch checked={source.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: source.id, is_active: checked })} />
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{source.source_type}</Badge>
                    {!source.is_active && <Badge variant="destructive">Inativa</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    {source.last_sync_at
                      ? `Sincronizado ${formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true, locale: ptBR })}`
                      : "Nunca sincronizado"}
                  </div>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(source)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar Fonte" : "Nova Fonte"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="scraping">Web Scraping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>URL Base</Label><Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!form.name || upsertSource.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
