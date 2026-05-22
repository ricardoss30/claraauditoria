import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_BASE = "https://ricardoss30.app.n8n.cloud/api/v1";
const WORKFLOW_ID = "j4d43UZrYceItJ5z";
const NODE_NAME = "Clara";
const OLD_TEXT = "1. leia o PDF de file_url.";
const NEW_TEXT =
  '1. Use o texto fornecido em "EDITAL (texto OCR)" como fonte única de análise — não tente acessar URLs.';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin role required" }, 403);

    const N8N_API_KEY = Deno.env.get("N8N_API_KEY");
    if (!N8N_API_KEY) return json({ error: "N8N_API_KEY not configured" }, 500);

    const headers = {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // GET workflow
    const getRes = await fetch(`${N8N_BASE}/workflows/${WORKFLOW_ID}`, { headers });
    if (!getRes.ok) {
      const t = await getRes.text();
      return json({ error: `n8n GET failed [${getRes.status}]`, body: t }, 502);
    }
    const wf = await getRes.json();
    console.log("Original workflow versionId:", wf.versionId);

    const node = (wf.nodes ?? []).find((n: any) => n.name === NODE_NAME);
    if (!node) return json({ error: `Node "${NODE_NAME}" not found` }, 404);

    const sm: string | undefined = node?.parameters?.options?.systemMessage;
    if (typeof sm !== "string") {
      return json({ error: "systemMessage not found on Clara node" }, 404);
    }
    console.log("Original systemMessage length:", sm.length);

    const replaced = sm.includes(OLD_TEXT);
    if (!replaced) {
      // Check if already patched
      const alreadyPatched = sm.includes(NEW_TEXT);
      return json({
        ok: true,
        replaced: false,
        alreadyPatched,
        message: alreadyPatched
          ? "Prompt já foi corrigido anteriormente."
          : "Trecho original não encontrado — nada foi alterado.",
      });
    }

    node.parameters.options.systemMessage = sm.replace(OLD_TEXT, NEW_TEXT);

    // n8n PUT only accepts specific fields
    const payload = {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings ?? {},
      staticData: wf.staticData ?? null,
    };

    const putRes = await fetch(`${N8N_BASE}/workflows/${WORKFLOW_ID}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    const putBody = await putRes.text();
    if (!putRes.ok) {
      return json({ error: `n8n PUT failed [${putRes.status}]`, body: putBody }, 502);
    }
    const updated = JSON.parse(putBody);

    return json({
      ok: true,
      replaced: true,
      newVersionId: updated.versionId,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    console.error("patch error:", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
