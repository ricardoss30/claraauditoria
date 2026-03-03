import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReportFilters {
  startDate: string;
  endDate: string;
  agency?: string;
  modality?: string;
}

export interface ConsolidatedMetrics {
  totalDocuments: number;
  averageRiskScore: number;
  statusDistribution: Record<string, number>;
  modalityDistribution: Record<string, number>;
  agencyDistribution: Record<string, number>;
  alertsBySeverity: Record<number, number>;
  totalAlerts: number;
  topAlerts: Array<{ title: string; severity: number; document_title: string; status: string }>;
  documents: Array<{
    id: string;
    title: string;
    agency: string | null;
    modality: string | null;
    risk_score: number | null;
    status: string;
    created_at: string;
    alert_count: number;
  }>;
}

export function useConsolidatedReport(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ["consolidated-report", filters],
    queryFn: async (): Promise<ConsolidatedMetrics> => {
      if (!filters) throw new Error("No filters");

      // Fetch documents in period
      let docQuery = supabase
        .from("procurement_documents")
        .select("id, title, agency, modality, risk_score, status, created_at")
        .gte("created_at", filters.startDate)
        .lte("created_at", filters.endDate)
        .order("risk_score", { ascending: false });

      if (filters.agency) docQuery = docQuery.eq("agency", filters.agency);
      if (filters.modality) docQuery = docQuery.eq("modality", filters.modality);

      const { data: docs, error: docErr } = await docQuery;
      if (docErr) throw docErr;

      const docIds = (docs || []).map((d) => d.id);

      // Fetch alerts for those documents
      let alerts: Array<{
        id: string;
        title: string;
        severity: number;
        status: string;
        document_id: string;
        description: string | null;
      }> = [];

      if (docIds.length > 0) {
        const { data, error } = await supabase
          .from("risk_alerts")
          .select("id, title, severity, status, document_id, description")
          .in("document_id", docIds);
        if (error) throw error;
        alerts = data || [];
      }

      // Calculate metrics
      const totalDocuments = docs?.length || 0;
      const scores = (docs || []).filter((d) => d.risk_score != null).map((d) => d.risk_score!);
      const averageRiskScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      const statusDistribution: Record<string, number> = {};
      const modalityDistribution: Record<string, number> = {};
      const agencyDistribution: Record<string, number> = {};

      for (const doc of docs || []) {
        statusDistribution[doc.status] = (statusDistribution[doc.status] || 0) + 1;
        const mod = doc.modality || "Não informada";
        modalityDistribution[mod] = (modalityDistribution[mod] || 0) + 1;
        const ag = doc.agency || "Não informado";
        agencyDistribution[ag] = (agencyDistribution[ag] || 0) + 1;
      }

      const alertsBySeverity: Record<number, number> = {};
      for (const a of alerts) {
        alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] || 0) + 1;
      }

      // Alert count per document
      const alertCountMap: Record<string, number> = {};
      for (const a of alerts) {
        alertCountMap[a.document_id] = (alertCountMap[a.document_id] || 0) + 1;
      }

      // Top alerts (top 10 by severity)
      const sortedAlerts = [...alerts].sort((a, b) => b.severity - a.severity).slice(0, 10);
      const docMap = new Map((docs || []).map((d) => [d.id, d.title]));
      const topAlerts = sortedAlerts.map((a) => ({
        title: a.title,
        severity: a.severity,
        document_title: docMap.get(a.document_id) || "—",
        status: a.status,
      }));

      const documents = (docs || []).map((d) => ({
        ...d,
        alert_count: alertCountMap[d.id] || 0,
      }));

      return {
        totalDocuments,
        averageRiskScore,
        statusDistribution,
        modalityDistribution,
        agencyDistribution,
        alertsBySeverity,
        totalAlerts: alerts.length,
        topAlerts,
        documents,
      };
    },
    enabled: !!filters,
  });
}
