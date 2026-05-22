import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const N8N_WEBHOOK_URL =
  "https://ricardoss30.app.n8n.cloud/webhook/ebc237a3-02cb-4987-bca6-0fd09ab8d983/claraauditoriatitulo";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2; // 2 hours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const file_path = String(body.file_path ?? "");
    const file_name = String(body.file_name ?? "");
    const mime_type = String(body.mime_type ?? "application/pdf");
    const file_size = Number(body.file_size ?? 0);

    if (!file_path) {
      return json({ error: "Missing file_path" }, 400);
    }

    const { data: signed, error: signErr } = await adminClient
      .storage
      .from("documents")
      .createSignedUrl(file_path, SIGNED_URL_TTL_SECONDS);

    if (signErr || !signed?.signedUrl) {
      console.error("createSignedUrl error", signErr);
      return json({ error: "Could not create signed URL", details: signErr?.message }, 500);
    }

    console.log("extract-metadata-n8n signed file", {
      file_path,
      file_name,
      mime_type,
      file_size,
      signed_url_ttl_seconds: SIGNED_URL_TTL_SECONDS,
    });

    const webhookPayload = {
      file_url: signed.signedUrl,
      fileUrl: signed.signedUrl,
      file_name,
      fileName: file_name,
      mime_type,
      mimeType: mime_type,
      file_size,
      body: {
        file_url: signed.signedUrl,
        fileUrl: signed.signedUrl,
        file_name,
        fileName: file_name,
        mime_type,
        mimeType: mime_type,
        file_size,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await n8nResponse.text();
    console.log("extract-metadata-n8n n8n response", {
      status: n8nResponse.status,
      ok: n8nResponse.ok,
      response_length: raw.length,
    });
    if (!n8nResponse.ok) {
      console.error("n8n webhook error", n8nResponse.status, raw);
      return json(
        { error: `n8n webhook ${n8nResponse.status}`, details: raw.slice(0, 500) },
        502,
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

    // Best-effort cleanup of temp file
    adminClient.storage.from("documents").remove([file_path]).catch(() => {});

    return json({
      title: result.title ?? "",
      agency: result.agency ?? "",
      modality: result.modality ?? "",
      estimated_value: result.estimated_value ?? "",
      description: result.description ?? "",
      published_at: result.published_at ?? "",
    });
  } catch (err) {
    console.error("extract-metadata-n8n error", err);
    return json({ error: (err as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
