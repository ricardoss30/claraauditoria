import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Shield, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentos Analisados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">0</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-clara-warning" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">0</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Regras Ativas</CardTitle>
              <Shield className="h-4 w-4 text-clara-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">3</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Precisão</CardTitle>
              <TrendingUp className="h-4 w-4 text-clara-success" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">—</p></CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
