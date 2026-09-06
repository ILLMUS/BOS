import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const JOB_FILES_BUCKET = "job-files";

/**
 * Job files live in a private bucket. Stored links may be legacy public URLs,
 * so we extract the object path and mint a short-lived signed URL on demand.
 */
export function jobFileStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${JOB_FILES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

export async function resolveJobFileUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const path = jobFileStoragePath(url);
  if (!path) return url; // external link (e.g. quote builder document)
  const { data, error } = await supabase.storage
    .from(JOB_FILES_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Resolves a stored file link to a viewable URL (signed when it is an internal file). */
export function useJobFileUrl(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(
    jobFileStoragePath(url) ? null : url ?? null,
  );

  useEffect(() => {
    let active = true;
    resolveJobFileUrl(url).then((r) => {
      if (active) setResolved(r);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}
