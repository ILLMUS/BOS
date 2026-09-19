import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveJobFileUrl } from "@/lib/jobFiles";

interface Props {
  url: string | null | undefined;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

/** Opens a stored job file, signing the URL first because the bucket is private. */
export default function JobFileLink({ url, className, title = "Open file", children }: Props) {
  const [loading, setLoading] = useState(false);
  if (!url) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const resolved = await resolveJobFileUrl(url);
      if (!resolved) {
        toast.error("You do not have access to this file");
        return;
      }
      window.open(resolved, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className} title={title} aria-label={title}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
