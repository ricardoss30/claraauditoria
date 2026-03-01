import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemSetting(key: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["system_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.value as string | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (value: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("system_settings" as any)
        .upsert(
          { key, value, updated_at: new Date().toISOString(), updated_by: user?.id } as any,
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings", key] });
    },
  });

  return { ...query, upsert };
}
