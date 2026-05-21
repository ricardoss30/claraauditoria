import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDocumentUpload, UploadStep } from "@/hooks/useDocumentUpload";
import { Label } from "@/components/ui/label";

const stepProgress: Record<UploadStep, number> = {
  idle: 0, extracting_local: 10, splitting: 15, uploading: 20, extracting: 50, analyzing: 75, done: 100, error: 100,
};

const stepLabels: Record<UploadStep, string> = {
  idle: "",
  extracting_local: "Extraindo texto do PDF...",
  splitting: "Dividindo PDF em partes menores...",
  uploading: "Enviando arquivo...",
  extracting: "Extraindo dados com IA...",
  analyzing: "Analisando riscos...",
  done: "Concluído!",
  error: "Erro no processamento",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({ open, onOpenChange }: Props) {
  const { upload, step, error, reset, extractionProgress, splitProgress, multiPartProgress } = useDocumentUpload();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [auditCriteria, setAuditCriteria] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isProcessing = ["extracting_local", "splitting", "uploading", "extracting", "analyzing"].includes(step);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onOpenChange(false);
      setTimeout(() => { reset(); setFile(null); setText(""); setAuditCriteria(""); }, 200);
    }
  }, [isProcessing, onOpenChange, reset]);

  const handleSubmit = async (mode: "file" | "text") => {
    const id = await upload({
      file: mode === "file" ? file : null,
      text: mode === "text" ? text : undefined,
      audit_criteria: auditCriteria,
    });
    if (id) setTimeout(() => handleClose(), 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type === "text/plain")) setFile(f);
  };

  // Build dynamic label
  const getStepLabel = () => {
    if (step === "extracting_local" && extractionProgress) {
      return `Extraindo texto do PDF... (página ${extractionProgress.currentPage}/${extractionProgress.totalPages})`;
    }
    if (step === "splitting" && splitProgress) {
      return `Dividindo PDF... (parte ${splitProgress.currentPart}/${splitProgress.totalParts})`;
    }
    if (multiPartProgress) {
      return `${stepLabels[step]} (parte ${multiPartProgress.currentPart}/${multiPartProgress.totalParts})`;
    }
    return stepLabels[step];
  };

  // Calculate progress for multi-part
  const getProgressValue = () => {
    if (multiPartProgress && multiPartProgress.totalParts > 1) {
      const partWeight = 80 / multiPartProgress.totalParts; // 80% for processing parts (10% split + 10% done)
      const partBase = 15 + (multiPartProgress.currentPart - 1) * partWeight;
      const stepOffset = step === "uploading" ? 0 : step === "extracting" ? partWeight * 0.4 : step === "analyzing" ? partWeight * 0.8 : 0;
      return Math.min(95, partBase + stepOffset);
    }
    if (step === "extracting_local" && extractionProgress) {
      return (extractionProgress.currentPage / extractionProgress.totalPages) * 15;
    }
    return stepProgress[step];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Documento</DialogTitle>
          <DialogDescription>Envie um arquivo PDF ou cole o texto do edital para análise automática.</DialogDescription>
        </DialogHeader>

        {step !== "idle" && step !== "error" ? (
          <div className="space-y-4 py-4">
            <Progress value={getProgressValue()} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              {step === "done" ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--clara-success))]" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{getStepLabel()}</span>
            </div>
            {multiPartProgress && multiPartProgress.totalParts > 1 && (
              <p className="text-xs text-muted-foreground">
                PDF grande detectado — processando em {multiPartProgress.totalParts} partes automaticamente.
              </p>
            )}
          </div>
        ) : step === "error" ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error || "Erro desconhecido"}</span>
            </div>
            <Button variant="outline" onClick={reset}>Tentar novamente</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="audit-criteria">Critérios de Análise de Auditoria <span className="text-destructive">*</span></Label>
              <Textarea
                id="audit-criteria"
                placeholder="Descreva a metodologia e técnicas de auditoria a serem aplicadas na análise deste documento. Ex: Verificar conformidade com a Lei 14.133/2021, analisar sobrepreço com base em tabela SINAPI..."
                rows={4}
                value={auditCriteria}
                onChange={(e) => setAuditCriteria(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">A IA usará esses critérios como parâmetros para avaliação do documento.</p>
            </div>

            <Tabs defaultValue="file">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload de Arquivo</TabsTrigger>
                <TabsTrigger value="text">Colar Texto</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-3">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF ou texto (até 5 GB)</p>
                    </>
                  )}
                </div>
                <Button className="w-full" disabled={!file || !auditCriteria.trim()} onClick={() => handleSubmit("file")}>
                  <FileText className="h-4 w-4 mr-2" /> Processar Documento
                </Button>
              </TabsContent>

              <TabsContent value="text" className="space-y-3">
                <Textarea placeholder="Cole o texto do edital aqui..." rows={8} value={text} onChange={(e) => setText(e.target.value)} />
                <Button className="w-full" disabled={!text.trim() || !auditCriteria.trim()} onClick={() => handleSubmit("text")}>
                  <FileText className="h-4 w-4 mr-2" /> Processar Texto
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
