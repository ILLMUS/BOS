import { supabase } from "@/integrations/supabase/client";

export const CLOUD_STORAGE_URL_KEY = "cloud_storage_folder_url";
export const CLOUD_STORAGE_BUCKET = "job-files";

export function normalizeStorageUrl(raw: string) {
  const t = (raw || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function isValidStorageUrl(raw: string) {
  try {
    const u = new URL(normalizeStorageUrl(raw));
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Friendly provider name inferred from the folder link. */
export function storageProviderName(raw: string) {
  const url = normalizeStorageUrl(raw).toLowerCase();
  if (!url) return "";
  if (url.includes("drive.google")) return "Google Drive";
  if (url.includes("dropbox")) return "Dropbox";
  if (url.includes("onedrive") || url.includes("sharepoint") || url.includes("1drv.ms")) return "OneDrive";
  if (url.includes("box.com")) return "Box";
  if (url.includes("amazonaws.com") || url.includes("s3.")) return "Amazon S3";
  return "External storage";
}

export async function loadCloudStorageUrl(): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", CLOUD_STORAGE_URL_KEY)
    .maybeSingle();
  return data?.value ?? "";
}

export async function saveCloudStorageUrl(url: string) {
  const trimmed = normalizeStorageUrl(url);
  if (trimmed) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: CLOUD_STORAGE_URL_KEY, value: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase.from("app_settings").delete().eq("key", CLOUD_STORAGE_URL_KEY);
    if (error) throw error;
  }
  return trimmed;
}

export interface StoredFile {
  name: string;
  path: string;
  size: number;
  updatedAt: string | null;
  url: string;
}

/** Recent documents held in the built-in job document store. */
export async function listRecentJobFiles(limit = 8): Promise<StoredFile[]> {
  const { data: folders, error } = await supabase.storage
    .from(CLOUD_STORAGE_BUCKET)
    .list("", { limit: 50, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;

  const files: StoredFile[] = [];
  for (const entry of folders ?? []) {
    if (entry.id) {
      files.push(toStoredFile(entry, ""));
      continue;
    }
    const { data: inner } = await supabase.storage
      .from(CLOUD_STORAGE_BUCKET)
      .list(entry.name, { limit: 20, sortBy: { column: "created_at", order: "desc" } });
    for (const f of inner ?? []) files.push(toStoredFile(f, entry.name));
    if (files.length >= limit * 3) break;
  }

  return files
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredFile(entry: any, prefix: string): StoredFile {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  const { data } = supabase.storage.from(CLOUD_STORAGE_BUCKET).getPublicUrl(path);
  return {
    name: entry.name,
    path,
    size: entry.metadata?.size ?? 0,
    updatedAt: entry.updated_at ?? entry.created_at ?? null,
    url: data.publicUrl,
  };
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/* ------------------------------------------------------------------ */
/* Per-document mirror status                                          */
/* ------------------------------------------------------------------ */

export type SyncStatus = "queued" | "syncing" | "synced" | "failed";

export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  queued: "Queued",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Failed",
};

export interface DocumentSyncRow {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  status: SyncStatus;
  destination_url: string | null;
  error_message: string | null;
  queued_at: string;
  last_attempt_at: string | null;
  synced_at: string | null;
}

export async function listSyncStatuses(orgId: string): Promise<DocumentSyncRow[]> {
  const { data, error } = await supabase
    .from("document_sync_status")
    .select("id,file_path,file_name,file_size,status,destination_url,error_message,queued_at,last_attempt_at,synced_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentSyncRow[];
}

/** Register any storage files that are not yet being tracked. */
export async function queueUntrackedFiles(orgId: string, files: StoredFile[]) {
  if (files.length === 0) return 0;
  const { data: existing } = await supabase
    .from("document_sync_status")
    .select("file_path")
    .eq("org_id", orgId);
  const known = new Set((existing ?? []).map((r) => r.file_path));
  const rows = files
    .filter((f) => !known.has(f.path))
    .map((f) => ({
      org_id: orgId,
      file_path: f.path,
      file_name: f.name,
      file_size: f.size,
      status: "queued" as SyncStatus,
    }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("document_sync_status").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function setSyncStatus(
  id: string,
  status: SyncStatus,
  opts: { destinationUrl?: string | null; errorMessage?: string | null } = {},
) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    last_attempt_at: now,
    error_message: status === "failed" ? (opts.errorMessage ?? "Mirror attempt failed") : null,
  };
  if (status === "synced") patch.synced_at = now;
  if (status === "queued") {
    patch.synced_at = null;
    patch.queued_at = now;
    patch.last_attempt_at = null;
  }
  if (opts.destinationUrl !== undefined) patch.destination_url = opts.destinationUrl;
  const { error } = await supabase.from("document_sync_status").update(patch).eq("id", id);
  if (error) throw error;
}

export function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
