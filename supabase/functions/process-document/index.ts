import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractPdfText(supabase: any, documentId: string, lovableApiKey: string): Promise<string> {
  const { data: doc, error: docErr } = await supabase
    .from("procurement_documents")
    .select("file_url")
    .eq("id", documentId)
    .single();

  if (docErr || !doc?.file_url) {
    throw new Error("Não foi possível encontrar o arquivo do documento no banco de dados");
  }

  const { data: fileData, error: downloadErr } = await supabase.storage
    .from("documents")
    .download(doc.file_url);

  if (downloadErr || !fileData) {
    throw new Error(`Erro ao baixar o PDF do Storage: ${downloadErr?.message || "arquivo não encontrado"}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();
  let text = "";
  try {
    const { text: extractedText } = await extractText(new Uint8Array(arrayBuffer));
    text = Array.isArray(extractedText) ? extractedText.join("\n").trim() : (extractedText || "").toString().trim();
  } catch (pdfErr: any) {
    console.error("PDF extraction error (unpdf):", pdfErr.message);
  }

  if (!text) {
    // Fallback: try reading as raw text
    try {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = decoder.decode(new Uint8Array(arrayBuffer));
      const readable = rawText.match(/[\x20-\x7E\xC0-\xFF]{10,}/g);
      if (readable && readable.length > 5) {
        const candidate = readable.join(" ").trim();
        // Quality check: detect PDF structural metadata
        const pdfMarkers = ["/Filter", "/FlateDecode", "/Length", "/Type", "/Page", "/obj", "endobj", "/Font", "/MediaBox", "/Resources"];
        const markerCount = pdfMarkers.filter(m => candidate.includes(m)).length;
        if (markerCount >= 3) {
          console.log(`Fallback text contains ${markerCount} PDF markers, discarding as metadata`);
        } else {
          text = candidate;
          console.log(`Fallback text extraction: ${text.length} characters`);
        }
      }
    } catch (_) { /* ignore */ }
  }

  if (!text) {
    // OCR fallback: use Gemini vision to extract text from scanned PDF
    console.log("Attempting OCR via Gemini vision model...");
    try {
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia todo o texto legível deste documento PDF. Retorne APENAS o texto extraído, sem comentários, explicações ou formatação adicional. Preserve a estrutura original (parágrafos, listas, tabelas) o máximo possível.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();
        const ocrText = ocrData.choices?.[0]?.message?.content?.trim();
        if (ocrText && ocrText.length > 50) {
          text = ocrText;
          console.log(`OCR text extracted: ${text.length} characters`);
        }
      } else {
        console.error("OCR API error:", ocrResponse.status, await ocrResponse.text());
      }
    } catch (ocrErr: any) {
      console.error("OCR extraction error:", ocrErr.message);
    }
  }

  if (!text) {
    throw new Error("Não foi possível extrair texto do PDF. O arquivo pode estar escaneado ou protegido. Tente colar o texto manualmente na aba 'Colar Texto'.");
  }

  console.log(`PDF text extracted: ${text.length} characters from ${doc.file_url}`);
  return text;
}

// Portuguese stopwords to ignore in keyword extraction
const STOPWORDS = new Set([
  "para", "como", "mais", "este", "esta", "esse", "essa", "pelo", "pela",
  "pelos", "pelas", "sobre", "entre", "depois", "antes", "desde", "durante",
  "ainda", "quando", "onde", "qual", "quais", "cada", "todo", "toda", "todos",
  "todas", "outro", "outra", "outros", "outras", "muito", "muita", "muitos",
  "muitas", "mesmo", "mesma", "mesmos", "mesmas", "sendo", "sido", "tendo",
  "deve", "dever", "podem", "poder", "fazer", "feito", "forma", "caso",
  "valor", "item", "data", "tipo", "nome", "dias", "anos", "apenas",
  "artigo", "inciso", "conforme", "acordo", "disposto", "previsto",
]);

function extractKeywords(text: string, topN = 20): string[] {
  const words = text.toLowerCase().match(/[a-záàâãéèêíïóôõúüç]{4,}/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (!STOPWORDS.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function scoreChunk(content: string, keywords: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw, "gi");
    const matches = lower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

// Fetch knowledge base context from pre-extracted chunks (RAG)
interface RagMetadata {
  rag_context_used: boolean;
  rag_chunks_count: number;
  rag_method: "vector_search" | "keyword_ranking" | "none";
}

async function fetchKnowledgeBaseContext(
  supabase: any, documentContent: string, lovableApiKey: string
): Promise<{ context: string; metadata: RagMetadata }> {
  const noContext: { context: string; metadata: RagMetadata } = {
    context: "",
    metadata: { rag_context_used: false, rag_chunks_count: 0, rag_method: "none" },
  };

  try {
    const MAX_CONTEXT = 15000;
    let ragMethod: RagMetadata["rag_method"] = "none";

    // Try vector search first if embeddings exist
    let chunks: { content: string; file_name: string; similarity?: number; _score?: number }[] = [];

    // Generate embedding for the document summary to use in vector search
    const docSummary = documentContent.substring(0, 2000);
    let queryEmbedding: number[] | null = null;

    try {
      const embResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are an embedding generator. Given a text, output ONLY a JSON array of exactly 384 floating point numbers between -1 and 1 representing the semantic meaning of the text. No other text, no explanation, just the JSON array.",
            },
            { role: "user", content: docSummary },
          ],
        }),
      });

      if (embResponse.ok) {
        const embData = await embResponse.json();
        let content = embData.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length === 384) {
            queryEmbedding = parsed.map((n: any) => Number(n));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to generate query embedding, falling back to keyword ranking:", e);
    }

    if (queryEmbedding) {
      const { data, error } = await supabase.rpc("match_knowledge", {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_count: 30,
      });

      if (!error && data && data.length > 0) {
        chunks = data;
        ragMethod = "vector_search";
        console.log(`Vector search returned ${chunks.length} chunks`);
      }
    }

    // Fallback: keyword-ranked search
    if (chunks.length === 0) {
      const { data, error } = await supabase
        .from("conhecimento_chunks")
        .select("content, file_name")
        .limit(500);

      if (!error && data && data.length > 0) {
        const keywords = extractKeywords(documentContent, 20);
        console.log(`Keyword ranking with terms: ${keywords.slice(0, 10).join(", ")}...`);

        chunks = (data as { content: string; file_name: string }[])
          .map((chunk) => ({ ...chunk, _score: scoreChunk(chunk.content, keywords) }))
          .sort((a, b) => (b._score || 0) - (a._score || 0));

        ragMethod = "keyword_ranking";
        console.log(`Keyword ranking: top scores [${chunks.slice(0, 5).map(c => c._score).join(", ")}]`);
      }
    }

    if (chunks.length === 0) return noContext;

    // Build context from chunks, respecting max length
    const contextParts: string[] = [];
    let totalLength = 0;

    for (const chunk of chunks) {
      if (totalLength >= MAX_CONTEXT) break;
      const part = `[${chunk.file_name}]: ${chunk.content}`;
      const trimmed = part.substring(0, MAX_CONTEXT - totalLength);
      contextParts.push(trimmed);
      totalLength += trimmed.length;
    }

    console.log(`Knowledge base RAG context (${ragMethod}): ${contextParts.length} chunks, ${totalLength} chars`);
    return {
      context: `\n\nContexto da Base de Conhecimento (use como referência para a análise):\n${contextParts.join("\n\n")}`,
      metadata: { rag_context_used: true, rag_chunks_count: contextParts.length, rag_method: ragMethod },
    };
  } catch (e) {
    console.error("Error fetching knowledge base context:", e);
    return noContext;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
    if (!callerRoles?.some((r: any) => ["admin", "gestor"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const { document_id, content: rawContent, audit_criteria, force_reextract } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    // Check cache first for deterministic results (skip if force reextract)
    if (!force_reextract) {
      const { data: cached } = await supabase
        .from("text_analysis_cache")
        .select("result")
        .eq("document_id", document_id)
        .eq("analysis_type", "full_extraction")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (cached?.result && !rawContent) {
        console.log("Returning cached analysis for document:", document_id);
        const cachedResult = cached.result as any;
        return new Response(JSON.stringify({ success: true, risk_score: cachedResult.risk_score, alerts_count: cachedResult.alerts?.length || 0, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update status to processing
    await supabase.from("procurement_documents").update({ status: "processing" }).eq("id", document_id);

    // Check if incoming content contains PDF metadata garbage
    const pdfMarkers = ["/Filter", "/FlateDecode", "/Length", "/Type", "/Page", "/obj", "endobj", "/Font", "/MediaBox", "/Resources"];
    const contentIsGarbage = rawContent && pdfMarkers.filter((m: string) => rawContent.includes(m)).length >= 3;
    if (contentIsGarbage) {
      console.log("Incoming content contains PDF structural markers, will force re-extraction from file");
    }

    // Determine actual content - extract from PDF if placeholder, garbage, or force reextract
    let content = rawContent || "";
    const needsExtraction = !content.trim() || content.trim().startsWith("[Arquivo PDF:") || contentIsGarbage || force_reextract;
    if (needsExtraction) {
      console.log("Extracting text from storage PDF...");
      content = await extractPdfText(supabase, document_id, lovableApiKey);

      await supabase.from("procurement_documents")
        .update({ raw_content: content })
        .eq("id", document_id);
    }

    if (!content.trim()) throw new Error("Nenhum conteúdo disponível para análise");

    // Fetch custom prompts
    const { data: promptSettings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["agent_system_prompt", "user_system_prompt", "structured_output_prompt"]);

    const promptMap: Record<string, string> = {};
    (promptSettings || []).forEach((s: any) => { promptMap[s.key] = s.value; });

    // Fetch active rules
    const { data: rules } = await supabase.from("risk_rules").select("*").eq("is_active", true);
    const rulesContext = (rules || [])
      .map((r: any) => `- ${r.name} (${r.category}, severidade ${r.severity}): ${r.description || ""}`)
      .join("\n");

    // Fetch knowledge base context
    const { context: knowledgeBaseContext, metadata: ragMetadata } = await fetchKnowledgeBaseContext(supabase, content, lovableApiKey);

    // Call Lovable AI with tool calling for structured extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `${promptMap.agent_system_prompt || `Voce e um especialista em analise de licitacoes publicas brasileiras. Sua tarefa e:
1. Extrair dados estruturados do documento de licitacao
2. Analisar riscos com base nas regras ativas fornecidas
3. Gerar alertas para cada risco identificado

Analise o documento com atencao especial a:
- Sobrepreco: valores acima do mercado
- Direcionamento de marca: mencoes a marcas especificas sem justificativa
- Prazo exiguo: prazos muito curtos para o tipo de licitacao
- Irregularidades em geral

Para cada alerta de risco, preencha obrigatoriamente o campo "criteria" descrevendo os criterios normativos e fontes legais utilizados para identificar o risco (ex: artigos da Lei 14.133/2021, jurisprudencia do TCU, normas tecnicas, IN SEGES, Decreto 10.024/2019). Seja especifico nas referencias.
Para cada alerta, preencha tambem o campo "review_notes" com recomendacoes de acoes corretivas ou preventivas para mitigar o risco identificado.`}

Regras ativas para analise:
${rulesContext || "Nenhuma regra ativa cadastrada."}${knowledgeBaseContext}${audit_criteria ? `\n\nCRITÉRIOS DE ANÁLISE DE AUDITORIA DEFINIDOS PELO AUDITOR (use como parâmetros prioritários para sua avaliação):\n${audit_criteria}` : ""}`,
          },
          {
            role: "user",
            content: `${promptMap.user_system_prompt ? promptMap.user_system_prompt + "\n\n" : ""}Analise o seguinte documento de licitacao:\n\n${content.substring(0, 30000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_document_analysis",
              description: promptMap.structured_output_prompt || "Retorna a extracao de dados e analise de risco do documento de licitacao",
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
                        criteria: { type: "string", description: "Criterios normativos e fontes legais utilizados para identificar este risco (ex: artigos da Lei 14.133/2021, jurisprudencia do TCU, normas tecnicas)" },
                      },
                      required: ["alert_type", "title", "description", "severity", "criteria"],
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
      extracted_data: { ...extracted_data, ...ragMetadata, ...(audit_criteria ? { audit_criteria } : {}) },
      risk_score: Math.min(100, Math.max(0, Math.round(risk_score))),
      status: "processed",
    }).eq("id", document_id);

    // Delete existing alerts for this document before inserting new ones
    await supabase.from("risk_alerts").delete().eq("document_id", document_id);

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
          criteria: a.criteria || null,
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
              Authorization: authHeader,
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

      // Log audit with IP
      await supabase.from("audit_logs").insert({
        action: "upload",
        resource_type: "document",
        resource_id: document_id,
        user_id: callerId,
        ip_address: clientIp,
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
