import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL =
  "https://ricardoss30.app.n8n.cloud/webhook/clara-prod-1781177554849/claraauditoria";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = user.id;
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", callerId);
    if (!callerRoles?.some((r: any) => ["admin", "gestor"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const body = await req.json();
    const {
      document_id,
      file_path,
      raw_text,
      audit_criteria,
      analysis_rule_ids,
      risk_rule_ids,
      mode,
    } = body || {};

    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load document for metadata
    const { data: doc, error: docErr } = await supabase
      .from("procurement_documents")
      .select("id, title, agency, modality, estimated_value, published_at, description, file_url")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Documento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("procurement_documents").update({ status: "processing" }).eq("id", document_id);

    // Build JSON payload (no binary file forwarded — avoids edge-runtime memory limit).
    // For files: generate a signed URL and let n8n download directly from Storage.
    const sourcePath = file_path || doc.file_url;
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (sourcePath) {
      // ~100 anos — efetivamente "nunca expira"
      const EXPIRES_IN = 60 * 60 * 24 * 365 * 100;
      const { data: signed, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(sourcePath, EXPIRES_IN);
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Erro ao gerar URL assinada: ${signErr?.message || "desconhecido"}`);
      }
      fileUrl = signed.signedUrl;
      fileName = sourcePath.split("/").pop() || "document.bin";
    } else if (!raw_text) {
      throw new Error("Nenhum arquivo nem texto fornecido para análise");
    }

    const payload: Record<string, unknown> = {
      document_id,
      audit_criteria: audit_criteria || "",
      mode: mode || "new",
      title: doc.title || null,
      agency: doc.agency || null,
      modality: doc.modality || null,
      estimated_value: doc.estimated_value ?? null,
      published_at: doc.published_at || null,
      description: doc.description || null,
      analysis_rule_ids: analysis_rule_ids || [],
      risk_rule_ids: risk_rule_ids || [],
      file_url: fileUrl,
      file_name: fileName,
      file_path: sourcePath || null,
      raw_text: raw_text || null,
    };

    // POST to n8n (fire-and-forget: n8n responde 200 imediatamente e processa em background;
    // o resultado real chega depois via callback em n8n-analysis-callback).
    console.log(`Posting to n8n webhook for document ${document_id} (file_url=${fileUrl ? "yes" : "no"})...`);
    const n8nResp = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const respText = await n8nResp.text().catch(() => "");
    if (!n8nResp.ok) {
      console.error(`n8n webhook error ${n8nResp.status}: ${respText.substring(0, 500)}`);
      if ([408, 502, 503, 504, 524].includes(n8nResp.status)) {
        await supabase.from("audit_logs").insert({
          action: mode === "reprocess" ? "reprocess" : "upload",
          resource_type: "document",
          resource_id: document_id,
          user_id: callerId,
          ip_address: clientIp,
          details: { via: "n8n", gateway_timeout: n8nResp.status, note: "n8n continua processando em background" },
        });
        return new Response(
          JSON.stringify({
            success: true,
            pending: true,
            message: "O n8n recebeu o arquivo e está processando em segundo plano. O resultado aparecerá em alguns minutos.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Webhook n8n retornou erro ${n8nResp.status}: ${respText.substring(0, 300)}`);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: mode === "reprocess" ? "reprocess" : "upload",
      resource_type: "document",
      resource_id: document_id,
      user_id: callerId,
      ip_address: clientIp,
      details: { via: "n8n", dispatched: true },
    });

    return new Response(
      JSON.stringify({
        success: true,
        pending: true,
        message: "Documento enviado para análise. O resultado aparecerá em alguns minutos.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("n8n-process-document error:", e);
    try {
      const { document_id } = await req.clone().json().catch(() => ({}));
      if (document_id) {
        await supabase.from("procurement_documents").update({
          status: "error",
          extracted_data: { error: e instanceof Error ? e.message : "Erro desconhecido" },
        }).eq("id", document_id);
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
