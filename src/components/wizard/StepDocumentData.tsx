import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
}

export function StepDocumentData({ data, onChange, onNext }: Props) {
  const update = (field: keyof DocumentMetadata, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <Label htmlFor="doc-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="doc-title"
            placeholder="Ex: Pregão Eletrônico nº 001/2025"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1"
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
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!data.title.trim()}>
          Próximo <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
