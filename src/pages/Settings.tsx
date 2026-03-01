import { AppLayout } from "@/components/layout/AppLayout";
import { useUsers } from "@/hooks/useUsers";
import { AgentPromptManager } from "@/components/AgentPromptManager";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const allRoles: AppRole[] = ["admin", "gestor", "auditor"];

export default function Settings() {
  const { data, isLoading, addRole, removeRole } = useUsers();
  const { hasRole } = useAuth();

  if (!hasRole("admin")) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  const handleAddRole = (user_id: string, role: AppRole) => {
    addRole.mutate({ user_id, role }, {
      onSuccess: () => toast.success(`Role ${role} adicionada`),
      onError: () => toast.error("Erro ao adicionar role"),
    });
  };

  const handleRemoveRole = (user_id: string, role: AppRole) => {
    removeRole.mutate({ user_id, role }, {
      onSuccess: () => toast.success(`Role ${role} removida`),
      onError: () => toast.error("Erro ao remover role"),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestão de Usuários e Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((user: any) => {
                    const missingRoles = allRoles.filter((r) => !user.roles.includes(r));
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? user.roles.map((r: string) => (
                              <Badge key={r} variant="secondary">{r}</Badge>
                            )) : <span className="text-muted-foreground text-sm">Sem roles</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {missingRoles.map((role) => (
                                <DropdownMenuItem key={`add-${role}`} onClick={() => handleAddRole(user.user_id, role)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" /> Adicionar {role}
                                </DropdownMenuItem>
                              ))}
                              {user.roles.map((role: AppRole) => (
                                <DropdownMenuItem key={`rm-${role}`} onClick={() => handleRemoveRole(user.user_id, role)} className="text-destructive">
                                  <ShieldOff className="h-4 w-4 mr-2" /> Remover {role}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AgentPromptManager />
      </div>
    </AppLayout>
  );
}
