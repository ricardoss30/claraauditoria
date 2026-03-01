import { LayoutDashboard, FileText, AlertTriangle, Shield, Database, Settings, LogOut, ClipboardList, Users, Bot, User, Code, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Documentos", url: "/documents", icon: FileText },
  { title: "Alertas", url: "/alerts", icon: AlertTriangle },
  { title: "Regras", url: "/rules", icon: Shield },
  { title: "Fontes de Dados", url: "/sources", icon: Database },
];

const promptItems = [
  { title: "Prompt do Agente", url: "/settings/prompts/agent", icon: Bot },
  { title: "Prompt do Usuário", url: "/settings/prompts/user", icon: User },
  { title: "Saída Estruturada", url: "/settings/prompts/structured-output", icon: Code },
];

const linkClass = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent";
const activeClass = "bg-sidebar-accent text-sidebar-primary font-medium";

export function AppSidebar() {
  const { user, hasRole, hasAnyRole, signOut } = useAuth();
  const location = useLocation();
  const isSettingsActive = location.pathname.startsWith("/settings");
  const isPromptActive = location.pathname.startsWith("/settings/prompts");

  return (
    <Sidebar>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Shield className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-foreground">C.L.A.R.A</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={linkClass} activeClassName={activeClass}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {hasAnyRole(["admin", "auditor"]) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/audit" className={linkClass} activeClassName={activeClass}>
                      <ClipboardList className="h-4 w-4" />
                      <span>Auditoria</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole("admin") && (
          <SidebarGroup>
            <Collapsible defaultOpen={isSettingsActive}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <span className="flex items-center gap-2"><Settings className="h-3.5 w-3.5" /> Configurações</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/settings/users" className={linkClass} activeClassName={activeClass}>
                          <Users className="h-4 w-4" />
                          <span>Gestão de Usuários</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Nested collapsible for prompts */}
                    <li>
                      <Collapsible defaultOpen={isPromptActive}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
                          <span className="flex items-center gap-2"><Bot className="h-4 w-4" /> Gerenciamento de Prompt</span>
                          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4 border-l border-sidebar-border pl-2">
                            {promptItems.map((item) => (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                  <NavLink to={item.url} className={linkClass} activeClassName={activeClass}>
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="mb-2 truncate text-xs text-sidebar-foreground/70">{user?.email}</div>
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
