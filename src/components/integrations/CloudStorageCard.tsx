import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CloudUpload, ExternalLink, FileText, HardDrive, Loader2 } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
  formatBytes, isValidStorageUrl, listRecentJobFiles, loadCloudStorageUrl,
  saveCloudStorageUrl, storageProviderName,
} from "@/lib/cloudStorage";

export default function CloudStorageCard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const { data: savedUrl = "" } = useQuery({
    queryKey: ["cloud-storage-url"],
    queryFn: loadCloudStorageUrl,
  });

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ["cloud-storage-recent-files"],
    queryFn: () => listRecentJobFiles(6),
  });

  const save = useMutation({
    mutationFn: (value: string) => saveCloudStorageUrl(value),
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["cloud-storage-url"] });
      setOpen(false);
      toast.success(value ? "Cloud storage connected" : "Cloud storage disconnected");
    },
    onError: () => toast.error("Could not save the cloud storage folder"),
  });

  const connected = !!savedUrl;
  const provider = storageProviderName(savedUrl);

  const openDialog = () => {
    setUrl(savedUrl);
    setOpen(true);
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <CloudUpload className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Cloud Storage</span>
        </CardTitle>
        <p className="break-words text-xs text-slate-400 mt-1">
          Job documents and drawings uploaded in stages are stored securely in this workspace. Link
          an external folder (Google Drive, Dropbox, OneDrive or S3) to keep a mirrored copy your
          team can browse outside the app.
        </p>
      </CardHeader>

      <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg border border-teal-400/20 bg-teal-500/10 p-2 shrink-0">
              <CloudUpload className="h-4 w-4 text-teal-400" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <p className="font-semibold text-white truncate text-xs sm:text-sm">Document sync</p>
                <Badge
                  variant="outline"
                  className={connected ? "border-teal-500/30 bg-teal-500/10 text-teal-400" : "border-slate-700 bg-slate-800 text-slate-400"}
                >
                  {connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="break-all text-xs text-slate-400">
                {connected
                  ? `${provider} — ${savedUrl}`
                  : "Add the shared folder link your team uses for job files."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
            {connected && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <a href={savedUrl} target="_blank" rel="noopener noreferrer">
                  Open folder <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={openDialog}
                className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              >
                {connected ? "Manage" : "Connect"}
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 min-w-0">
          <div className="mb-3 flex items-center gap-2 min-w-0">
            <HardDrive className="h-4 w-4 text-teal-400 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-white truncate">Recent job documents</p>
          </div>
          {filesLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
              <span>Loading documents…</span>
            </div>
          ) : files.length === 0 ? (
            <p className="break-words text-xs text-slate-400">
              No documents uploaded yet. Files attached to job stages appear here.
            </p>
          ) : (
            <ul className="space-y-2 min-w-0">
              {files.map((f) => (
                <li key={f.path} className="flex items-center justify-between gap-3 text-xs min-w-0 rounded-lg border border-white/[0.04] bg-[#030d12]/50 p-2 transition-colors hover:border-white/10">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <JobFileLink url={f.url} className="truncate text-left font-medium text-slate-200 hover:text-teal-300 hover:underline">
                      {f.name}
                    </JobFileLink>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#05131a] text-white shadow-2xl backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Cloud storage folder</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Paste the shareable link to the folder where your team keeps job documents and
              drawings. Leave it blank to disconnect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="cloud-storage-url" className="text-xs font-medium text-slate-300">Folder link</Label>
              <Input
                id="cloud-storage-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="h-9 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0"
              />
              {!!url && !isValidStorageUrl(url) && (
                <p className="text-[11px] text-rose-400">Enter a valid link.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {connected && (
              <Button
                variant="outline"
                onClick={() => save.mutate("")}
                disabled={save.isPending}
                className="h-8 border-rose-500/20 bg-rose-500/10 text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              >
                {save.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
              </Button>
            )}
            <Button
              onClick={() => save.mutate(url)}
              disabled={save.isPending || (!!url && !isValidStorageUrl(url))}
              className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
            >
              {save.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}