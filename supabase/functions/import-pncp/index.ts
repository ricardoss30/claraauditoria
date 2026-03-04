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

    // Verify user using service role client (bypasses signing-key issues)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !user) {
      console.error("Auth error:", authErr?.message);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

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

function mapItems(rawItems: any[]) {
  return rawItems.map((item: any) => ({
    id: `${item.orgaoEntidade?.cnpj || ""}-${item.anoCompra || ""}-${item.sequencialCompra || ""}`,
    title: item.objetoCompra || item.descricao || "Sem título",
    agency: item.orgaoEntidade?.razaoSocial || "—",
    modality: item.modalidadeNome || "—",
    value: item.valorTotalEstimado || null,
    publishedAt: item.dataPublicacaoPncp || "—",
    uf: item.unidadeOrgao?.ufSigla || item.orgaoEntidade?.ufSigla || "—",
    municipality: item.unidadeOrgao?.municipioNome || item.orgaoEntidade?.municipioNome || "—",
    _raw: item,
  }));
}

function applyFilters(items: any[], municipio?: string) {
  const municipioFilter = municipio?.toLowerCase();
  return municipioFilter
    ? items.filter((i: any) => i.municipality.toLowerCase().includes(municipioFilter))
    : items;
}

async function fetchSingleModality(baseParams: Record<string, string>) {
  const url = new URL("https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao");
  for (const [k, v] of Object.entries(baseParams)) url.searchParams.set(k, v);

  console.log("fetchSingleModality URL:", url.toString());
  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    console.error("fetchSingleModality error:", resp.status, await resp.text().catch(() => ""));
    return [];
  }

  const text = await resp.text();
  if (!text.trim()) return [];

  try {
    const data = JSON.parse(text);
    return data.data || data.items || [];
  } catch {
    return [];
  }
}

async function handleSearch(params: any, cors: Record<string, string>) {
  const { dataInicial, dataFinal, uf, codigoModalidadeContratacao, municipio, pagina = 1 } = params;

  // Validate date range <= 365 days
  const parseDate = (s: string) => new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`);
  const d1 = parseDate(dataInicial);
  const d2 = parseDate(dataFinal);
  const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 365) {
    return new Response(
      JSON.stringify({ error: "O período máximo de busca é de 365 dias." }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const isAll = !codigoModalidadeContratacao || codigoModalidadeContratacao === "all";

  if (isAll) {
    // Parallel fetch for all 13 modalities
    const baseParams: Record<string, string> = {
      dataInicial,
      dataFinal,
      pagina: "1",
      tamanhoPagina: "20",
    };
    if (uf && uf !== "all") baseParams.uf = uf;

    const promises = Array.from({ length: 13 }, (_, i) =>
      fetchSingleModality({ ...baseParams, codigoModalidadeContratacao: String(i + 1) })
    );
    const results = await Promise.all(promises);
    const allRaw = results.flat();

    // Sort by publication date descending
    allRaw.sort((a: any, b: any) => {
      const da = a.dataPublicacaoPncp || "";
      const db = b.dataPublicacaoPncp || "";
      return db.localeCompare(da);
    });

    const items = mapItems(allRaw);
    const filtered = applyFilters(items, municipio);

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const start = (pagina - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return new Response(
      JSON.stringify({ items: paged, totalPages, currentPage: pagina }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Single modality — existing behavior
  const url = new URL("https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao");
  url.searchParams.set("dataInicial", dataInicial);
  url.searchParams.set("dataFinal", dataFinal);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tamanhoPagina", "20");
  url.searchParams.set("codigoModalidadeContratacao", codigoModalidadeContratacao);
  if (uf && uf !== "all") url.searchParams.set("uf", uf);

  console.log("PNCP search URL:", url.toString());

  const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("PNCP API error:", resp.status, text);
    return new Response(
      JSON.stringify({ error: `Erro na API PNCP (${resp.status}): ${text.substring(0, 200)}` }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const responseText = await resp.text();
  if (!responseText.trim()) {
    return new Response(
      JSON.stringify({ items: [], totalPages: 0, currentPage: pagina }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (parseErr) {
    console.error("Failed to parse PNCP response:", parseErr);
    return new Response(
      JSON.stringify({ error: `Resposta inválida da API PNCP: ${responseText.substring(0, 200)}` }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const rawItems = data.data || data.items || [];
  const totalPagesVal = data.totalPaginas || data.totalPages || 1;
  const items = mapItems(rawItems);
  const filteredItems = applyFilters(items, municipio);

  return new Response(
    JSON.stringify({ items: filteredItems, totalPages: totalPagesVal, currentPage: pagina }),
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
