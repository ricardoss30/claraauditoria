import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play } from "lucide-react";

interface Props {
  criteria: string;
  onChange: (criteria: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepAuditCriteria({ criteria, onChange, onSubmit, onBack }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="audit-criteria">
          Critérios de Análise de Auditoria <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="audit-criteria"
          placeholder="Descreva a metodologia e técnicas de auditoria a serem aplicadas na análise deste documento. Ex: Verificar conformidade com a Lei 14.133/2021, analisar sobrepreço com base em tabela SINAPI..."
          rows={6}
          value={criteria}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          A IA usará esses critérios como parâmetros para avaliação do documento.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onSubmit} disabled={!criteria.trim()}>
          <Play className="h-4 w-4 mr-2" /> Processar
        </Button>
      </div>
    </div>
  );
}
