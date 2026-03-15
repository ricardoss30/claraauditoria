import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOPWORDS = new Set([
  "a","o","e","de","da","do","em","um","uma","que","para","com","no","na","por","se","os","as",
  "dos","das","ao","aos","mais","mas","como","foi","são","está","tem","ter","ser","seu","sua",
  "ou","quando","muito","nos","já","eu","também","só","pelo","pela","até","isso","ela","ele",
  "entre","depois","sem","mesmo","aos","seus","quem","nas","me","esse","eles","você","essa",
  "num","nem","suas","meu","minha","numa","sobre","qual","lhe","deles","delas","esta","este",
  "aqui","onde","bem","há","dia","era","vez","ali","porque","cada","lá","ainda","não","sim",
  "é","são","foi","será","será","pode","podem","deve","devem","todos","todas","todo","toda",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // RAG: keyword search on conhecimento_chunks
    let ragContext = "";
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg) {
      const keywords = extractKeywords(lastUserMsg.content);
      if (keywords.length > 0) {
        const orFilter = keywords.map(k => `content.ilike.%${k}%`).join(",");
        const { data: chunks } = await adminClient
          .from("conhecimento_chunks")
          .select("content, file_name")
          .or(orFilter)
          .limit(10);

        if (chunks && chunks.length > 0) {
          let ctx = "";
          for (const chunk of chunks) {
            const entry = `[${chunk.file_name}]: ${chunk.content}\n---\n`;
            if (ctx.length + entry.length > 8000) break;
            ctx += entry;
          }
          ragContext = ctx;
        }
      }
    }

    const systemPrompt = `Você é a Clara, assistente de IA especializada em auditoria de conformidade, licitações públicas e contratos administrativos no Brasil.

Seu papel é ajudar auditores, gestores e analistas durante o processo de auditoria, respondendo dúvidas sobre:
- Legislação de licitações (Lei 14.133/2021, Lei 8.666/93, Lei do Pregão)
- Conformidade de editais e contratos públicos
- Análise de riscos em processos licitatórios
- Boas práticas de auditoria governamental
- Interpretação de cláusulas contratuais
- Tribunal de Contas e órgãos de controle

Responda sempre em português brasileiro, de forma clara e objetiva. Quando relevante, cite a legislação aplicável.${
      ragContext
        ? `\n\n## Base de Conhecimento\nUse os trechos abaixo como referência para suas respostas quando relevante:\n\n${ragContext}`
        : ""
    }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
