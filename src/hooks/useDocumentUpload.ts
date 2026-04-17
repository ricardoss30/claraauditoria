import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf, type PdfExtractionProgress } from "@/lib/pdfExtractor";
import { splitPdf, type SplitProgress } from "@/lib/pdfSplitter";
import * as tus from "tus-js-client";

export type UploadStep = "idle" | "extracting_local" | "splitting" | "uploading" | "extracting" | "analyzing" | "done" | "error";

/**
 * Extract a useful error message from a supabase.functions.invoke() error.
 * The default `error.message` is generic ("Edge Function returned a non-2xx status code");
 * the real backend message is in `error.context` (a Response object).
 */
async function extractInvokeError(fnErr: any, fallback = "Erro no processamento"): Promise<string> {
  if (!fnErr) return fallback;
  try {
    const ctx = fnErr.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json().catch(async () => {
        const txt = await ctx.clone().text().catch(() => "");
        return txt ? { error: txt } : null;
      });
      if (body?.error) return typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    } else if (ctx && typeof ctx.text === "function") {
      const txt = await ctx.clone().text().catch(() => "");
      if (txt) {
        try {
          const parsed = JSON.parse(txt);
          if (parsed?.error) return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
        } catch {
          return txt;
        }
      }
    }
  } catch {
    /* fall through */
  }
  return fnErr.message || fallback;
}

export interface MultiPartProgress {
  currentPart: number;
  totalParts: number;
}

const SUPABASE_URL = "https://ktqrkijazzpafmfbkohe.supabase.co";
const SUPABASE_PROJECT_REF = "ktqrkijazzpafmfbkohe";
const MAX_SIZE = 2000 * 1024 * 1024; // 2GB
const TUS_THRESHOLD = 50 * 1024 * 1024; // 50MB — use TUS above this

/**
 * Upload a file using the TUS resumable protocol.
 * Returns the storage path on success.
 */
async function uploadWithTus(
  file: File,
  storagePath: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "documents",
        objectName: storagePath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      onError(err) {
        reject(new Error(`Upload resumable falhou: ${err.message}`));
      },
      onProgress(bytesUploaded, bytesTotal) {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess() {
        resolve(storagePath);
      },
    });
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) (upload as any).resumeUpload(prev[0]);
      else upload.start();
    });
  });
}

export function useDocumentUpload() {
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<PdfExtractionProgress | null>(null);
  const [splitProgress, setSplitProgress] = useState<SplitProgress | null>(null);
  const [multiPartProgress, setMultiPartProgress] = useState<MultiPartProgress | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStep("idle");
    setError(null);
    setExtractionProgress(null);
    setSplitProgress(null);
    setMultiPartProgress(null);
    setUploadProgress(null);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    if (file.size > TUS_THRESHOLD) {
      return uploadWithTus(file, path, (pct) => setUploadProgress(pct));
    }

    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) {
      if (
        uploadErr.message?.includes("exceeded the maximum allowed size") ||
        uploadErr.message?.includes("Payload too large")
      ) {
        throw new Error(
          "O arquivo excede o limite de upload do Supabase. Acesse o dashboard do Supabase → Storage → Settings e aumente o 'Global file size limit' para o valor desejado."
        );
      }
      throw new Error(`Upload falhou: ${uploadErr.message}`);
    }
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

    let totalAlerts = 0;
    let maxRiskScore = 0;

    for (let i = 0; i < parts.length; i++) {
      setMultiPartProgress({ currentPart: i + 1, totalParts: parts.length });

      setStep("uploading");
      const partPath = await uploadFile(parts[i]);

      setStep("extracting");
      const invokeBody = {
        document_id: documentId,
        content: `[Arquivo PDF: ${parts[i].name}]`,
        file_path: partPath,
        audit_criteria: auditCriteria,
        ...(i > 0 ? { append_mode: true } : {}),
      };

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: invokeBody,
      });

      if (fnErr) {
        const errMsg = await extractInvokeError(fnErr);
        if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
          await new Promise((r) => setTimeout(r, 5000));
          const retry = await supabase.functions.invoke("process-document", { body: invokeBody });
          if (retry.error) {
            const retryMsg = await extractInvokeError(retry.error);
            throw new Error(retryMsg);
          }
          if (retry.data) {
            totalAlerts += retry.data.alerts_count || 0;
            maxRiskScore = Math.max(maxRiskScore, retry.data.risk_score || 0);
          }
        } else {
          throw new Error(errMsg);
        }
      } else if (fnData) {
        totalAlerts += fnData.alerts_count || 0;
        maxRiskScore = Math.max(maxRiskScore, fnData.risk_score || 0);
      }

      if (i < parts.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    await supabase.from("procurement_documents").update({
      status: "processed",
      risk_score: maxRiskScore,
    }).eq("id", documentId);

    setMultiPartProgress(null);
    return { totalAlerts, combinedRiskScore: maxRiskScore };
  };

  const upload = async ({ file, text, audit_criteria, analysis_rule_ids, risk_rule_ids, metadata }: {
    file?: File | null;
    text?: string;
    audit_criteria?: string;
    analysis_rule_ids?: string[];
    risk_rule_ids?: string[];
    metadata?: {
      title?: string;
      agency?: string;
      modality?: string;
      estimated_value?: number;
      published_at?: string;
      description?: string;
    };
  }) => {
    try {
      setError(null);

      let fileUrl: string | null = null;
      let rawContent = text || "";
      let needsMultiPart = false;

      // ── Step 1: Extract text from PDF client-side BEFORE uploading ──
      if (file) {
        if (file.size > MAX_SIZE) {
          throw new Error("O arquivo excede o tamanho máximo de 2GB");
        }

        if (file.type === "text/plain") {
          rawContent = await file.text();
        } else if (file.type === "application/pdf") {
          setStep("extracting_local");
          // Trigger multipart for any scanned PDF likely to exceed the OCR limit (8MB).
          const NEEDS_SPLIT_BYTES = 8 * 1024 * 1024;
          try {
            const pdfText = await extractTextFromPdf(file, (progress) => {
              setExtractionProgress(progress);
            });
            if (pdfText && pdfText.length >= 100) {
              rawContent = pdfText;
              console.log(`Client-side PDF extraction: ${pdfText.length} chars from ${file.name}`);
            } else {
              console.log(`Client-side extraction yielded only ${pdfText.length} chars`);
              if (file.size > NEEDS_SPLIT_BYTES) {
                needsMultiPart = true;
              } else {
                rawContent = `[Arquivo PDF: ${file.name}]`;
              }
            }
          } catch (pdfErr: any) {
            console.warn("Client-side PDF extraction failed:", pdfErr.message);
            if (file.size > NEEDS_SPLIT_BYTES) {
              needsMultiPart = true;
            } else {
              rawContent = `[Arquivo PDF: ${file.name}]`;
            }
          }
          setExtractionProgress(null);
        } else {
          rawContent = text || `[Arquivo: ${file.name}]`;
        }

        // ── Step 2: Upload the file to Storage ──
        // Skip the full-file upload for multipart — each part will be uploaded individually.
        if (!needsMultiPart) {
          setStep("uploading");
          setUploadProgress(0);
          fileUrl = await uploadFile(file);
          setUploadProgress(null);
        }
      }

      if (!needsMultiPart && !rawContent.trim()) throw new Error("Nenhum conteúdo fornecido");

      // ── Step 3: Create document record ──
      const { data: user } = await supabase.auth.getUser();
      const { data: doc, error: insertErr } = await supabase
        .from("procurement_documents")
        .insert({
          title: metadata?.title || "Documento sem título",
          status: "pending",
          file_url: fileUrl,
          raw_content: needsMultiPart ? `[PDF grande em processamento: ${file!.name}]` : rawContent,
          created_by: user.user?.id,
          extracted_data: { ...(audit_criteria ? { audit_criteria } : {}), ...(analysis_rule_ids?.length ? { analysis_rule_ids } : {}), ...(risk_rule_ids?.length ? { risk_rule_ids } : {}) },
          ...(metadata?.agency && { agency: metadata.agency }),
          ...(metadata?.modality && { modality: metadata.modality }),
          ...(metadata?.estimated_value && { estimated_value: metadata.estimated_value }),
          ...(metadata?.published_at && { published_at: metadata.published_at }),
          ...(metadata?.description && { description: metadata.description }),
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Erro ao criar documento: ${insertErr.message}`);

      // ── Step 4a: Multi-part processing for large scanned PDFs ──
      if (needsMultiPart && file) {
        const { totalAlerts, combinedRiskScore } = await processMultiPart(file, doc.id, audit_criteria || "");

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

      // ── Step 4b: Normal single-part processing ──
      setStep("extracting");

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-document", {
        body: { document_id: doc.id, content: rawContent, audit_criteria: audit_criteria || "", analysis_rule_ids: analysis_rule_ids || [], risk_rule_ids: risk_rule_ids || [] },
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

  return { upload, reprocess, step, error, reset, extractionProgress, splitProgress, multiPartProgress, uploadProgress };
}
