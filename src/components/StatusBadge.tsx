import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  processing: { label: "Processando", className: "bg-[hsl(var(--clara-warning))]/15 text-[hsl(var(--clara-warning))] border-[hsl(var(--clara-warning))]/30" },
  processed: { label: "Processado", className: "bg-[hsl(var(--clara-success))]/15 text-[hsl(var(--clara-success))] border-[hsl(var(--clara-success))]/30" },
  error: { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/30" },
  under_review: { label: "Em Revisão", className: "bg-[hsl(var(--clara-warning))]/15 text-[hsl(var(--clara-warning))] border-[hsl(var(--clara-warning))]/30" },
  confirmed: { label: "Confirmado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  dismissed: { label: "Descartado", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={cn("font-medium", config.className)}>{config.label}</Badge>;
}
