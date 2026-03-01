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

  const saveWithHistory = useMutation({
    mutationFn: async (newValue: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Save current value as version before overwriting
      const { data: current } = await supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if ((current as any)?.value) {
        await supabase.from("setting_versions" as any).insert({
          setting_key: key,
          value: (current as any).value,
          created_by: user?.id,
        } as any);
      }

      // Upsert new value
      const { error } = await supabase
        .from("system_settings" as any)
        .upsert(
          { key, value: newValue, updated_at: new Date().toISOString(), updated_by: user?.id } as any,
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings", key] });
      queryClient.invalidateQueries({ queryKey: ["setting_versions", key] });
    },
  });

  return { ...query, upsert, saveWithHistory };
}

export function useSettingVersions(key: string) {
  return useQuery({
    queryKey: ["setting_versions", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setting_versions" as any)
        .select("*")
        .eq("setting_key", key)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}
