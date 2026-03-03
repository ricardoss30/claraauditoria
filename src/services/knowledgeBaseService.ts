import { supabase } from "@/integrations/supabase/client";

const BUCKET = "base_conhecimento";

export async function uploadFile(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
  if (error) throw error;
  return data;
}

export async function listFiles(folder = "") {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 200, offset: 0 });
  if (error) throw error;
  return data ?? [];
}

export async function getFileUrl(path: string) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);
  return data?.signedUrl;
}

export async function deleteFile(path: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);
  if (error) throw error;
}

export async function createFolder(path: string) {
  const placeholder = `${path}/.emptyFolderPlaceholder`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(placeholder, new Blob([" "]), { upsert: true, contentType: "text/plain" });
  if (error) throw error;
}

export async function deleteFolder(path: string) {
  const files = await listFiles(path);
  if (files.length > 0) {
    const paths = files.map((f) => `${path}/${f.name}`);
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;
  }
}

export async function embedFile(filePath: string, action: "upsert" | "delete" = "upsert") {
  const { data, error } = await supabase.functions.invoke("embed-knowledge", {
    body: { file_path: filePath, action },
  });
  if (error) console.error("Embed error:", error);
  return data;
}
