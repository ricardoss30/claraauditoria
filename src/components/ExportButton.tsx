import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({ onClick, label = "Exportar CSV", disabled }: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
