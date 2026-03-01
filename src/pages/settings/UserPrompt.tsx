import { PromptManager } from "@/components/PromptManager";

export default function UserPrompt() {
  return (
    <PromptManager
      settingKey="user_system_prompt"
      title="Prompt do Usuário (User)"
      placeholder="Digite o prompt da mensagem de usuário que será enviada à IA..."
    />
  );
}
