import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const N8N_WEBHOOK_URL =
  "https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoriatitulo";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Expect multipart/form-data with a "file" field
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Envie o arquivo como multipart/form-data no campo 'file'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Campo 'file' ausente ou inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fileName = (form.get("file_name") as string) || file.name || "documento.pdf";
    const mimeType = (form.get("mime_type") as string) || file.type || "application/pdf";

    // Forward as multipart/form-data to n8n webhook
    const outForm = new FormData();
    outForm.append("data", file, fileName);
    outForm.append("file_name", fileName);
    outForm.append("mime_type", mimeType);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: outForm,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await n8nResponse.text();
    if (!n8nResponse.ok) {
      console.error("n8n webhook error", n8nResponse.status, raw);
      return new Response(
        JSON.stringify({ error: `n8n webhook ${n8nResponse.status}`, details: raw }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any = {};
    const trimmed = raw?.trim() ?? "";
    if (trimmed.length > 0) {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const candidate = jsonMatch ? jsonMatch[0] : trimmed;
      try {
        parsed = JSON.parse(candidate);
      } catch {
        console.warn("n8n response not JSON, returning empty metadata. Raw:", raw);
        parsed = {};
      }
    } else {
      console.warn("n8n returned empty body");
    }

    const payload = Array.isArray(parsed) ? parsed[0] : parsed;
    const result = payload?.output ?? payload?.data ?? payload ?? {};

    return new Response(
      JSON.stringify({
        title: result.title ?? "",
        agency: result.agency ?? "",
        modality: result.modality ?? "",
        estimated_value: result.estimated_value ?? "",
        description: result.description ?? "",
        published_at: result.published_at ?? "",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("extract-metadata-n8n error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
