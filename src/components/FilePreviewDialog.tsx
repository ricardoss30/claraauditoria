import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePreviewDialogProps {
  file: { name: string; url: string; type: string } | null;
  onClose: () => void;
}

export function FilePreviewDialog({ file, onClose }: FilePreviewDialogProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) { setTextContent(null); return; }
    if (file.type !== "txt") return;

    setLoading(true);
    fetch(file.url)
      .then((r) => r.text())
      .then((t) => setTextContent(t))
      .catch(() => setTextContent("Erro ao carregar o arquivo."))
      .finally(() => setLoading(false));
  }, [file]);

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file?.name}
            {file && <Badge variant="secondary">{file.type.toUpperCase()}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {file?.type === "pdf" && (
            <iframe
              src={file.url}
              className="w-full h-full rounded-md border"
              title={file.name}
            />
          )}

          {file?.type === "txt" && (
            <ScrollArea className="h-full rounded-md border p-4">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <pre className="text-sm font-mono whitespace-pre-wrap text-foreground">
                  {textContent}
                </pre>
              )}
            </ScrollArea>
          )}

          {file?.type === "docx" && (
            <div className="flex items-center justify-center h-full">
              <Badge variant="outline">Preview não disponível para DOCX</Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
