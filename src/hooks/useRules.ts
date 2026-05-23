import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRules(scope: "risk" | "analysis" = "risk") {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rules", scope],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("risk_rules")
        .select("*") as any)
        .eq("rule_scope", scope)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("risk_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", scope] }),
  });

  const upsertRule = useMutation({
    mutationFn: async (rule: {
      id?: string; name: string; description?: string; category: string;
      rule_type: string; severity: number; parameters?: Record<string, unknown> | null;
    }) => {
      const { parameters, id, ...rest } = rule;
      const safeParams = parameters as any;
      const { error } = id
        ? await supabase.from("risk_rules").update({ ...rest, parameters: safeParams } as any).eq("id", id)
        : await supabase.from("risk_rules").insert({ ...rest, parameters: safeParams, rule_scope: scope } as any);
      if (error) throw error;

      await supabase.rpc("log_audit_event", {
        _action: id ? "update" : "create",
        _resource_type: "rule",
        _resource_id: id ?? null,
        _details: { name: rule.name },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", scope] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("risk_rules").delete().eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_audit_event", {
        _action: "delete",
        _resource_type: "rule",
        _resource_id: id,
        _details: {},
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", scope] }),
  });

  return { ...query, toggleActive, upsertRule, deleteRule };
}
