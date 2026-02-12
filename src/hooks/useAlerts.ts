import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type AlertStatus = Database["public"]["Enums"]["alert_status"];

export function useAlerts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["alerts", statusFilter, severityFilter],
    queryFn: async () => {
      let q = supabase
        .from("risk_alerts")
        .select("*, procurement_documents(title)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") q = q.eq("status", statusFilter as AlertStatus);
      if (severityFilter !== "all") q = q.eq("severity", parseInt(severityFilter));

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: AlertStatus; review_notes?: string }) => {
      const { error } = await supabase
        .from("risk_alerts")
        .update({ status, review_notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        action: "status_change",
        resource_type: "alert",
        resource_id: id,
        user_id: user?.id,
        details: { new_status: status },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return { ...query, statusFilter, setStatusFilter, severityFilter, setSeverityFilter, updateAlert };
}
