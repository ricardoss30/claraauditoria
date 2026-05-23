import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-callback-secret",
};

function severityToInt(sev: unknown): number {
  if (typeof sev === "number" && isFinite(sev)) {
    return Math.min(5, Math.max(1, Math.round(sev)));
  }
  if (typeof sev === "string") {
    const s = sev.trim().toLowerCase();
    const map: Record<string, number> = {
      low: 1, baixa: 1, baixo: 1,
      medium: 3, media: 3, "média": 3, medio: 3, "médio": 3,
      high: 4, alta: 4, alto: 4,
      critical: 5, critica: 5, "crítica": 5, critico: 5, "crítico": 5,
    };
    if (map[s]) return map[s];
    const n = parseInt(s, 10);
    if (!isNaN(n)) return Math.min(5, Math.max(1, n));
  }
  return 3;
}

function clampScore(s: unknown): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? 0));
  if (!isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

const tryUnwrap = (val: unknown): any | null => {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
};

const hasExpectedKeys = (o: any) =>
  o && typeof o === "object" &&
  ("risk_score" in o || "summary" in o || "alerts" in o || "extracted_data" in o);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callbackSecret = Deno.env.get("N8N_CALLBACK_SECRET");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (!callbackSecret) {
      return new Response(JSON.stringify({ error: "N8N_CALLBACK_SECRET not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const provided = req.headers.get("x-callback-secret");
    if (provided !== callbackSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = await req.json();

    // Unwrap common n8n shapes
    if (Array.isArray(body)) body = body[0] || {};
    if (body?.data && typeof body.data === "object") body = { ...body, ...body.data };
    if (body?.json && typeof body.json === "object") body = { ...body, ...body.json };

    const document_id: string | undefined = body.document_id;
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any = body.result ?? body;

    if (!hasExpectedKeys(result)) {
      const candidates = [
        result?.myField, result?.output, result?.text, result?.body, result?.response,
      ];
      if (Array.isArray(result?.output) && result.output[0]?.text) {
        candidates.push(result.output[0].text);
      }
      for (const c of candidates) {
        const unwrapped = tryUnwrap(c);
        if (hasExpectedKeys(unwrapped)) { result = unwrapped; break; }
      }
    }

    const { data: doc } = await supabase
      .from("procurement_documents")
      .select("id, title, agency, modality, estimated_value, description")
      .eq("id", document_id)
      .single();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Documento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const riskScore = clampScore(result.risk_score ?? 0);
    const summary: string | undefined = result.summary || result.analysis;
    const extractedData = (typeof result.extracted_data === "object" && result.extracted_data) || {};
    const alerts: any[] = Array.isArray(result.alerts) ? result.alerts : [];

    const updatePayload: Record<string, any> = {
      status: "processed",
      risk_score: riskScore,
      extracted_data: {
        ...extractedData,
        n8n_processed_at: new Date().toISOString(),
      },
    };
    if (summary && typeof summary === "string") updatePayload.raw_content = summary;
    if (extractedData.title && !doc.title) updatePayload.title = extractedData.title;
    if (extractedData.agency && !doc.agency) updatePayload.agency = extractedData.agency;
    if (extractedData.modality && !doc.modality) updatePayload.modality = extractedData.modality;
    if (extractedData.estimated_value && !doc.estimated_value) updatePayload.estimated_value = extractedData.estimated_value;
    if (extractedData.description && !doc.description) updatePayload.description = extractedData.description;

    await supabase.from("procurement_documents").update(updatePayload).eq("id", document_id);

    await supabase.from("risk_alerts").delete().eq("document_id", document_id);

    let insertedCount = 0;
    if (alerts.length > 0) {
      const rows = alerts.map((a) => ({
        document_id,
        alert_type: a.alert_type || a.type || "irregularidade",
        title: a.title || "Alerta",
        description: a.description || null,
        severity: severityToInt(a.severity),
        evidence: a.evidence || null,
        criteria: a.criteria || null,
        review_notes: a.review_notes || a.recommendation || null,
        status: "pending",
      }));
      const { error: insErr, count } = await supabase
        .from("risk_alerts")
        .insert(rows, { count: "exact" });
      if (insErr) console.error("Failed to insert alerts:", insErr);
      else insertedCount = count || rows.length;
    }

    await supabase.from("audit_logs").insert({
      action: "n8n_callback",
      resource_type: "document",
      resource_id: document_id,
      user_id: null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      details: { via: "n8n", risk_score: riskScore, alerts_count: insertedCount },
    });

    return new Response(
      JSON.stringify({ success: true, risk_score: riskScore, alerts_count: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("n8n-analysis-callback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
