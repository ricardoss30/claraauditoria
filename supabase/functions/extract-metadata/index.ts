import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'text' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const truncated = text.slice(0, 12000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise de editais de licitação brasileiros. Sua tarefa é extrair metadados estruturados do texto fornecido com a maior precisão possível.

Instruções detalhadas para cada campo:

1. **title**: Procure no cabeçalho ou preâmbulo do documento. Geralmente contém a modalidade e número (ex: "Pregão Eletrônico nº 001/2025", "Concorrência Pública nº 003/2024"). Inclua o número completo.

2. **agency**: O órgão ou entidade responsável pela licitação. Procure no cabeçalho, preâmbulo ou após termos como "O(A)", "A Prefeitura", "O Município", "O Governo", "A Secretaria". Inclua o nome completo do órgão.

3. **modality**: A modalidade da licitação. Valores comuns: "Pregão Eletrônico", "Pregão Presencial", "Concorrência", "Tomada de Preços", "Convite", "Leilão", "Concurso", "Dispensa de Licitação", "Inexigibilidade". Procure no título ou preâmbulo.

4. **estimated_value**: O valor estimado/máximo da contratação. Procure por variações como: "valor estimado", "valor total estimado", "valor global", "valor máximo", "preço máximo", "valor de referência", "montante estimado", "valor total máximo", "R$". Retorne APENAS o número com centavos, sem pontos de milhar, usando ponto como separador decimal (ex: "150000.00"). Se encontrar "R$ 1.500.000,00", retorne "1500000.00".

5. **description**: Resumo do objeto da licitação. Procure após "OBJETO:", "DO OBJETO", "Constitui objeto", "tem por objeto". Máximo 200 caracteres.

6. **published_at**: Data de publicação, abertura ou assinatura do edital. Procure por "Data de publicação", "Publicado em", "Data da sessão", "Data de abertura", ou datas no cabeçalho/rodapé. Retorne no formato YYYY-MM-DD. Se encontrar "15 de março de 2025", retorne "2025-03-15".

IMPORTANTE: Se não encontrar um campo com certeza, retorne string vazia. Não invente dados.`,
          },
          {
            role: "user",
            content: `Extraia os metadados deste edital de licitação:\n\n${truncated}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_metadata",
              description: "Extrai metadados estruturados de um edital de licitação brasileiro",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título completo do edital com modalidade e número" },
                  agency: { type: "string", description: "Órgão ou entidade responsável pela licitação" },
                  modality: { type: "string", description: "Modalidade da licitação" },
                  estimated_value: { type: "string", description: "Valor estimado apenas números com ponto decimal (ex: 150000.00)" },
                  description: { type: "string", description: "Descrição resumida do objeto (máximo 200 caracteres)" },
                  published_at: { type: "string", description: "Data de publicação no formato YYYY-MM-DD" },
                },
                required: ["title", "agency", "modality", "estimated_value", "description", "published_at"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_metadata" } },
        temperature: 0,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway retornou ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta da IA não contém metadados");
    }

    const metadata = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-metadata error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
