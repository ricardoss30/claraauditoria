import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PNCPSearchParams {
  dataInicial: string;
  dataFinal: string;
  uf?: string;
  codigoModalidadeContratacao?: string;
  pagina?: number;
}

export interface PNCPItem {
  id: string;
  title: string;
  agency: string;
  modality: string;
  value: number | null;
  publishedAt: string;
  uf: string;
}

export interface PNCPSearchResult {
  items: PNCPItem[];
  totalPages: number;
  currentPage: number;
}

export function useImportPNCP() {
  const [searchResults, setSearchResults] = useState<PNCPSearchResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchMutation = useMutation({
    mutationFn: async (params: PNCPSearchParams): Promise<PNCPSearchResult> => {
      const { data, error } = await supabase.functions.invoke("import-pncp", {
        body: { action: "search", ...params },
      });
      if (error) throw error;
      return data as PNCPSearchResult;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({ title: "Erro na busca", description: err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("import-pncp", {
        body: { action: "import", ids },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Importação concluída", description: `${data.imported} edital(is) importado(s)` });
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!searchResults) return;
    if (selectedIds.size === searchResults.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searchResults.items.map((i) => i.id)));
    }
  };

  return {
    searchResults,
    selectedIds,
    searchMutation,
    importMutation,
    toggleSelection,
    toggleAll,
  };
}
