import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, ShieldCheck, ShieldOff, Pencil, Trash2, UserPlus } from "lucide-react";
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

  // New user dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [creating, setCreating] = useState(false);

  // Edit user dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete user dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const canEditUser = (u: any) => {
    if (isAdmin) return true;
    if (isGestor) {
      return u.user_id === user?.id || !u.roles.includes("admin");
    }
    return false;
  };

  const canDeleteUser = (u: any) => {
    if (u.user_id === user?.id) return false;
    if (isAdmin) return true;
    if (isGestor) return !u.roles.includes("admin");
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

  const openEditDialog = (u: any) => {
    setEditUserId(u.user_id);
    setEditName(u.full_name ?? "");
    setEditEmail(u.email ?? "");
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editUserId) return;
    setSaving(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "update", user_id: editUserId, full_name: editName, email: editEmail },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success("Usuário atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (u: any) => {
    setDeleteUserId(u.user_id);
    setDeleteUserName(u.full_name ?? u.email ?? "este usuário");
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setDeleting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", user_id: deleteUserId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success("Usuário excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(false);
    }
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
                const canDelete = canDeleteUser(u);
                const canRoles = canManageRoles(u);
                const showActions = canEdit || canDelete || canRoles;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <span>{u.full_name ?? "—"}</span>
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
                      {showActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar usuário
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => openDeleteDialog(u)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir usuário
                              </DropdownMenuItem>
                            )}
                            {(canEdit || canDelete) && canRoles && <DropdownMenuSeparator />}
                            {canRoles && missingRoles.map((role) => (
                              <DropdownMenuItem key={`add-${role}`} onClick={() => handleAddRole(u.user_id, role)}>
                                <ShieldCheck className="h-4 w-4 mr-2" /> Adicionar {role}
                              </DropdownMenuItem>
                            ))}
                            {canRoles && u.roles
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

      {/* Dialog Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Nome completo</Label>
              <Input id="edit-full-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Excluir Usuário */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUserName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
