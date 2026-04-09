import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { UseMutationResult } from "@tanstack/react-query";

interface RuleOption {
  id: string;
  name: string;
  label: string;
}

interface RuleOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: RuleOption[] | undefined;
  isLoading: boolean;
  addMutation: UseMutationResult<void, Error, { name: string; label: string }>;
  deleteMutation: UseMutationResult<void, Error, string>;
}

export function RuleOptionsDialog({ open, onOpenChange, title, items, isLoading, addMutation, deleteMutation }: RuleOptionsDialogProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !label.trim()) return;
    addMutation.mutate({ name: name.trim().toLowerCase().replace(/\s+/g, "_"), label: label.trim() }, {
      onSuccess: () => { toast.success("Adicionado com sucesso"); setName(""); setLabel(""); },
      onError: () => toast.error("Erro ao adicionar. Verifique se já não existe."),
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Removido com sucesso"),
      onError: () => toast.error("Erro ao remover"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !items?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">({item.name})</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Slug</label>
            <Input placeholder="ex: nova_categoria" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Label</label>
            <Input placeholder="ex: Nova Categoria" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button size="icon" onClick={handleAdd} disabled={!name.trim() || !label.trim() || addMutation.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
