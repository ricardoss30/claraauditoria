import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminOnlyRoute } from "@/components/AdminOnlyRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Alerts from "./pages/Alerts";
import Rules from "./pages/Rules";
import Sources from "./pages/Sources";
import Settings from "./pages/Settings";
import DocumentDetail from "./pages/DocumentDetail";
import AuditLogs from "./pages/AuditLogs";
import AuditReport from "./pages/AuditReport";
import NotFound from "./pages/NotFound";
import UsersManagement from "./pages/settings/UsersManagement";
import AgentPrompt from "./pages/settings/AgentPrompt";
import UserPrompt from "./pages/settings/UserPrompt";
import StructuredOutput from "./pages/settings/StructuredOutput";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
              <Route path="/documents/:id/report" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
              <Route path="/documents/:id/report/:reportId" element={<ProtectedRoute><AuditReport /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
              <Route path="/sources" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>}>
                <Route path="users" element={<UsersManagement />} />
                <Route path="prompts/agent" element={<AdminOnlyRoute><AgentPrompt /></AdminOnlyRoute>} />
                <Route path="prompts/user" element={<AdminOnlyRoute><UserPrompt /></AdminOnlyRoute>} />
                <Route path="prompts/structured-output" element={<AdminOnlyRoute><StructuredOutput /></AdminOnlyRoute>} />
              </Route>
              <Route path="/audit" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
