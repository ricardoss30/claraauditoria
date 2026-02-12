import { AppLayout } from "@/components/layout/AppLayout";

export default function Documents() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Documentos</h1>
        <p className="text-muted-foreground">Gerencie documentos de licitação coletados e processados.</p>
      </div>
    </AppLayout>
  );
}
