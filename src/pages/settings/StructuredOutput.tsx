import { PromptManager } from "@/components/PromptManager";

export default function StructuredOutput() {
  return (
    <PromptManager
      settingKey="structured_output_prompt"
      title="Saída Estruturada (Tool Calling)"
      placeholder="Digite a descrição da saída estruturada / tool calling..."
    />
  );
}
