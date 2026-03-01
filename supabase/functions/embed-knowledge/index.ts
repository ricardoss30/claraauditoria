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

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an embedding generator. Given a text, output ONLY a JSON array of exactly 384 floating point numbers between -1 and 1 representing the semantic meaning of the text. No other text, no explanation, just the JSON array.`,
          },
          { role: "user", content: text.substring(0, 1000) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("Embedding generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown code fences that the model sometimes wraps around JSON
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length === 384) {
      return parsed.map((n: any) => Number(n));
    }
    return null;
  } catch (e) {
    console.warn("Failed to generate embedding:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
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

    if (!text.trim()) {
      console.log(`No text extracted from ${file_path}`);
      return new Response(JSON.stringify({ success: true, chunks: 0, file_path }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split into chunks
    const chunks = splitIntoChunks(text);
    console.log(`Extracted ${text.length} chars, split into ${chunks.length} chunks from ${file_path}`);

    // Generate embeddings and insert chunks
    const rows = [];
    for (const chunk of chunks) {
      let embedding: number[] | null = null;
      if (lovableApiKey) {
        embedding = await generateEmbedding(chunk, lovableApiKey);
      }

      rows.push({
        file_path,
        file_name: fileName,
        content: chunk,
        embedding: embedding ? `[${embedding.join(",")}]` : null,
      });
    }

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error: insertErr } = await supabase.from("conhecimento_chunks").insert(batch);
      if (insertErr) {
        console.error("Insert chunks error:", insertErr);
        throw new Error(`Failed to insert chunks: ${insertErr.message}`);
      }
    }

    console.log(`Successfully embedded ${rows.length} chunks for ${file_path}`);
    return new Response(
      JSON.stringify({ success: true, chunks: rows.length, file_path }),
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
