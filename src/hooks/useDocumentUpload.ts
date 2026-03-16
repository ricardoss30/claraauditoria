import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf, type PdfExtractionProgress } from "@/lib/pdfExtractor";
import { splitPdf, type SplitProgress } from "@/lib/pdfSplitter";

export type UploadStep = "idle" | "extracting_local" | "splitting" | "uploading" | "extracting" | "analyzing" | "done" | "error";

export interface MultiPartProgress {
  currentPart: number;
  totalParts: number;
}

export function useDocumentUpload() {
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<PdfExtractionProgress | null>(null);
  const [splitProgress, setSplitProgress] = useState<SplitProgress | null>(null);
  const [multiPartProgress, setMultiPartProgress] = useState<MultiPartProgress | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStep("idle");
    setError(null);
    setExtractionProgress(null);
    setSplitProgress(null);
    setMultiPartProgress(null);
  };

  const uploadSinglePart = async (partFile: File): Promise<string> => {
    const ext = partFile.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, partFile);
    if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);
    return path;
  };

  const processMultiPart = async (
    file: File,
    documentId: string,
    auditCriteria: string
  ): Promise<{ totalAlerts: number; combinedRiskScore: number }> => {
    setStep("splitting");
    const parts = await splitPdf(file, (p) => setSplitProgress(p));
    setSplitProgress(null);

    let combinedText = "";
    let totalAlerts = 0;
    let maxRiskScore = 0;

    for (let i = 0; i < parts.length; i++) {
      setMultiPartProgress({ currentPart: i + 1, totalParts: parts.length });

      // Upload part
      setStep("uploading");
      const partPath = await uploadSinglePart(parts[i]);

      // Process part via edge function
      setStep("extracting");
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: {
          document_id: documentId,
          content: `[Arquivo PDF: ${parts[i].name}]`,
          audit_criteria: auditCriteria,
          // For parts after the first, we append alerts instead of replacing
          ...(i > 0 ? { append_mode: true } : {}),
        },
      });

      if (fnErr) {
        const errMsg = fnErr.message || "";
        if (errMsg.includes("429")) {
          // Wait and retry once on rate limit
          await new Promise((r) => setTimeout(r, 5000));
          const retry = await supabase.functions.invoke("process-document", {
            body: {
              document_id: documentId,
              content: `[Arquivo PDF: ${parts[i].name}]`,
              audit_criteria: auditCriteria,
              ...(i > 0 ? { append_mode: true } : {}),
            },
          });
          if (retry.error) throw new Error(retry.error.message || "Erro no processamento");
        } else {
          throw new Error(errMsg || "Erro no processamento");
        }
      }

      if (fnData) {
        totalAlerts += fnData.alerts_count || 0;
        maxRiskScore = Math.max(maxRiskScore, fnData.risk_score || 0);
      }

      // Small delay between parts to avoid rate limits
      if (i < parts.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setMultiPartProgress(null);
    return { totalAlerts, combinedRiskScore: maxRiskScore };
  };

  const upload = async ({ file, text, audit_criteria }: { file?: File | null; text?: string; audit_criteria?: string }) => {
    try {
      setError(null);
      setStep("uploading");

      let fileUrl: string | null = null;
      let rawContent = text || "";
      let needsMultiPart = false;

      // Upload file to storage if provided
      if (file) {
        const MAX_SIZE = 600 * 1024 * 1024; // 600MB
        if (file.size > MAX_SIZE) {
          throw new Error("O arquivo excede o tamanho máximo de 600MB");
        }
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
        if (uploadErr) {
          if (uploadErr.message?.includes("exceeded the maximum allowed size") || uploadErr.message?.includes("Payload too large")) {
            throw new Error(
              "O arquivo excede o limite de upload do Supabase. Acesse o dashboard do Supabase → Storage → Settings e aumente o 'Global file size limit' para o valor desejado."
            );
          }
          throw new Error(`Upload falhou: ${uploadErr.message}`);
        }
        fileUrl = path;

        // For text files read content; for PDFs extract text client-side
        if (file.type === "text/plain") {
          rawContent = await file.text();
        } else if (file.type === "application/pdf") {
          setStep("extracting_local");
          try {
            const pdfText = await extractTextFromPdf(file, (progress) => {
              setExtractionProgress(progress);
            });
            if (pdfText && pdfText.length >= 100) {
              rawContent = pdfText;
              console.log(`Client-side PDF extraction: ${pdfText.length} chars from ${file.name}`);
            } else {
              // Too little text — check if large enough to need splitting
              console.log(`Client-side extraction yielded only ${pdfText.length} chars`);
              if (file.size > 20 * 1024 * 1024) {
                needsMultiPart = true;
              } else {
                rawContent = `[Arquivo PDF: ${file.name}]`;
              }
            }
          } catch (pdfErr: any) {
            console.warn("Client-side PDF extraction failed:", pdfErr.message);
            if (file.size > 20 * 1024 * 1024) {
              needsMultiPart = true;
            } else {
              rawContent = `[Arquivo PDF: ${file.name}]`;
            }
          }
          setExtractionProgress(null);
          setStep("uploading");
        } else {
          rawContent = text || `[Arquivo: ${file.name}]`;
        }
      }

      if (!needsMultiPart && !rawContent.trim()) throw new Error("Nenhum conteúdo fornecido");

      // Create document record
      const { data: user } = await supabase.auth.getUser();
      const { data: doc, error: insertErr } = await supabase
        .from("procurement_documents")
        .insert({
          title: "Documento sem título",
          status: "pending",
          file_url: fileUrl,
          raw_content: needsMultiPart ? `[PDF grande em processamento: ${file!.name}]` : rawContent,
          created_by: user.user?.id,
          extracted_data: audit_criteria ? { audit_criteria } : {},
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Erro ao criar documento: ${insertErr.message}`);

      // Multi-part processing for large scanned PDFs
      if (needsMultiPart && file) {
        const { totalAlerts, combinedRiskScore } = await processMultiPart(
          file,
          doc.id,
          audit_criteria || ""
        );

        setStep("done");
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });

        toast({
          title: "Documento processado (em partes)",
          description: `${totalAlerts} alerta(s) gerado(s). Score de risco: ${combinedRiskScore}`,
        });

        return doc.id;
      }

      // Normal single-part processing
      setStep("extracting");

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: { document_id: doc.id, content: rawContent, audit_criteria: audit_criteria || "" },
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

  return { upload, reprocess, step, error, reset, extractionProgress, splitProgress, multiPartProgress };
}
