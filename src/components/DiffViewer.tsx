import { computeDiff } from "@/lib/diff";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

export function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const lines = computeDiff(oldText, newText);

  return (
    <div className="rounded-md border overflow-auto max-h-[60vh] text-xs font-mono">
      {lines.map((l, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-2 px-3 py-0.5 whitespace-pre-wrap break-all",
            l.type === "removed" && "bg-destructive/15 text-destructive",
            l.type === "added" && "bg-green-500/15 text-green-700 dark:text-green-400",
          )}
        >
          <span className="select-none w-5 text-right shrink-0 text-muted-foreground/60">
            {i + 1}
          </span>
          <span className="select-none w-3 shrink-0">
            {l.type === "removed" ? "−" : l.type === "added" ? "+" : " "}
          </span>
          <span className="flex-1">{l.line || " "}</span>
        </div>
      ))}
    </div>
  );
}
