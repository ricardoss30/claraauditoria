import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatBot } from "@/components/chatbot/ChatBot";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [showChat, setShowChat] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b bg-card px-4">
            <SidebarTrigger />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showChat ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowChat(v => !v)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assistente IA</TooltipContent>
            </Tooltip>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
      {showChat && <ChatBot onClose={() => setShowChat(false)} />}
    </SidebarProvider>
  );
}
