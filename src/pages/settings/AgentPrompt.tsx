import { PromptManager } from "@/components/PromptManager";

export default function AgentPrompt() {
  return (
    <PromptManager
      settingKey="agent_system_prompt"
      title="Prompt do Agente de IA"
      placeholder="Digite o system prompt do agente de IA..."
    />
  );
}
