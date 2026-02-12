import { AppLayout } from "@/components/layout/AppLayout";

export default function Alerts() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Alertas de Risco</h1>
        <p className="text-muted-foreground">Visualize e gerencie alertas gerados pela análise automática.</p>
      </div>
    </AppLayout>
  );
}
