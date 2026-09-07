import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { useJobFileUrl } from "@/lib/jobFiles";

function FilePreview({ url }: { url: string }) {
  const src = useJobFileUrl(url);
  if (!src) {
    return <div className="h-24 w-full animate-pulse rounded bg-muted-foreground/10" />;
  }
  return <img src={src} alt="" className="h-24 w-full rounded object-cover" />;
}

interface FileUploadFieldProps {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  readOnly: boolean;
  jobId: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
}

export default function FileUploadField({
  label, value = [], onChange, readOnly, jobId, folder, accept = "image/*,.pdf", multiple = true,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${jobId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("job-files").upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("job-files").getPublicUrl(path);
        newUrls.push(publicUrl);
      }
      onChange([...value, ...newUrls]);
      toast.success(`${newUrls.length} file(s) uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)/.test(url.toLowerCase());

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
              <input type="file" accept={accept} multiple={multiple} onChange={handleUpload} className="hidden" />
            </label>
          </Button>
        </div>
      )}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((url, idx) => (
            <div key={idx} className="group relative rounded border border-border bg-muted p-1">
              {isImage(url) ? (
                <FilePreview url={url} />
              ) : (
                <div className="flex h-24 items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
