import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  file: File | null;
  text: string;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDocumentContent({ file, text, onFileChange, onTextChange, onNext, onBack }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type === "text/plain")) onFileChange(f);
  };

  const canAdvance = !!file || !!text.trim();

  return (
    <div className="space-y-5">
      <Tabs defaultValue="file">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload de Arquivo</TabsTrigger>
          <TabsTrigger value="text">Colar Texto</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-3 mt-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
            ) : (
              <>
                <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">PDF ou texto</p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-3 mt-4">
          <Textarea
            placeholder="Cole o texto do edital aqui..."
            rows={8}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={!canAdvance}>
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
