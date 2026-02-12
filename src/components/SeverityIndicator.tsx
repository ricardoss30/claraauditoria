import { cn } from "@/lib/utils";

export function SeverityIndicator({ severity }: { severity: number }) {
  const colors = [
    "bg-[hsl(var(--clara-success))]",
    "bg-[hsl(152,60%,50%)]",
    "bg-[hsl(var(--clara-warning))]",
    "bg-[hsl(25,90%,50%)]",
    "bg-destructive",
  ];
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full",
            i < severity ? colors[severity - 1] : "bg-muted"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{severity}/5</span>
    </div>
  );
}
