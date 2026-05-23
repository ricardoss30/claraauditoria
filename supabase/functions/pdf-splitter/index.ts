import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib@1.17.1";
import { createClient } from "npm:@supabase/supabase-js@2";

const PAGES_PER_CHUNK = 150;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-callback-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { file_url, document_id } = await req.json();

    if (!file_url || !document_id) {
      return new Response(
        JSON.stringify({ error: "file_url e document_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar PDF: ${response.status} ${response.statusText}`);
    }

    const pdfBytes = new Uint8Array(await response.arrayBuffer());
    const srcDoc = await PDFDocument.load(pdfBytes);
    const totalPages = srcDoc.getPageCount();

    const chunkUrls: string[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < totalPages; i += PAGES_PER_CHUNK) {
      const chunkDoc = await PDFDocument.create();
      const end = Math.min(i + PAGES_PER_CHUNK, totalPages);
      const pageIndexes = Array.from({ length: end - i }, (_, k) => i + k);
      const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndexes);
      copiedPages.forEach((p) => chunkDoc.addPage(p));

      const chunkBytes = await chunkDoc.save();
      const chunkPath = `chunks/${document_id}/chunk_${chunkIndex}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("pdf-chunks")
        .upload(chunkPath, chunkBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pdf-chunks")
        .getPublicUrl(chunkPath);

      chunkUrls.push(urlData.publicUrl);
      chunkIndex++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        total_pages: totalPages,
        total_chunks: chunkUrls.length,
        chunks: chunkUrls,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("pdf-splitter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
