import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RuleOption = { id: string; name: string; label: string; scope: string; created_at: string };

export function useRuleOptions(scope: "risk" | "analysis") {
  const qc = useQueryClient();

  const categories = useQuery({
    queryKey: ["rule_categories", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rule_categories")
        .select("*")
        .eq("scope", scope)
        .order("label");
      if (error) throw error;
      return data as RuleOption[];
    },
  });

  const types = useQuery({
    queryKey: ["rule_types", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rule_types")
        .select("*")
        .eq("scope", scope)
        .order("label");
      if (error) throw error;
      return data as RuleOption[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async (vals: { name: string; label: string }) => {
      const { error } = await supabase.from("rule_categories").insert({ ...vals, scope });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rule_categories", scope] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rule_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rule_categories", scope] }),
  });

  const addType = useMutation({
    mutationFn: async (vals: { name: string; label: string }) => {
      const { error } = await supabase.from("rule_types").insert({ ...vals, scope });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rule_types", scope] }),
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rule_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rule_types", scope] }),
  });

  return { categories, types, addCategory, deleteCategory, addType, deleteType };
}
