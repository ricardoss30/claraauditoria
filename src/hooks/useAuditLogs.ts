import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function useAuditLogs() {
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Fetch profiles for user name lookup
  const { data: profiles } = useQuery({
    queryKey: ["profiles-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      const map = new Map<string, string>();
      (data || []).forEach((p) => map.set(p.user_id, p.full_name || ""));
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const query = useQuery({
    queryKey: ["audit-logs", actionFilter, resourceFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (resourceFilter !== "all") q = q.eq("resource_type", resourceFilter);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sistema";
    return profiles?.get(userId) || userId.substring(0, 8);
  };

  return {
    ...query,
    actionFilter, setActionFilter,
    resourceFilter, setResourceFilter,
    page, setPage, pageSize,
    getUserName,
  };
}
