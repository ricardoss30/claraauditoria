import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRules } from "@/hooks/useRules";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { SeverityIndicator } from "@/components/SeverityIndicator";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const defaultForm = { name: "", description: "", category: "sobrepreco", rule_type: "keyword", severity: 3 };

export default function Rules() {
  const { data, isLoading, toggleActive, upsertRule, deleteRule } = useRules();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "gestor"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (rule: any) => { setForm({ name: rule.name, description: rule.description ?? "", category: rule.category, rule_type: rule.rule_type, severity: rule.severity }); setEditId(rule.id); setDialogOpen(true); };

  const handleSubmit = () => {
    upsertRule.mutate({ ...form, id: editId ?? undefined }, {
      onSuccess: () => { toast.success(editId ? "Regra atualizada" : "Regra criada"); setDialogOpen(false); },
      onError: () => toast.error("Erro ao salvar regra"),
    });
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id, {
      onSuccess: () => toast.success("Regra excluída"),
      onError: () => toast.error("Erro ao excluir regra"),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Regras de Risco</h1>
          {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nova Regra</Button>}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Shield} title="Nenhuma regra cadastrada" description="Configure regras parametrizadas para análise automática de documentos." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    {rule.description && <CardDescription className="text-sm">{rule.description}</CardDescription>}
                  </div>
                  {canManage && (
                    <Switch checked={rule.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: rule.id, is_active: checked })} />
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{rule.category}</Badge>
                    <Badge variant="secondary">{rule.rule_type}</Badge>
                    {!rule.is_active && <Badge variant="destructive">Inativa</Badge>}
                  </div>
                  <SeverityIndicator severity={rule.severity} />
                  {canManage && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 className="h-3 w-3 mr-1" /> Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(rule.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar Regra" : "Nova Regra"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobrepreco">Sobrepreço</SelectItem>
                      <SelectItem value="direcionamento">Direcionamento</SelectItem>
                      <SelectItem value="prazo_exiguo">Prazo Exíguo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Regra</Label>
                  <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Palavra-chave</SelectItem>
                      <SelectItem value="numeric">Numérico</SelectItem>
                      <SelectItem value="pattern">Padrão</SelectItem>
                      <SelectItem value="ai">IA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Severidade: {form.severity}</Label>
                <Slider value={[form.severity]} onValueChange={([v]) => setForm({ ...form, severity: v })} min={1} max={5} step={1} className="mt-2" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!form.name || upsertRule.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
