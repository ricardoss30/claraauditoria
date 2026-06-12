import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Workflow v5 (FASE 1 – 27 nodes, splitter pipeline) ─────────────────────
const N8N_BASE = "https://ricardoss30.app.n8n.cloud/api/v1";
const WORKFLOW_ID = "N1XW85D9wpalKCdZ";
const NODE_NAME = "Clara";

/*
 * Agent node layout (typeVersion 1.6, promptType: "define"):
 *   parameters.text      → full system prompt (string)
 *   parameters.options   → { maxIterations: 5 }  (NO systemMessage)
 *
 * The patch below replaces the FIRST occurrence of OLD_TEXT inside
 * the text field.  If the caller provides old_text / new_text in the
 * request body, those are used; otherwise the built-in defaults apply.
 */
const DEFAULT_OLD =
  '1. Use o texto fornecido em "EDITAL (texto OCR)" como fonte única de análise — não tente acessar URLs.';

const DEFAULT_NEW =
  '1. Use SOMENTE o texto fornecido em "EDITAL (texto OCR)" como fonte única de análise — NÃO tente acessar URLs nem baixar PDFs.';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────
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

    // ── 2. Parse request body for optional overrides ─────────────────────
    let body: { old_text?: string; new_text?: string } = {};
    try { body = await req.json(); } catch { /* use defaults */ }

    const oldText = body.old_text ?? DEFAULT_OLD;
    const newText = body.new_text ?? DEFAULT_NEW;

    // ── 3. Fetch workflow from n8n ──────────────────────────────────────
    const N8N_API_KEY = Deno.env.get("N8N_API_KEY");
    if (!N8N_API_KEY) return json({ error: "N8N_API_KEY not configured" }, 500);

    const headers = {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const getRes = await fetch(`${N8N_BASE}/workflows/${WORKFLOW_ID}`, { headers });
    if (!getRes.ok) {
      const t = await getRes.text();
      return json({ error: `n8n GET failed [${getRes.status}]`, body: t }, 502);
    }
    const wf = await getRes.json();
    console.log("Workflow versionId:", wf.versionId);

    // ── 4. Find Agent node ──────────────────────────────────────────────
    const node = (wf.nodes ?? []).find((n: any) => n.name === NODE_NAME);
    if (!node) return json({ error: `Node "${NODE_NAME}" not found` }, 404);

    // v1.6 → parameters.text ;  v3.x → parameters.options.systemMessage
    const promptText: string | undefined =
      node?.parameters?.text ??
      node?.parameters?.options?.systemMessage;

    if (typeof promptText !== "string" || promptText.length === 0) {
      return json({ error: "Prompt text not found on Clara node" }, 404);
    }
    console.log("Current prompt length:", promptText.length);

    const idx = promptText.indexOf(oldText);
    if (idx === -1) {
      const alreadyPatched = promptText.includes(newText);
      return json({
        ok: true,
        replaced: false,
        alreadyPatched,
        message: alreadyPatched
          ? "O texto já foi atualizado anteriormente — nenhuma mudança necessária."
          : "Trecho 'old_text' não encontrado no prompt. Nada foi alterado.",
        hint: "Use 'old_text' no corpo da requisição para buscar um trecho diferente.",
      });
    }

    // ── 5. Apply patch ──────────────────────────────────────────────────
    const newPromptText =
      promptText.substring(0, idx) + newText + promptText.substring(idx + oldText.length);

    // Write back to whichever field the source came from
    if (node.parameters.text !== undefined) {
      node.parameters.text = newPromptText;
    } else if (node.parameters.options?.systemMessage !== undefined) {
      node.parameters.options.systemMessage = newPromptText;
    }

    // ── 6. PUT updated workflow ─────────────────────────────────────────
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
      promptLengthBefore: promptText.length,
      promptLengthAfter: newPromptText.length,
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
