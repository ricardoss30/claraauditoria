import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse/lib/pdf-parse.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractPdfText(supabase: any, documentId: string): Promise<string> {
  // Fetch file_url from the document record
  const { data: doc, error: docErr } = await supabase
    .from("procurement_documents")
    .select("file_url")
    .eq("id", documentId)
    .single();

  if (docErr || !doc?.file_url) {
    throw new Error("Não foi possível encontrar o arquivo do documento no banco de dados");
  }

  // Download the PDF from storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from("documents")
    .download(doc.file_url);

  if (downloadErr || !fileData) {
    throw new Error(`Erro ao baixar o PDF do Storage: ${downloadErr?.message || "arquivo não encontrado"}`);
  }

  // Extract text using pdf-parse
  const arrayBuffer = await fileData.arrayBuffer();
  const pdfData = await pdf(arrayBuffer);
  const text = pdfData.text?.trim();

  if (!text) {
    throw new Error("Não foi possível extrair texto do PDF. O arquivo pode estar escaneado ou protegido.");
  }

  console.log(`PDF text extracted: ${text.length} characters from ${doc.file_url}`);
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { document_id, content: rawContent } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    // Update status to processing
    await supabase.from("procurement_documents").update({ status: "processing" }).eq("id", document_id);

    // Determine actual content - extract from PDF if placeholder
    let content = rawContent || "";
    if (!content.trim() || content.trim().startsWith("[Arquivo PDF:")) {
      console.log("Detected PDF placeholder, extracting text from storage...");
      content = await extractPdfText(supabase, document_id);

      // Update raw_content in database with the real extracted text
      await supabase.from("procurement_documents")
        .update({ raw_content: content })
        .eq("id", document_id);
    }

    if (!content.trim()) throw new Error("Nenhum conteúdo disponível para análise");

    // Fetch active rules
    const { data: rules } = await supabase.from("risk_rules").select("*").eq("is_active", true);
    const rulesContext = (rules || [])
      .map((r: any) => `- ${r.name} (${r.category}, severidade ${r.severity}): ${r.description || ""}`)
      .join("\n");

    // Call Lovable AI with tool calling for structured extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Voce e um especialista em analise de licitacoes publicas brasileiras. Sua tarefa e:
1. Extrair dados estruturados do documento de licitacao
2. Analisar riscos com base nas regras ativas fornecidas
3. Gerar alertas para cada risco identificado

Regras ativas para analise:
${rulesContext || "Nenhuma regra ativa cadastrada."}

Analise o documento com atencao especial a:
- Sobrepreco: valores acima do mercado
- Direcionamento de marca: mencoes a marcas especificas sem justificativa
- Prazo exiguo: prazos muito curtos para o tipo de licitacao
- Irregularidades em geral`,
          },
          {
            role: "user",
            content: `Analise o seguinte documento de licitacao:\n\n${content.substring(0, 30000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_document_analysis",
              description: "Retorna a extracao de dados e analise de risco do documento de licitacao",
              parameters: {
                type: "object",
                properties: {
                  extracted_data: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Titulo da licitacao" },
                      agency: { type: "string", description: "Orgao responsavel" },
                      modality: { type: "string", description: "Modalidade (pregao, concorrencia, tomada de precos, etc)" },
                      estimated_value: { type: "number", description: "Valor estimado em reais" },
                      deadline: { type: "string", description: "Data limite no formato YYYY-MM-DD" },
                      description: { type: "string", description: "Descricao resumida do objeto da licitacao" },
                    },
                    required: ["title", "agency", "modality", "description"],
                  },
                  risk_score: {
                    type: "number",
                    description: "Score de risco de 0 a 100, onde 0 e sem risco e 100 e risco maximo",
                  },
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        alert_type: { type: "string", description: "Tipo: sobrepreco, direcionamento, prazo_exiguo, irregularidade" },
                        title: { type: "string", description: "Titulo curto do alerta" },
                        description: { type: "string", description: "Descricao detalhada do risco identificado" },
                        severity: { type: "number", description: "Severidade de 1 a 5" },
                        evidence: { type: "string", description: "Trecho do documento que evidencia o risco" },
                      },
                      required: ["alert_type", "title", "description", "severity"],
                    },
                    description: "Lista de alertas de risco identificados. Pode ser vazia se nenhum risco foi encontrado.",
                  },
                },
                required: ["extracted_data", "risk_score", "alerts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_document_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);

      if (status === 429) {
        await supabase.from("procurement_documents").update({
          status: "error",
          extracted_data: { error: "Rate limit excedido. Tente novamente em alguns minutos." },
        }).eq("id", document_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        await supabase.from("procurement_documents").update({
          status: "error",
          extracted_data: { error: "Creditos insuficientes. Adicione creditos ao workspace." },
        }).eq("id", document_id);
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);
    const { extracted_data, risk_score, alerts } = result;

    // Match alerts to rules
    const ruleMap = new Map((rules || []).map((r: any) => [r.category, r]));
    const legacyMap: Record<string, string> = {
      financeiro: "sobrepreco",
      competitividade: "direcionamento",
      temporal: "prazo_exiguo",
    };
    for (const [legacy, modern] of Object.entries(legacyMap)) {
      const rule = ruleMap.get(legacy);
      if (rule && !ruleMap.has(modern)) ruleMap.set(modern, rule);
    }

    // Update document with extracted data
    await supabase.from("procurement_documents").update({
      title: extracted_data.title || undefined,
      agency: extracted_data.agency || undefined,
      modality: extracted_data.modality || undefined,
      estimated_value: extracted_data.estimated_value || undefined,
      deadline_at: extracted_data.deadline || undefined,
      description: extracted_data.description || undefined,
      extracted_data: extracted_data,
      risk_score: Math.min(100, Math.max(0, Math.round(risk_score))),
      status: "processed",
    }).eq("id", document_id);

    // Create alerts
    if (alerts && alerts.length > 0) {
      const alertRows = alerts.map((a: any) => {
        const matchedRule = ruleMap.get(a.alert_type);
        return {
          document_id,
          alert_type: a.alert_type,
          title: a.title,
          description: a.description,
          severity: Math.min(5, Math.max(1, a.severity)),
          evidence: a.evidence || null,
          rule_id: matchedRule?.id || null,
          status: "pending",
        };
      });
      const { data: insertedAlerts } = await supabase.from("risk_alerts").insert(alertRows).select("id, title, severity, evidence");

      // Send notifications for high-severity alerts
      const criticalAlerts = (insertedAlerts || []).filter((a: any) => a.severity >= 4);
      for (const alert of criticalAlerts) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              alert_id: alert.id,
              alert_title: alert.title,
              document_title: extracted_data.title,
              severity: alert.severity,
              evidence: alert.evidence,
            }),
          });
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
      }

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "upload",
        resource_type: "document",
        resource_id: document_id,
        details: { risk_score, alerts_count: alerts.length },
      });
    }

    // Save to cache
    await supabase.from("text_analysis_cache").insert({
      document_id,
      analysis_type: "full_extraction",
      result: result,
      model_used: "google/gemini-3-flash-preview",
      tokens_used: aiData.usage?.total_tokens || null,
    });

    return new Response(JSON.stringify({ success: true, risk_score, alerts_count: alerts?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);

    try {
      const { document_id } = await req.clone().json().catch(() => ({}));
      if (document_id) {
        await supabase.from("procurement_documents").update({
          status: "error",
          extracted_data: { error: e instanceof Error ? e.message : "Erro desconhecido" },
        }).eq("id", document_id);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
