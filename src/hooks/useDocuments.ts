import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function useDocuments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const query = useQuery({
    queryKey: ["documents", search, statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("procurement_documents")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") q = q.eq("status", statusFilter as "pending" | "processing" | "processed" | "error");
      if (search) q = q.or(`title.ilike.%${search}%,agency.ilike.%${search}%`);

      const { data, count, error } = await q;
      if (error) throw error;

      // Fetch document IDs that have audit reports
      const docIds = (data ?? []).map(d => d.id);
      let reportDocIds = new Set<string>();
      if (docIds.length > 0) {
        const { data: reports } = await supabase
          .from("audit_reports")
          .select("document_id")
          .in("document_id", docIds);
        reportDocIds = new Set((reports ?? []).map(r => r.document_id));
      }

      return { data: data ?? [], total: count ?? 0, reportDocIds };
    },
  });

  return { ...query, search, setSearch, statusFilter, setStatusFilter, page, setPage, pageSize };
}
