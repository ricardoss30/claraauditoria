import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function useAuditLogs() {
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

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

  return {
    ...query,
    actionFilter, setActionFilter,
    resourceFilter, setResourceFilter,
    page, setPage, pageSize,
  };
}
