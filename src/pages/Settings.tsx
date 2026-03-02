import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate, useLocation } from "react-router-dom";

export default function Settings() {
  const { hasAnyRole } = useAuth();
  const location = useLocation();

  if (!hasAnyRole(["admin", "gestor"])) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores e gestores.</p>
        </div>
      </AppLayout>
    );
  }

  if (location.pathname === "/settings") {
    return <Navigate to="/settings/users" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <Outlet />
      </div>
    </AppLayout>
  );
}
