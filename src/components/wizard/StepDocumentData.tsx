import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { toast } from "sonner";

export interface DocumentMetadata {
  title: string;
  agency: string;
  modality: string;
  estimated_value: string;
  published_at: string;
  description: string;
}

interface Props {
  data: DocumentMetadata;
  onChange: (data: DocumentMetadata) => void;
  onNext: () => void;
  file: File | null;
  text: string;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
}

export function StepDocumentData({ data, onChange, onNext, file, text, onFileChange, onTextChange }: Props) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);

  const update = (field: keyof DocumentMetadata, value: string) =>
    onChange({ ...data, [field]: value });

  const extractMetadata = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsExtracting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("extract-metadata", {
        body: { text: content.slice(0, 5000) },
      });

      if (error) throw error;

      if (result) {
        onChange({
          title: result.title || data.title,
          agency: result.agency || data.agency,
          modality: result.modality || data.modality,
          estimated_value: result.estimated_value || data.estimated_value,
          published_at: data.published_at,
          description: result.description || data.description,
        });
        setExtractionDone(true);
        toast.success("Metadados extraídos automaticamente!");
      }
    } catch (err) {
      console.error("Erro na extração de metadados:", err);
      toast.error("Não foi possível extrair metadados automaticamente. Preencha manualmente.");
    } finally {
      setIsExtracting(false);
    }
  }, [data, onChange]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    onFileChange(selectedFile);
    if (selectedFile.type === "application/pdf") {
      try {
        setIsExtracting(true);
        const extractedText = await extractTextFromPdf(selectedFile);
        if (extractedText.length > 100) {
          onTextChange(extractedText);
          await extractMetadata(extractedText);
        } else {
          toast.info("PDF com pouco texto extraível. Preencha os campos manualmente.");
          setIsExtracting(false);
        }
      } catch {
        toast.error("Erro ao ler o PDF.");
        setIsExtracting(false);
      }
    }
  }, [onFileChange, onTextChange, extractMetadata]);

  const handleTextPaste = useCallback(async (pastedText: string) => {
    onTextChange(pastedText);
    if (pastedText.trim().length > 50) {
      await extractMetadata(pastedText);
    }
  }, [onTextChange, extractMetadata]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  return (
    <div className="space-y-5">
      {/* Upload / Colar texto */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Envie o edital para preenchimento automático
        </Label>
        <p className="text-sm text-muted-foreground">
          Faça upload de um PDF ou cole o texto do edital. Os campos abaixo serão preenchidos automaticamente.
        </p>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload de Arquivo
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Colar Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleFileSelect(f);
                };
                input.click();
              }}
            >
              {isExtracting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Extraindo dados do documento...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {extractionDone ? "✓ Metadados extraídos" : "Clique para trocar"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste um PDF aqui ou clique para selecionar
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="text">
            <Textarea
              placeholder="Cole o texto do edital aqui..."
              rows={5}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              disabled={isExtracting}
            />
            {text.trim().length > 50 && !isExtracting && !extractionDone && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => extractMetadata(text)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Extrair metadados
              </Button>
            )}
            {isExtracting && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extraindo dados...
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Formulário de metadados */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="doc-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="doc-title"
            placeholder="Ex: Pregão Eletrônico nº 001/2025"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1"
            disabled={isExtracting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="doc-agency">Órgão</Label>
            <Input
              id="doc-agency"
              placeholder="Ex: Ministério da Saúde"
              value={data.agency}
              onChange={(e) => update("agency", e.target.value)}
              className="mt-1"
              disabled={isExtracting}
            />
          </div>
          <div>
            <Label htmlFor="doc-modality">Modalidade</Label>
            <Input
              id="doc-modality"
              placeholder="Ex: Pregão Eletrônico"
              value={data.modality}
              onChange={(e) => update("modality", e.target.value)}
              className="mt-1"
              disabled={isExtracting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="doc-value">Valor Estimado (R$)</Label>
            <Input
              id="doc-value"
              type="number"
              placeholder="Ex: 150000.00"
              value={data.estimated_value}
              onChange={(e) => update("estimated_value", e.target.value)}
              className="mt-1"
              disabled={isExtracting}
            />
          </div>
          <div>
            <Label htmlFor="doc-date">Data de Publicação</Label>
            <Input
              id="doc-date"
              type="date"
              value={data.published_at}
              onChange={(e) => update("published_at", e.target.value)}
              className="mt-1"
              disabled={isExtracting}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="doc-desc">Descrição</Label>
          <Textarea
            id="doc-desc"
            placeholder="Descrição resumida do documento..."
            rows={3}
            value={data.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1"
            disabled={isExtracting}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!data.title.trim() || isExtracting}>
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
