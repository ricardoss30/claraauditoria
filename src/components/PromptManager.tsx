import { useState, useEffect } from "react";
import { useSystemSetting, useSettingVersions } from "@/hooks/useSystemSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Trash2, FileDown, Eye, Loader2, History, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PromptManagerProps {
  settingKey: string;
  title: string;
  placeholder?: string;
}

export function PromptManager({ settingKey, title, placeholder }: PromptManagerProps) {
  const { data: savedPrompt, isLoading, refetch, saveWithHistory } = useSystemSetting(settingKey);
  const { data: versions, isLoading: versionsLoading } = useSettingVersions(settingKey);
  const [localValue, setLocalValue] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
    saveWithHistory.mutate(localValue, {
      onSuccess: () => toast.success("Prompt salvo com sucesso!"),
      onError: () => toast.error("Erro ao salvar o prompt."),
    });
  };

  const handleClear = () => setLocalValue("");

  const handleViewCurrent = async () => {
    const { data } = await refetch();
    if (data != null) {
      setLocalValue(data);
      toast.info("Prompt recarregado do banco de dados.");
    }
  };

  const handleExportPdf = () => {
    const win = window.open("", "_blank");
    if (!win) { toast.error("Pop-up bloqueado."); return; }
    win.document.write(`<html><head><title>${title}</title>
      <style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:13px;line-height:1.6;}</style>
      </head><body>${localValue.replace(/</g, "&lt;")}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleRestore = (value: string) => {
    setLocalValue(value);
    toast.info("Versão restaurada no editor. Clique em Salvar para aplicar.");
  };

  const isDirty = initialized && localValue !== (savedPrompt ?? "");

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {title}
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
            placeholder={placeholder || `Digite o ${title.toLowerCase()}...`}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saveWithHistory.isPending || !localValue.trim()}>
              {saveWithHistory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline"><Trash2 className="h-4 w-4" /> Limpar Prompt</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar o prompt?</AlertDialogTitle>
                  <AlertDialogDescription>O prompt salvo no banco não será afetado até você clicar em Salvar.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={handleExportPdf}><FileDown className="h-4 w-4" /> Exportar em PDF</Button>
            <Button variant="outline" onClick={handleViewCurrent}><Eye className="h-4 w-4" /> Visualizar Atual</Button>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Histórico de Versões
                </CardTitle>
                <span className="text-xs text-muted-foreground">{historyOpen ? "Ocultar" : "Mostrar"}</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {versionsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !versions?.length ? (
                <p className="text-sm text-muted-foreground">Nenhuma versão anterior encontrada.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {versions.map((v: any) => (
                    <div key={v.id} className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-sm font-mono truncate mt-1">{v.value.substring(0, 120)}...</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleRestore(v.value)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
