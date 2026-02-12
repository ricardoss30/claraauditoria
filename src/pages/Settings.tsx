import { AppLayout } from "@/components/layout/AppLayout";

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie usuários, roles e configurações do sistema.</p>
      </div>
    </AppLayout>
  );
}
