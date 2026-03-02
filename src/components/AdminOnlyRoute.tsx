import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { hasRole, loading } = useAuth();

  if (loading) return null;

  if (!hasRole("admin")) {
    return <Navigate to="/settings/users" replace />;
  }

  return <>{children}</>;
}
