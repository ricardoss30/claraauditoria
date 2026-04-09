import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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
    if (!callerRoles?.some((r: any) => ["admin", "gestor", "auditor"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from("procurement_documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr) throw docErr;

    // Fetch auditor profile
    let auditorName = "Não identificado";
    if (doc.created_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", doc.created_by)
        .single();
      if (profile?.full_name) auditorName = profile.full_name;
    }

    // Fetch alerts
    const { data: alerts } = await supabase
      .from("risk_alerts")
      .select("*")
      .eq("document_id", document_id)
      .order("severity", { ascending: false });

    // Fetch knowledge context (keyword-based fallback)
    let knowledgeContext = "";
    try {
      const keywords = [doc.modality, doc.agency, "licitação"].filter(Boolean).join(" ");
      const { data: chunks } = await supabase
        .from("conhecimento_chunks")
        .select("content")
        .limit(5);
      if (chunks?.length) {
        knowledgeContext = chunks.map(c => c.content).join("\n\n").slice(0, 10000);
      }
    } catch { /* ignore */ }

    const auditCriteria = (doc.extracted_data as any)?.audit_criteria || "";

    // Include raw_content for evidence citations
    const rawContentSnippet = (doc.raw_content || "").slice(0, 15000);

    const valor = doc.estimated_value != null
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(doc.estimated_value)
      : "Não informado";

    const alertsList = (alerts || [])
      .filter((a: any) => a.status !== "dismissed")
      .map((a: any) => `- ${a.title} (Severidade: ${a.severity}/5): ${a.description || ""}. Critério: ${a.criteria || "N/A"}. Evidência: ${a.evidence || "N/A"}. Notas: ${a.review_notes || "N/A"}`)
      .join("\n");

    const systemPrompt = `Você é um auditor fiscal especialista em licitações públicas brasileiras. Gere um relatório de conformidade prévia DETALHADO e ESPECÍFICO.

REGRAS OBRIGATÓRIAS — VIOLÁ-LAS INVALIDA O RELATÓRIO:

1. NOMES COMPLETOS: NUNCA use siglas isoladas. Sempre escreva o nome completo seguido da sigla entre parênteses na primeira menção. Exemplo: "Secretaria Municipal de Educação (SEDUC)".

2. TIPO DE DOCUMENTO: Identifique corretamente o tipo de documento analisado (Processo Administrativo, Edital, Termo de Referência, Contrato etc.). NÃO mencione "edital" se o documento é um Processo Administrativo. NÃO mencione "contrato" se não há contrato no processo.

3. LEGISLAÇÃO ESPECÍFICA: NUNCA use frases genéricas como "conforme legislação vigente" ou "de acordo com as normas aplicáveis". Cite SEMPRE o artigo, inciso e alínea específicos. Exemplo: "Art. 72, §1º, inciso II da Lei nº 14.133/2021".

4. EVIDÊNCIAS LITERAIS: Nas constatações, cite trechos LITERAIS do documento analisado como evidência. Use aspas e referencie a localização no documento.

5. METODOLOGIA ≠ ANÁLISE TÉCNICA: A metodologia descreve AS TÉCNICAS utilizadas pelo auditor (exame documental, conferência de cálculos, análise comparativa etc.). A análise técnica apresenta OS RESULTADOS da aplicação dessas técnicas. NÃO misture as duas seções.

6. CONSTATAÇÕES ESTRUTURADAS: Cada constatação/achado deve seguir a estrutura:
   - Condição: O que foi encontrado (fato)
   - Critério: A norma violada (artigo específico)
   - Causa: Por que ocorreu
   - Efeito: Consequência/impacto
   - Evidência: Trecho literal do documento

7. DADOS CONTRATUAIS: Na contextualização, inclua período, fiscal do contrato, gestor do contrato quando identificáveis no documento.

8. RECOMENDAÇÕES COM PLANO DE AÇÃO: Cada recomendação deve incluir prazo sugerido e responsável pela implementação.

9. CRITÉRIOS DO AUDITOR: Se forem fornecidos critérios de análise pelo auditor, eles devem ser incorporados em TODAS as seções pertinentes, não apenas na contextualização.`;

    const userPrompt = `Gere um relatório de conformidade prévia DETALHADO e ESPECÍFICO para o seguinte documento:

DADOS DO DOCUMENTO:
- Título: ${doc.title}
- Órgão/Entidade (nome completo): ${doc.agency || "Não informado"}
- Modalidade: ${doc.modality || "Não informada"}
- Valor Estimado: ${valor}
- Prazo: ${doc.deadline_at ? new Date(doc.deadline_at).toLocaleDateString("pt-BR") : "Não informado"}
- Descrição: ${doc.description || "Não disponível"}
- Score de Risco: ${doc.risk_score ?? "N/A"}/100
- Status: ${doc.status}
- Auditor Responsável: ${auditorName}

ALERTAS DE RISCO IDENTIFICADOS:
${alertsList || "Nenhum alerta identificado."}

${rawContentSnippet ? `CONTEÚDO DO DOCUMENTO (use para citar evidências literais):
${rawContentSnippet}` : ""}

${knowledgeContext ? `CONTEXTO NORMATIVO DA BASE DE CONHECIMENTO:\n${knowledgeContext}` : ""}

${auditCriteria ? `CRITÉRIOS DE ANÁLISE DEFINIDOS PELO AUDITOR:
${auditCriteria}

INSTRUÇÃO OBRIGATÓRIA: Os critérios acima devem ser incorporados em TODAS as seções do relatório:
- Na INTRODUÇÃO: como parte do objetivo e escopo da auditoria
- Na METODOLOGIA: como técnicas e procedimentos específicos aplicados
- Na CONTEXTUALIZAÇÃO: como base para delimitação do escopo
- Na ANÁLISE TÉCNICA: como referência para os exames realizados
- Nas CONSTATAÇÕES: como critérios violados ou atendidos, com evidências literais do documento
- Nas RECOMENDAÇÕES: como fundamento para as ações corretivas propostas` : ""}

INSTRUÇÕES POR SEÇÃO:

1. CAPA: Inclua o nome COMPLETO do órgão (nunca apenas a sigla), número do processo administrativo (se identificável), fase (Interna/Externa), tipo de auditoria, nome do auditor responsável: ${auditorName}.

2. SUMÁRIO: Liste todas as 12 seções do relatório com numeração.

3. INTRODUÇÃO: Objetivo específico desta auditoria, escopo delimitado, e normas aplicáveis com artigos específicos. Se há critérios do auditor, incorpore-os no objetivo.

4. METODOLOGIA: Descreva APENAS as técnicas de auditoria utilizadas (exame documental, conferência aritmética, análise comparativa, etc.). NÃO descreva resultados — isso é da análise técnica. NÃO mencione "sistema" ou "IA" — descreva como técnicas do auditor.

5. CONTEXTUALIZAÇÃO: Escopo de auditoria, período analisado, dados do órgão, objeto da contratação, fiscal e gestor do contrato (se identificáveis), critérios do auditor.

6. ANÁLISE TÉCNICA: Resultados detalhados dos exames realizados. Análise específica ao tipo de documento (NÃO mencione "edital" se é Processo Administrativo, NÃO mencione "contrato" se não existe contrato).

7. CONSTATAÇÕES: Para CADA achado, estruture como: Condição → Critério (artigo específico) → Causa → Efeito → Evidência (trecho literal entre aspas do documento). Seja DETALHADO.

8. AVALIAÇÃO DE RISCO: Classificação com justificativa baseada nas constatações.

9. RECOMENDAÇÕES: Cada recomendação com prazo sugerido e responsável. Incorpore o plano de ação diretamente.

10. PLANO DE AÇÃO: Detalhamento complementar com cronograma, responsáveis e indicadores de acompanhamento.

11. CONCLUSÃO: Parecer fundamentado nas constatações, com classificação (Sem Ressalva / Com Ressalva / Adverso).

12. ANEXOS: Liste os critérios de auditoria aplicados e as evidências documentais coletadas. NÃO mencione documentos que não existem.

Use a função generate_report para retornar o relatório estruturado.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_report",
              description: "Gera relatório de conformidade prévia estruturado em 12 seções. Cada seção deve ser detalhada e específica ao documento analisado.",
              parameters: {
                type: "object",
                properties: {
                  capa: { type: "string", description: "Nome COMPLETO do órgão (nunca apenas sigla), nº do processo administrativo, fase (Interna/Externa), tipo de auditoria, auditor responsável com nome completo" },
                  sumario: { type: "string", description: "Sumário executivo com lista numerada das 12 seções" },
                  introducao: { type: "string", description: "Objetivo específico, escopo delimitado, normas com artigos específicos (nunca genérico). Incorporar critérios do auditor." },
                  metodologia: { type: "string", description: "Técnicas de auditoria aplicadas ESPECIFICAMENTE a este caso (exame documental, conferência aritmética, análise comparativa, etc.). NÃO descrever resultados da análise. NÃO mencionar sistema ou IA." },
                  contextualizacao: { type: "string", description: "Escopo de auditoria, critérios utilizados, período da contratação, fiscal e gestor do contrato, dados completos do órgão e objeto" },
                  analise_tecnica: { type: "string", description: "Resultados detalhados dos exames realizados. Análise específica ao tipo de documento. NÃO confundir com metodologia." },
                  constatacoes: { type: "string", description: "Para CADA achado: Condição (fato encontrado), Critério (artigo específico da norma), Causa (por que ocorreu), Efeito (consequência), Evidência (trecho LITERAL do documento entre aspas)" },
                  avaliacao_risco: { type: "string", description: "Classificação de risco com justificativa fundamentada nas constatações" },
                  recomendacoes: { type: "string", description: "Recomendações de auditoria com prazo sugerido e responsável para cada uma. Incorporar plano de ação." },
                  plano_acao: { type: "string", description: "Cronograma detalhado complementar às recomendações, com responsáveis, prazos e indicadores de acompanhamento" },
                  conclusao: { type: "string", description: "Parecer fundamentado: Sem Ressalva, Com Ressalva ou Adverso, com justificativa baseada nas constatações" },
                  anexos: { type: "string", description: "Lista enumerada de critérios de auditoria aplicados e evidências documentais coletadas. NÃO mencionar documentos inexistentes." },
                },
                required: ["capa", "sumario", "introducao", "metodologia", "contextualizacao", "analise_tecnica", "constatacoes", "avaliacao_risco", "recomendacoes", "plano_acao", "conclusao", "anexos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_report" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    let reportContent: string;
    const args = toolCall.function.arguments;
    if (typeof args === "string") {
      reportContent = args;
    } else {
      reportContent = JSON.stringify(args);
    }

    // Clean markdown fences if present
    reportContent = reportContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(reportContent);

    return new Response(JSON.stringify({ content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
