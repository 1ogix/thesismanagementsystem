import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = "thesis-documents";

/**
 * Build the storage path for a thesis document.
 * Pattern: {thesisId}/{stage}/v{version}_{fileName}
 */
export function buildStoragePath(
  thesisId: string,
  stage: string,
  version: number,
  fileName: string
): string {
  const sanitized = fileName.replace(/\s+/g, "_");
  return `${thesisId}/${stage}/v${version}_${sanitized}`;
}

/**
 * Upload a PDF to Supabase Storage and return the public path.
 */
export async function uploadThesisDocument(
  thesisId: string,
  stage: string,
  version: number,
  file: File
): Promise<{ path: string; error: string | null }> {
  const path = buildStoragePath(thesisId, stage, version, file.name);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: "application/pdf" });

  if (error) return { path: "", error: error.message };
  return { path, error: null };
}

/**
 * Generate a signed URL for viewing a document (valid for 1 hour).
 */
export async function getSignedUrl(
  path: string
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 600);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

/**
 * Delete a single document from storage.
 */
export async function deleteDocument(path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Delete ALL documents for a thesis from storage.
 * Lists every stage sub-folder and bulk-removes all found files.
 */
export async function deleteThesisDocuments(
  thesisId: string
): Promise<{ error: string | null }> {
  const stages = ["proposal", "pre_oral", "final_oral", "manuscript"];
  const allPaths: string[] = [];

  for (const stage of stages) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`${thesisId}/${stage}`);
    if (data) {
      data.forEach((f) => allPaths.push(`${thesisId}/${stage}/${f.name}`));
    }
  }

  if (allPaths.length === 0) return { error: null };

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(allPaths);
  return { error: error?.message ?? null };
}
