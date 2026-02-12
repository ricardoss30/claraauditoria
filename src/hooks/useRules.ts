import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRules() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_rules")
        .select("*")
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
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
        : await supabase.from("risk_rules").insert({ ...rest, parameters: safeParams } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("risk_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  return { ...query, toggleActive, upsertRule, deleteRule };
}
