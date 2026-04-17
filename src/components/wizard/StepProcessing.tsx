import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UploadStep, MultiPartProgress } from "@/hooks/useDocumentUpload";
import type { PdfExtractionProgress } from "@/lib/pdfExtractor";
import type { SplitProgress } from "@/lib/pdfSplitter";

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

const stepProgress: Record<UploadStep, number> = {
  idle: 0, extracting_local: 10, splitting: 15, uploading: 20, extracting: 50, analyzing: 75, done: 100, error: 100,
};

interface Props {
  step: UploadStep;
  error: string | null;
  documentId: string | null;
  extractionProgress: PdfExtractionProgress | null;
  splitProgress: SplitProgress | null;
  multiPartProgress: MultiPartProgress | null;
  uploadProgress?: number | null;
  onRetry: () => void;
}

export function StepProcessing({ step, error, documentId, extractionProgress, splitProgress, multiPartProgress, uploadProgress, onRetry }: Props) {
  const navigate = useNavigate();

  const getStepLabel = () => {
    if (step === "extracting_local" && extractionProgress) {
      return `Extraindo texto do PDF... (página ${extractionProgress.currentPage}/${extractionProgress.totalPages})`;
    }
    if (step === "splitting" && splitProgress) {
      return `Dividindo PDF... (parte ${splitProgress.currentPart}/${splitProgress.totalParts})`;
    }
    if (step === "uploading" && uploadProgress != null) {
      return `Enviando arquivo... ${uploadProgress}%`;
    }
    if (multiPartProgress) {
      return `${stepLabels[step]} (parte ${multiPartProgress.currentPart}/${multiPartProgress.totalParts})`;
    }
    return stepLabels[step];
  };

  const getProgressValue = () => {
    if (multiPartProgress && multiPartProgress.totalParts > 1) {
      const partWeight = 80 / multiPartProgress.totalParts;
      const partBase = 15 + (multiPartProgress.currentPart - 1) * partWeight;
      const stepOffset = step === "uploading" ? 0 : step === "extracting" ? partWeight * 0.4 : step === "analyzing" ? partWeight * 0.8 : 0;
      return Math.min(95, partBase + stepOffset);
    }
    if (step === "extracting_local" && extractionProgress) {
      return (extractionProgress.currentPage / extractionProgress.totalPages) * 15;
    }
    return stepProgress[step];
  };

  if (step === "error") {
    const rawError = error || "Erro desconhecido";
    const isOcrTimeout = /CPU Time|non-2xx|escaneado|timeout|AbortError/i.test(rawError);
    return (
      <div className="space-y-4 py-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <p className="text-sm text-destructive">{rawError}</p>
        {isOcrTimeout && (
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Dica: documentos escaneados grandes excedem o limite de processamento. Divida o PDF em arquivos menores (até 5MB cada) usando ferramentas como iLovePDF ou SmallPDF e envie-os separadamente.
          </p>
        )}
        <Button variant="outline" onClick={onRetry}>Tentar novamente</Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-4 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
        <p className="text-lg font-semibold">Documento processado com sucesso!</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/documents")}>
            Ver Documentos
          </Button>
          {documentId && (
            <Button onClick={() => navigate(`/documents/${documentId}`)}>
              Abrir Documento <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <Progress value={getProgressValue()} className="h-3" />
      <div className="flex items-center justify-center gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>{getStepLabel()}</span>
      </div>
      {multiPartProgress && multiPartProgress.totalParts > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          PDF grande detectado — processando em {multiPartProgress.totalParts} partes automaticamente.
        </p>
      )}
    </div>
  );
}
