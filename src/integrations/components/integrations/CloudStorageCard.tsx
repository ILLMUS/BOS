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
import { CloudUpload, ExternalLink, FileText, HardDrive } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";
import { toast } from "sonner";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cloud Storage</CardTitle>
        <p className="text-sm text-muted-foreground">
          Job documents and drawings uploaded in stages are stored securely in this workspace. Link
          an external folder (Google Drive, Dropbox, OneDrive or S3) to keep a mirrored copy your
          team can browse outside the app.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-accent/10 p-2">
              <CloudUpload className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Document sync</p>
                <Badge variant={connected ? "default" : "outline"}>
                  {connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {connected
                  ? `${provider} — ${savedUrl}`
                  : "Add the shared folder link your team uses for job files."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {connected && (
              <Button asChild size="sm" variant="outline">
                <a href={savedUrl} target="_blank" rel="noopener noreferrer">
                  Open folder <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            <Button size="sm" onClick={openDialog}>{connected ? "Manage" : "Connect"}</Button>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Recent job documents</p>
          </div>
          {filesLoading ? (
            <p className="text-xs text-muted-foreground">Loading documents…</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No documents uploaded yet. Files attached to job stages appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.path} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <JobFileLink url={f.url} className="truncate text-left hover:underline">
                      {f.name}
                    </JobFileLink>

                  </span>
                  <span className="shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cloud storage folder</DialogTitle>
            <DialogDescription>
              Paste the shareable link to the folder where your team keeps job documents and
              drawings. Leave it blank to disconnect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cloud-storage-url">Folder link</Label>
            <Input
              id="cloud-storage-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
            {!!url && !isValidStorageUrl(url) && (
              <p className="text-xs text-destructive">Enter a valid link.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            {connected && (
              <Button variant="outline" onClick={() => save.mutate("")} disabled={save.isPending}>
                Disconnect
              </Button>
            )}
            <Button
              onClick={() => save.mutate(url)}
              disabled={save.isPending || (!!url && !isValidStorageUrl(url))}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
