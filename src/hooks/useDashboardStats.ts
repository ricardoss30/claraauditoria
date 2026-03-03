import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  const documentsProcessed = useQuery({
    queryKey: ["stats", "documents-processed"],
    queryFn: async () => {
      const { count } = await supabase
        .from("procurement_documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "processed");
      return count ?? 0;
    },
  });

  const alertsPending = useQuery({
    queryKey: ["stats", "alerts-pending"],
    queryFn: async () => {
      const { count } = await supabase
        .from("risk_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const activeRules = useQuery({
    queryKey: ["stats", "active-rules"],
    queryFn: async () => {
      const { count } = await supabase
        .from("risk_rules")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count ?? 0;
    },
  });

  const accuracy = useQuery({
    queryKey: ["stats", "accuracy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_alerts")
        .select("status")
        .in("status", ["confirmed", "dismissed"]);
      if (!data || data.length === 0) return null;
      const confirmed = data.filter((a) => a.status === "confirmed").length;
      return Math.round((confirmed / data.length) * 100);
    },
  });

  const alertsByCategory = useQuery({
    queryKey: ["stats", "alerts-by-category"],
    queryFn: async () => {
      const { data } = await supabase.from("risk_alerts").select("alert_type");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((a) => {
        counts[a.alert_type] = (counts[a.alert_type] || 0) + 1;
      });
      return Object.entries(counts).map(([name, total]) => ({ name, total }));
    },
  });

  const documentsOverTime = useQuery({
    queryKey: ["stats", "documents-over-time"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("procurement_documents")
        .select("created_at")
        .gte("created_at", since.toISOString())
        .order("created_at");
      if (!data) return [];
      const byDay: Record<string, number> = {};
      data.forEach((d) => {
        const day = d.created_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      });
      return Object.entries(byDay).map(([date, count]) => ({ date, count }));
    },
  });

  const recentAlerts = useQuery({
    queryKey: ["stats", "recent-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_alerts")
        .select("id, title, severity, status, created_at, alert_type")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return { documentsProcessed, alertsPending, activeRules, accuracy, alertsByCategory, documentsOverTime, recentAlerts };
}
