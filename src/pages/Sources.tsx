import { useState, useRef, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { getFileUrl, embedFile } from "@/services/knowledgeBaseService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FolderPlus, Upload, Folder, FileText, Download, Trash2, Database, Eye, Search } from "lucide-react";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.txt,.docx";

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "";
}

export default function Sources() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "gestor"]);

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const folder = currentPath.join("/");
  const { files, isLoading, uploadMutation, deleteMutation, createFolderMutation, deleteFolderMutation } = useKnowledgeBase(folder);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Separate folders and files, hide placeholders
  const allFolders = files.filter((f) => f.id === null && f.name !== ".emptyFolderPlaceholder");
  const allRealFiles = files.filter((f) => f.id !== null && f.name !== ".emptyFolderPlaceholder");

  // Apply search filter
  const folders = useMemo(() => {
    if (!searchQuery.trim()) return allFolders;
    const q = searchQuery.toLowerCase();
    return allFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [allFolders, searchQuery]);

  const realFiles = useMemo(() => {
    if (!searchQuery.trim()) return allRealFiles;
    const q = searchQuery.toLowerCase();
    return allRealFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [allRealFiles, searchQuery]);

  const navigateToFolder = (name: string) => setCurrentPath((prev) => [...prev, name]);
  const navigateToBreadcrumb = (index: number) => setCurrentPath((prev) => prev.slice(0, index));

  const handleUpload = (uploadFiles: FileList | null) => {
    if (!uploadFiles) return;
    const validFiles = Array.from(uploadFiles).filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (validFiles.length === 0) {
      toast.error("Apenas PDF, TXT e DOCX são aceitos.");
      return;
    }
    Promise.all(
      validFiles.map((file) => {
        const path = folder ? `${folder}/${file.name}` : file.name;
        return uploadMutation.mutateAsync({ file, path });
      })
    )
      .then(async () => {
        toast.success(`${validFiles.length} arquivo(s) enviado(s)`);
        setUploadOpen(false);
        // Trigger embedding for each uploaded file
        for (const file of validFiles) {
          const path = folder ? `${folder}/${file.name}` : file.name;
          embedFile(path, "upsert").catch((e) => console.error("Embed failed:", e));
        }
        toast.info("Gerando embeddings vetoriais...");
      })
      .catch(() => toast.error("Erro ao enviar arquivo(s)"));
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    const path = folder ? `${folder}/${folderName.trim()}` : folderName.trim();
    createFolderMutation.mutate(path, {
      onSuccess: () => { toast.success("Pasta criada"); setFolderOpen(false); setFolderName(""); },
      onError: () => toast.error("Erro ao criar pasta"),
    });
  };

  const handleDelete = (name: string, isFolder: boolean) => {
    const path = folder ? `${folder}/${name}` : name;
    if (isFolder) {
      deleteFolderMutation.mutate(path, {
        onSuccess: () => toast.success("Pasta removida"),
        onError: () => toast.error("Erro ao remover pasta"),
      });
    } else {
      deleteMutation.mutate(path, {
        onSuccess: () => {
          toast.success("Arquivo removido");
          embedFile(path, "delete").catch((e) => console.error("Delete chunks failed:", e));
        },
        onError: () => toast.error("Erro ao remover arquivo"),
      });
    }
  };

  const handleDownload = async (name: string) => {
    const path = folder ? `${folder}/${name}` : name;
    const url = await getFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Erro ao gerar link de download");
  };

  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);

  const handlePreview = async (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "txt"].includes(ext)) return;
    const path = folder ? `${folder}/${name}` : name;
    const url = await getFileUrl(path);
    if (url) setPreviewFile({ name, url, type: ext });
    else toast.error("Erro ao gerar link de preview");
  };
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFolderOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />Nova Pasta
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />Upload Arquivo
              </Button>
            </div>
          )}
        </div>

        {/* Search + Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar arquivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {currentPath.length > 0 ? (
                <BreadcrumbLink className="cursor-pointer" onClick={() => navigateToBreadcrumb(0)}>Home</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Home</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {currentPath.map((segment, i) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {i < currentPath.length - 1 ? (
                    <BreadcrumbLink className="cursor-pointer" onClick={() => navigateToBreadcrumb(i + 1)}>{segment}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* File list */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : folders.length === 0 && realFiles.length === 0 ? (
          <EmptyState icon={Database} title="Pasta vazia" description="Crie pastas ou faça upload de arquivos para a base de conhecimento." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[100px]">Tamanho</TableHead>
                  <TableHead className="w-[140px]">Modificado</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map((f) => (
                  <TableRow key={f.name} className="cursor-pointer" onClick={() => navigateToFolder(f.name)}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      {f.name}
                    </TableCell>
                    <TableCell><Badge variant="outline">Pasta</Badge></TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(f.name, true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {realFiles.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {f.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getFileExtension(f.name)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatBytes((f.metadata as any)?.size ?? 0)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {f.updated_at ? new Date(f.updated_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {["pdf", "txt"].includes(getFileExtension(f.name).toLowerCase()) && (
                          <Button size="icon" variant="ghost" onClick={() => handlePreview(f.name)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDownload(f.name)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(f.name, false)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload de Arquivo</DialogTitle></DialogHeader>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mb-4">PDF, TXT, DOCX</p>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Enviando..." : "Selecionar Arquivos"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog */}
        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
            <div>
              <Label>Nome da pasta</Label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Ex: contratos-2024" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFolderOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateFolder} disabled={!folderName.trim() || createFolderMutation.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* File Preview Dialog */}
        <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    </AppLayout>
  );
}
