import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const N8N_WEBHOOK_URL =
  "https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoriatitulo";

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

    const contentType = req.headers.get("content-type") ?? "application/octet-stream";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: req.body,
        // @ts-ignore — Deno fetch supports half-duplex streaming
        duplex: "half",
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
      try {
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : trimmed);
      } catch {
        console.warn("n8n response not JSON. Raw:", raw);
        parsed = {};
      }
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
