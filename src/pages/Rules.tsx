import { AppLayout } from "@/components/layout/AppLayout";

export default function Rules() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Regras de Risco</h1>
        <p className="text-muted-foreground">Configure regras parametrizadas para análise automática de documentos.</p>
      </div>
    </AppLayout>
  );
}
