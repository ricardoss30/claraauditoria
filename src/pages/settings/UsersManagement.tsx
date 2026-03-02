import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, ShieldCheck, ShieldOff, Pencil, Check, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const allRoles: AppRole[] = ["admin", "gestor", "auditor"];

export default function UsersManagement() {
  const { data, isLoading, addRole, removeRole } = useUsers();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole("admin");
  const isGestor = hasRole("gestor");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // New user dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [creating, setCreating] = useState(false);

  // Filter users based on current user's role
  const filteredUsers = (data ?? []).filter((u: any) => {
    if (isAdmin) return true;
    if (isGestor) {
      if (u.user_id === user?.id) return true;
      return !u.roles.includes("admin");
    }
    return false;
  });

  // Roles that the current user can assign
  const availableRoles: AppRole[] = isAdmin ? allRoles : ["gestor", "auditor"];

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

  const startEdit = (u: any) => {
    setEditingId(u.user_id);
    setEditName(u.full_name ?? "");
  };

  const saveEdit = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName })
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao atualizar nome");
    } else {
      toast.success("Nome atualizado");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
    setEditingId(null);
  };

  const canEditUser = (u: any) => {
    if (isAdmin) return true;
    if (isGestor) {
      return u.user_id === user?.id || u.roles.includes("auditor");
    }
    return false;
  };

  const canManageRoles = (u: any) => {
    if (isAdmin) return true;
    if (isGestor) {
      if (u.user_id === user?.id) return false;
      if (u.roles.includes("admin")) return false;
      return true;
    }
    return false;
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newRole) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: { email: newEmail, password: newPassword, full_name: newFullName, role: newRole },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success("Usuário criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Gestão de Usuários e Roles</CardTitle>
        {(isAdmin || isGestor) && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo Usuário
          </Button>
        )}
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
              {filteredUsers.map((u: any) => {
                const missingRoles = availableRoles.filter((r) => !u.roles.includes(r));
                const canEdit = canEditUser(u);
                const canRoles = canManageRoles(u);

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {editingId === u.user_id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(u.user_id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(u.user_id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{u.full_name ?? "—"}</span>
                          {canEdit && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(u)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length > 0 ? u.roles.map((r: string) => (
                          <Badge key={r} variant="secondary">{r}</Badge>
                        )) : <span className="text-muted-foreground text-sm">Sem roles</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {canRoles && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {missingRoles.map((role) => (
                              <DropdownMenuItem key={`add-${role}`} onClick={() => handleAddRole(u.user_id, role)}>
                                <ShieldCheck className="h-4 w-4 mr-2" /> Adicionar {role}
                              </DropdownMenuItem>
                            ))}
                            {u.roles
                              .filter((role: AppRole) => availableRoles.includes(role))
                              .map((role: AppRole) => (
                                <DropdownMenuItem key={`rm-${role}`} onClick={() => handleRemoveRole(u.user_id, role)} className="text-destructive">
                                  <ShieldOff className="h-4 w-4 mr-2" /> Remover {role}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog Novo Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo usuário no sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-full-name">Nome completo</Label>
              <Input id="new-full-name" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha *</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
