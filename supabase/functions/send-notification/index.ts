import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { alert_id, alert_title, document_title, severity, evidence } = await req.json();

    if (!alert_id || !alert_title) {
      throw new Error("alert_id and alert_title are required");
    }

    // Fetch admin/gestor users to notify
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "gestor"]);

    if (!roles || roles.length === 0) {
      console.log("No admin/gestor users to notify");
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(roles.map((r: any) => r.user_id))];

    // Fetch user emails from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    // Log the notification (in production, integrate with Resend or similar)
    console.log(`Notification for alert "${alert_title}" (severity ${severity})`);
    console.log(`Would notify ${userIds.length} user(s):`);
    profiles?.forEach((p: any) => console.log(`  - ${p.full_name} (${p.user_id})`));

    // Log audit entry for notification
    await supabase.from("audit_logs").insert({
      action: "create",
      resource_type: "notification",
      resource_id: alert_id,
      details: {
        alert_title,
        document_title,
        severity,
        notified_users: userIds.length,
      },
    });

    return new Response(
      JSON.stringify({ success: true, notified: userIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-notification error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
