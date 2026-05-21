import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { PdfExtractionProgress } from "@/lib/pdfExtractor";
import type { SplitProgress } from "@/lib/pdfSplitter";
import * as tus from "tus-js-client";

export type UploadStep = "idle" | "extracting_local" | "splitting" | "uploading" | "extracting" | "analyzing" | "done" | "error";

export interface MultiPartProgress {
  currentPart: number;
  totalParts: number;
}

const SUPABASE_PROJECT_REF = "ktqrkijazzpafmfbkohe";
const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (alinhado ao limite global do Supabase Storage)
const TUS_THRESHOLD = 50 * 1024 * 1024; // 50MB

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
  } catch { /* fall through */ }
  return fnErr.message || fallback;
}

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
      chunkSize: 6 * 1024 * 1024,
      onError(err) { reject(new Error(`Upload resumable falhou: ${err.message}`)); },
      onProgress(bytesUploaded, bytesTotal) {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess() { resolve(storagePath); },
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
  const [extractionProgress] = useState<PdfExtractionProgress | null>(null);
  const [splitProgress] = useState<SplitProgress | null>(null);
  const [multiPartProgress] = useState<MultiPartProgress | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStep("idle");
    setError(null);
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
          "O arquivo excede o limite de upload do Supabase. Aumente o 'Global file size limit' no dashboard do Supabase Storage."
        );
      }
      throw new Error(`Upload falhou: ${uploadErr.message}`);
    }
    return path;
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
      const rawText = text || "";

      if (file) {
        if (file.size > MAX_SIZE) throw new Error("O arquivo excede o tamanho máximo de 2GB");
        setStep("uploading");
        setUploadProgress(0);
        fileUrl = await uploadFile(file);
        setUploadProgress(null);
      }

      if (!file && !rawText.trim()) throw new Error("Nenhum conteúdo fornecido");

      // Create document record
      const { data: user } = await supabase.auth.getUser();
      const { data: doc, error: insertErr } = await supabase
        .from("procurement_documents")
        .insert({
          title: metadata?.title || (file?.name ?? "Documento sem título"),
          status: "pending",
          file_url: fileUrl,
          raw_content: rawText || (file ? `[Arquivo: ${file.name}]` : ""),
          created_by: user.user?.id,
          extracted_data: {
            ...(audit_criteria ? { audit_criteria } : {}),
            ...(analysis_rule_ids?.length ? { analysis_rule_ids } : {}),
            ...(risk_rule_ids?.length ? { risk_rule_ids } : {}),
          },
          ...(metadata?.agency && { agency: metadata.agency }),
          ...(metadata?.modality && { modality: metadata.modality }),
          ...(metadata?.estimated_value && { estimated_value: metadata.estimated_value }),
          ...(metadata?.published_at && { published_at: metadata.published_at }),
          ...(metadata?.description && { description: metadata.description }),
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Erro ao criar documento: ${insertErr.message}`);

      setStep("extracting");

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("n8n-process-document", {
        body: {
          document_id: doc.id,
          file_path: fileUrl,
          raw_text: fileUrl ? undefined : rawText,
          audit_criteria: audit_criteria || "",
          analysis_rule_ids: analysis_rule_ids || [],
          risk_rule_ids: risk_rule_ids || [],
          mode: "new",
        },
      });

      if (fnErr) {
        const errMsg = await extractInvokeError(fnErr);
        throw new Error(errMsg);
      }

      setStep("analyzing");
      await new Promise((r) => setTimeout(r, 300));
      setStep("done");

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

      toast({
        title: "Documento processado",
        description: `${fnData?.alerts_count || 0} alerta(s) gerado(s). Score de risco: ${fnData?.risk_score ?? "N/A"}`,
      });
      return doc.id;
    } catch (e: any) {
      console.error("Upload error:", e);
      setStep("error");
      setError(e.message || "Erro desconhecido");
      toast({ title: "Erro no processamento", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const reprocess = async (documentId: string, _content: string, _forceReextract = false) => {
    try {
      setError(null);
      setStep("extracting");

      // Look up file_path from the document record
      const { data: doc } = await supabase
        .from("procurement_documents")
        .select("file_url, extracted_data, raw_content")
        .eq("id", documentId)
        .single();

      const auditCriteria = (doc?.extracted_data as any)?.audit_criteria || "";

      await supabase.from("procurement_documents").update({ status: "pending" }).eq("id", documentId);

      const { data: fnData, error: fnErr } = await supabase.functions.invoke("n8n-process-document", {
        body: {
          document_id: documentId,
          file_path: doc?.file_url || null,
          raw_text: doc?.file_url ? undefined : (doc?.raw_content || _content),
          audit_criteria: auditCriteria,
          mode: "reprocess",
        },
      });

      if (fnErr) {
        const errMsg = await extractInvokeError(fnErr);
        throw new Error(errMsg);
      }

      setStep("analyzing");
      await new Promise((r) => setTimeout(r, 300));
      setStep("done");

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document-alerts", documentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

      toast({
        title: "Documento reprocessado",
        description: `${fnData?.alerts_count || 0} alerta(s) gerado(s). Score de risco: ${fnData?.risk_score ?? "N/A"}`,
      });
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
