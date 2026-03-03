import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user via getClaims
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "gestor"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "search") {
      return await handleSearch(body, corsHeaders);
    } else if (action === "import") {
      return await handleImport(body, adminClient, user.id, authHeader, supabaseUrl, supabaseAnon, corsHeaders);
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("import-pncp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSearch(params: any, cors: Record<string, string>) {
  const { dataInicial, dataFinal, uf, codigoModalidadeContratacao, pagina = 1 } = params;

  const url = new URL("https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao");
  url.searchParams.set("dataInicial", dataInicial);
  url.searchParams.set("dataFinal", dataFinal);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", "20");
  if (uf && uf !== "all") url.searchParams.set("uf", uf);
  if (codigoModalidadeContratacao) url.searchParams.set("codigoModalidadeContratacao", codigoModalidadeContratacao);

  console.log("PNCP search URL:", url.toString());

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("PNCP API error:", resp.status, text);
    return new Response(
      JSON.stringify({
        items: [],
        totalPages: 0,
        currentPage: pagina,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const data = await resp.json();

  const items = (data.data || []).map((item: any) => ({
    id: `${item.orgaoEntidade?.cnpj || ""}-${item.anoCompra || ""}-${item.sequencialCompra || ""}`,
    title: item.objetoCompra || item.descricao || "Sem título",
    agency: item.orgaoEntidade?.razaoSocial || "—",
    modality: item.modalidadeNome || "—",
    value: item.valorTotalEstimado || null,
    publishedAt: item.dataPublicacaoPncp || "—",
    uf: item.unidadeOrgao?.ufSigla || item.orgaoEntidade?.ufSigla || "—",
    // Keep raw data for import
    _raw: item,
  }));

  return new Response(
    JSON.stringify({
      items,
      totalPages: data.totalPaginas || 1,
      currentPage: pagina,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
}

async function handleImport(
  body: any,
  adminClient: any,
  userId: string,
  authHeader: string,
  supabaseUrl: string,
  supabaseAnon: string,
  cors: Record<string, string>
) {
  const { ids } = body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: "Nenhum item selecionado" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Check for duplicates via external_id
  const { data: existing } = await adminClient
    .from("procurement_documents")
    .select("external_id")
    .in("external_id", ids);

  const existingIds = new Set((existing || []).map((e: any) => e.external_id));
  const newIds = ids.filter((id: string) => !existingIds.has(id));

  if (newIds.length === 0) {
    return new Response(
      JSON.stringify({ imported: 0, message: "Todos os editais já foram importados anteriormente" }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Create documents for new IDs
  const docsToInsert = newIds.map((externalId: string) => ({
    title: `Edital PNCP - ${externalId}`,
    external_id: externalId,
    status: "pending" as const,
    created_by: userId,
    description: `Importado automaticamente do PNCP. ID: ${externalId}`,
  }));

  const { data: inserted, error: insertErr } = await adminClient
    .from("procurement_documents")
    .insert(docsToInsert)
    .select("id");

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Log audit
  await adminClient.from("audit_logs").insert({
    user_id: userId,
    action: "import_pncp",
    resource_type: "procurement_documents",
    details: { imported_count: inserted?.length || 0, external_ids: newIds },
  });

  return new Response(
    JSON.stringify({
      imported: inserted?.length || 0,
      skipped: ids.length - newIds.length,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
}
