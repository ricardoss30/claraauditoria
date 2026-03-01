import { useState, useEffect, useRef } from "react";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Trash2, FileDown, Eye, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AgentPromptManager() {
  const { data: savedPrompt, isLoading, refetch, upsert } = useSystemSetting("agent_system_prompt");
  const [localValue, setLocalValue] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && savedPrompt != null && !initialized) {
      setLocalValue(savedPrompt);
      setInitialized(true);
    }
  }, [isLoading, savedPrompt, initialized]);

  const handleSave = () => {
    if (!localValue.trim()) {
      toast.error("O prompt não pode estar vazio.");
      return;
    }
    upsert.mutate(localValue, {
      onSuccess: () => toast.success("Prompt salvo com sucesso!"),
      onError: () => toast.error("Erro ao salvar o prompt."),
    });
  };

  const handleClear = () => {
    setLocalValue("");
  };

  const handleViewCurrent = async () => {
    const { data } = await refetch();
    if (data != null) {
      setLocalValue(data);
      toast.info("Prompt recarregado do banco de dados.");
    }
  };

  const handleExportPdf = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up bloqueado. Permita pop-ups para exportar.");
      return;
    }
    win.document.write(`
      <html><head><title>System Prompt</title>
      <style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:13px;line-height:1.6;}</style>
      </head><body>${localValue.replace(/</g, "&lt;")}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const isDirty = initialized && localValue !== (savedPrompt ?? "");

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Prompt do Agente de IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Prompt do Agente de IA
          {isDirty && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
              Alterações não salvas
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="min-h-[400px] font-mono text-sm"
          placeholder="Digite o system prompt do agente de IA..."
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={upsert.isPending || !localValue.trim()}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4" /> Limpar Prompt
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar o prompt?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai limpar o campo de texto. O prompt salvo no banco não será afetado até você clicar em Salvar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Limpar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" /> Exportar em PDF
          </Button>

          <Button variant="outline" onClick={handleViewCurrent}>
            <Eye className="h-4 w-4" /> Visualizar Atual
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
