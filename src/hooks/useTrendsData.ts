import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrendsData() {
  const riskScoreOverTime = useQuery({
    queryKey: ["trends", "risk-score-over-time"],
    queryFn: async () => {
      const { data } = await supabase
        .from("procurement_documents")
        .select("created_at, risk_score, title")
        .eq("status", "processed")
        .not("risk_score", "is", null)
        .order("created_at");
      if (!data) return [];
      // Group by week
      const byWeek: Record<string, { sum: number; count: number }> = {};
      data.forEach((d) => {
        const date = new Date(d.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        if (!byWeek[key]) byWeek[key] = { sum: 0, count: 0 };
        byWeek[key].sum += d.risk_score || 0;
        byWeek[key].count += 1;
      });
      return Object.entries(byWeek).map(([date, { sum, count }]) => ({
        date,
        avgScore: Math.round(sum / count),
        count,
      }));
    },
  });

  const agenciesByAlerts = useQuery({
    queryKey: ["trends", "agencies-by-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_alerts")
        .select("document_id, procurement_documents(agency)")
        .order("created_at", { ascending: false });
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((a: any) => {
        const agency = a.procurement_documents?.agency || "Não informado";
        counts[agency] = (counts[agency] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
  });

  const documentComparison = useQuery({
    queryKey: ["trends", "document-comparison"],
    queryFn: async () => {
      const { data } = await supabase
        .from("procurement_documents")
        .select("id, title, risk_score, status, modality, agency, created_at")
        .eq("status", "processed")
        .not("risk_score", "is", null)
        .order("risk_score", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const alertsSeverityTrend = useQuery({
    queryKey: ["trends", "alerts-severity-trend"],
    queryFn: async () => {
      const { data } = await supabase
        .from("risk_alerts")
        .select("created_at, severity")
        .order("created_at");
      if (!data) return [];
      const byMonth: Record<string, { low: number; medium: number; high: number; critical: number }> = {};
      data.forEach((a) => {
        const month = a.created_at.slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { low: 0, medium: 0, high: 0, critical: 0 };
        if (a.severity <= 2) byMonth[month].low += 1;
        else if (a.severity <= 3) byMonth[month].medium += 1;
        else if (a.severity <= 4) byMonth[month].high += 1;
        else byMonth[month].critical += 1;
      });
      return Object.entries(byMonth).map(([month, counts]) => ({ month, ...counts }));
    },
  });

  return { riskScoreOverTime, agenciesByAlerts, documentComparison, alertsSeverityTrend };
}
