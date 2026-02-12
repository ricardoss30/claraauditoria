import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RiskScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-sm">—</span>;
  const className = score <= 30
    ? "bg-[hsl(var(--clara-success))]/15 text-[hsl(var(--clara-success))] border-[hsl(var(--clara-success))]/30"
    : score <= 60
    ? "bg-[hsl(var(--clara-warning))]/15 text-[hsl(var(--clara-warning))] border-[hsl(var(--clara-warning))]/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return <Badge variant="outline" className={cn("font-bold", className)}>{score}</Badge>;
}
