import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardStepper } from "@/components/wizard/WizardStepper";
import { StepDocumentData, type DocumentMetadata } from "@/components/wizard/StepDocumentData";
import { StepDocumentContent } from "@/components/wizard/StepDocumentContent";
import { StepAuditCriteria } from "@/components/wizard/StepAuditCriteria";
import { StepProcessing } from "@/components/wizard/StepProcessing";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";

const STEPS = [
  { number: 1, label: "Dados do Documento" },
  { number: 2, label: "Conteúdo" },
  { number: 3, label: "Critérios de Auditoria" },
  { number: 4, label: "Processamento" },
];

export default function NewDocument() {
  const [currentStep, setCurrentStep] = useState(1);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: "",
    agency: "",
    modality: "",
    estimated_value: "",
    published_at: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [criteria, setCriteria] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);

  const { upload, step, error, reset, extractionProgress, splitProgress, multiPartProgress } = useDocumentUpload();

  const handleSubmit = async () => {
    setCurrentStep(4);
    const id = await upload({
      file,
      text: text || undefined,
      audit_criteria: criteria,
      metadata: {
        title: metadata.title,
        agency: metadata.agency || undefined,
        modality: metadata.modality || undefined,
        estimated_value: metadata.estimated_value ? parseFloat(metadata.estimated_value) : undefined,
        published_at: metadata.published_at || undefined,
        description: metadata.description || undefined,
      },
    });
    if (id) setDocumentId(id);
  };

  const handleRetry = () => {
    reset();
    setCurrentStep(3);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Novo Documento</h1>

        <Card>
          <CardHeader className="pb-2">
            <WizardStepper steps={STEPS} currentStep={currentStep} />
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <StepDocumentData
                data={metadata}
                onChange={setMetadata}
                onNext={() => setCurrentStep(2)}
                file={file}
                text={text}
                onFileChange={setFile}
                onTextChange={setText}
              />
            )}
            {currentStep === 2 && (
              <StepDocumentContent
                file={file}
                text={text}
                onFileChange={setFile}
                onTextChange={setText}
                onNext={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
              />
            )}
            {currentStep === 3 && (
              <StepAuditCriteria
                criteria={criteria}
                onChange={setCriteria}
                onSubmit={handleSubmit}
                onBack={() => setCurrentStep(2)}
              />
            )}
            {currentStep === 4 && (
              <StepProcessing
                step={step}
                error={error}
                documentId={documentId}
                extractionProgress={extractionProgress}
                splitProgress={splitProgress}
                multiPartProgress={multiPartProgress}
                onRetry={handleRetry}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
