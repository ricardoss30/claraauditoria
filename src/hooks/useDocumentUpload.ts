import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type UploadStep = "idle" | "uploading" | "extracting" | "analyzing" | "done" | "error";

export function useDocumentUpload() {
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reset = () => { setStep("idle"); setError(null); };

  const upload = async ({ file, text, audit_criteria }: { file?: File | null; text?: string; audit_criteria?: string }) => {
    try {
      setError(null);
      setStep("uploading");

      let fileUrl: string | null = null;
      let rawContent = text || "";

      // Upload file to storage if provided
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
        if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);
        fileUrl = path;

        // For text files read content; for PDFs we send the filename as content hint
        if (file.type === "text/plain") {
          rawContent = await file.text();
        } else {
          // For PDFs, we read as text best-effort (edge function will handle)
          rawContent = text || `[Arquivo PDF: ${file.name}]`;
        }
      }

      if (!rawContent.trim()) throw new Error("Nenhum conteúdo fornecido");

      // Create document record
      const { data: user } = await supabase.auth.getUser();
      const { data: doc, error: insertErr } = await supabase
        .from("procurement_documents")
        .insert({
          title: "Documento sem título",
          status: "pending",
          file_url: fileUrl,
          raw_content: rawContent,
          created_by: user.user?.id,
          extracted_data: audit_criteria ? { audit_criteria } : {},
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Erro ao criar documento: ${insertErr.message}`);

      setStep("extracting");

      // Call edge function
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: { document_id: doc.id, content: rawContent, audit_criteria: audit_criteria || "" },
      });

      if (fnErr) {
        // Check for specific error codes
        const errMsg = fnErr.message || "";
        if (errMsg.includes("429") || errMsg.includes("Rate limit")) {
          toast({ title: "Limite de requisições", description: "Aguarde alguns minutos e tente novamente.", variant: "destructive" });
        } else if (errMsg.includes("402") || errMsg.includes("Payment")) {
          toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace para continuar.", variant: "destructive" });
        }
        throw new Error(errMsg || "Erro no processamento");
      }

      setStep("analyzing");

      // Brief pause for UX
      await new Promise((r) => setTimeout(r, 500));

      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

      toast({ title: "Documento processado", description: `${fnData?.alerts_count || 0} alerta(s) gerado(s). Score de risco: ${fnData?.risk_score ?? "N/A"}` });

      return doc.id;
    } catch (e: any) {
      console.error("Upload error:", e);
      setStep("error");
      setError(e.message || "Erro desconhecido");
      toast({ title: "Erro no processamento", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const reprocess = async (documentId: string, content: string, forceReextract = false) => {
    try {
      setError(null);
      setStep("extracting");

      await supabase.from("procurement_documents").update({ status: "pending" }).eq("id", documentId);

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: { document_id: documentId, content, force_reextract: forceReextract },
      });

      if (fnErr) {
        const errMsg = fnErr.message || "";
        if (errMsg.includes("429") || errMsg.includes("Rate limit")) {
          toast({ title: "Limite de requisições", description: "Aguarde alguns minutos e tente novamente.", variant: "destructive" });
        } else if (errMsg.includes("402") || errMsg.includes("Payment")) {
          toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace para continuar.", variant: "destructive" });
        }
        throw new Error(errMsg || "Erro no processamento");
      }

      setStep("analyzing");
      await new Promise((r) => setTimeout(r, 500));
      setStep("done");

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document-alerts", documentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

      toast({ title: "Documento reprocessado", description: `${fnData?.alerts_count || 0} alerta(s) gerado(s). Score de risco: ${fnData?.risk_score ?? "N/A"}` });
      return documentId;
    } catch (e: any) {
      console.error("Reprocess error:", e);
      setStep("error");
      setError(e.message || "Erro desconhecido");
      toast({ title: "Erro no reprocessamento", description: e.message, variant: "destructive" });
      return null;
    }
  };

  return { upload, reprocess, step, error, reset };
}
