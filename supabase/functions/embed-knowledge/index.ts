import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "base_conhecimento";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const MAX_TEXT_LENGTH = 500000; // Limit text extraction to avoid CPU timeout

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
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

    const { file_path, action } = await req.json();
    if (!file_path) throw new Error("file_path is required");

    // Always delete existing chunks for this file first (idempotent)
    const { error: deleteErr } = await supabase
      .from("conhecimento_chunks")
      .delete()
      .eq("file_path", file_path);
    if (deleteErr) console.warn("Delete chunks error:", deleteErr);

    if (action === "delete") {
      console.log(`Deleted chunks for: ${file_path}`);
      return new Response(JSON.stringify({ success: true, action: "delete", file_path }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from bucket
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(file_path);

    if (downloadErr || !fileData) {
      throw new Error(`Failed to download file: ${downloadErr?.message || "not found"}`);
    }

    const fileName = file_path.split("/").pop() || file_path;
    const ext = fileName.split(".").pop()?.toLowerCase();
    let text = "";

    if (ext === "txt") {
      text = await fileData.text();
    } else if (ext === "pdf") {
      const arrayBuffer = await fileData.arrayBuffer();
      const { text: extractedText } = await extractText(new Uint8Array(arrayBuffer));
      text = Array.isArray(extractedText)
        ? extractedText.join("\n").trim()
        : (extractedText || "").toString().trim();
    } else if (ext === "docx") {
      text = `[Documento DOCX: ${fileName}] - Conteúdo não extraído automaticamente.`;
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Truncate to avoid CPU timeout on very large documents
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`Text truncated from ${text.length} to ${MAX_TEXT_LENGTH} chars for ${file_path}`);
      text = text.slice(0, MAX_TEXT_LENGTH);
    }

    if (!text.trim()) {
      console.log(`No text extracted from ${file_path}`);
      return new Response(JSON.stringify({ success: true, chunks: 0, file_path }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split into chunks
    const chunks = splitIntoChunks(text);
    console.log(`Extracted ${text.length} chars, split into ${chunks.length} chunks from ${file_path}`);

    // STEP 1: Insert all chunks WITHOUT embeddings first (guarantees data availability for RAG fallback)
    const rows = chunks.map((chunk) => ({
      file_path,
      file_name: fileName,
      content: chunk,
      embedding: null,
    }));

    // Insert in batches of 50
    const insertedIds: number[] = [];
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { data: inserted, error: insertErr } = await supabase
        .from("conhecimento_chunks")
        .insert(batch)
        .select("id");
      if (insertErr) {
        console.error("Insert chunks error:", insertErr);
        throw new Error(`Failed to insert chunks: ${insertErr.message}`);
      }
      if (inserted) insertedIds.push(...inserted.map((r: any) => r.id));
    }


    console.log(`Successfully processed ${file_path}: ${insertedIds.length} chunks inserted`);
    return new Response(
      JSON.stringify({ success: true, chunks: insertedIds.length, file_path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("embed-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
