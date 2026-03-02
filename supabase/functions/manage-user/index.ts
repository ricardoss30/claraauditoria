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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check caller roles
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roles = (callerRoles ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isGestor = roles.includes("gestor");

    if (!isAdmin && !isGestor) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), { status: 403, headers: corsHeaders });
    }

    const { action, user_id, email, full_name, password } = await req.json();

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "action e user_id são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Check target user roles (gestor cannot touch admins)
    if (!isAdmin) {
      const { data: targetRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id);
      const targetRoleList = (targetRoles ?? []).map((r: any) => r.role);
      if (targetRoleList.includes("admin")) {
        return new Response(JSON.stringify({ error: "Gestores não podem modificar administradores" }), { status: 403, headers: corsHeaders });
      }
    }

    if (action === "update") {
      // Update auth fields (email and/or password) if provided
      const authUpdate: Record<string, string> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (Object.keys(authUpdate).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
        if (authError) throw authError;
      }
      // Update full_name in profiles if provided
      if (full_name !== undefined) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ full_name })
          .eq("user_id", user_id);
        if (profileError) throw profileError;
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "delete") {
      if (user_id === callerId) {
        return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), { status: 400, headers: corsHeaders });
      }
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
