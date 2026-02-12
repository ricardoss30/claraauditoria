import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSources() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("data_sources").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sources"] }),
  });

  const upsertSource = useMutation({
    mutationFn: async (source: {
      id?: string; name: string; source_type: string; base_url?: string; config?: any;
    }) => {
      const { error } = source.id
        ? await supabase.from("data_sources").update(source).eq("id", source.id)
        : await supabase.from("data_sources").insert(source);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sources"] }),
  });

  return { ...query, toggleActive, upsertSource };
}
