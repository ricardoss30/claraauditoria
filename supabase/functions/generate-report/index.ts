import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;
    const { data: callerRoles } = await supabaseAuth.from("user_roles").select("role").eq("user_id", callerId);
    if (!callerRoles?.some((r: any) => ["admin", "gestor", "auditor"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from("procurement_documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr) throw docErr;

    // Fetch alerts
    const { data: alerts } = await supabase
      .from("risk_alerts")
      .select("*")
      .eq("document_id", document_id)
      .order("severity", { ascending: false });

    // Fetch knowledge context (keyword-based fallback)
    let knowledgeContext = "";
    try {
      const keywords = [doc.modality, doc.agency, "licitação"].filter(Boolean).join(" ");
      const { data: chunks } = await supabase
        .from("conhecimento_chunks")
        .select("content")
        .limit(5);
      if (chunks?.length) {
        knowledgeContext = chunks.map(c => c.content).join("\n\n").slice(0, 10000);
      }
    } catch { /* ignore */ }

    const valor = doc.estimated_value != null
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(doc.estimated_value)
      : "Não informado";

    const alertsList = (alerts || [])
      .filter((a: any) => a.status !== "dismissed")
      .map((a: any) => `- ${a.title} (Severidade: ${a.severity}/5): ${a.description || ""}. Critério: ${a.criteria || "N/A"}. Evidência: ${a.evidence || "N/A"}. Notas: ${a.review_notes || "N/A"}`)
      .join("\n");

    const systemPrompt = `Você é um auditor fiscal especialista em licitações públicas brasileiras. Gere um relatório de auditoria fiscal completo e profissional com base nos dados fornecidos. Use linguagem técnica formal de auditoria. Cite legislação pertinente (Lei 14.133/2021, Lei 8.666/93, LC 101/2000). Seja detalhado e específico nos achados.`;

    const userPrompt = `Gere um relatório de auditoria fiscal completo para o seguinte documento de licitação:

DADOS DO DOCUMENTO:
- Título: ${doc.title}
- Órgão: ${doc.agency || "Não informado"}
- Modalidade: ${doc.modality || "Não informada"}
- Valor Estimado: ${valor}
- Prazo: ${doc.deadline_at ? new Date(doc.deadline_at).toLocaleDateString("pt-BR") : "Não informado"}
- Descrição: ${doc.description || "Não disponível"}
- Score de Risco: ${doc.risk_score ?? "N/A"}/100
- Status: ${doc.status}

ALERTAS DE RISCO IDENTIFICADOS:
${alertsList || "Nenhum alerta identificado."}

${knowledgeContext ? `CONTEXTO NORMATIVO DA BASE DE CONHECIMENTO:\n${knowledgeContext}` : ""}

Use a função generate_report para retornar o relatório estruturado em 12 seções.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_report",
              description: "Gera relatório de auditoria fiscal estruturado em 12 seções",
              parameters: {
                type: "object",
                properties: {
                  capa: { type: "string", description: "Capa e Identificação do relatório" },
                  sumario: { type: "string", description: "Sumário executivo" },
                  introducao: { type: "string", description: "Introdução com objetivo, escopo e normas" },
                  metodologia: { type: "string", description: "Metodologia de auditoria utilizada" },
                  contextualizacao: { type: "string", description: "Contextualização da situação auditada" },
                  analise_tecnica: { type: "string", description: "Análise técnica detalhada" },
                  constatacoes: { type: "string", description: "Constatações e achados de auditoria" },
                  avaliacao_risco: { type: "string", description: "Avaliação de risco com classificação" },
                  recomendacoes: { type: "string", description: "Recomendações ao órgão auditado" },
                  plano_acao: { type: "string", description: "Plano de ação sugerido com prazos" },
                  conclusao: { type: "string", description: "Conclusão e parecer final" },
                  anexos: { type: "string", description: "Referência a anexos e documentos complementares" },
                },
                required: ["capa", "sumario", "introducao", "metodologia", "contextualizacao", "analise_tecnica", "constatacoes", "avaliacao_risco", "recomendacoes", "plano_acao", "conclusao", "anexos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_report" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    let reportContent: string;
    const args = toolCall.function.arguments;
    if (typeof args === "string") {
      reportContent = args;
    } else {
      reportContent = JSON.stringify(args);
    }

    // Clean markdown fences if present
    reportContent = reportContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(reportContent);

    return new Response(JSON.stringify({ content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
