import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ExternalLink, Upload, Check, X } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";
import { toast } from "sonner";


interface Drawing {
  id: string;
  revision: number;
  title: string;
  file_url: string;
  status: string;
  client_approver_name: string | null;
  client_approved_at: string | null;
  rejection_reason: string | null;
}

export default function ShopDrawingsPanel({ jobId }: { jobId: string }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState("1");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("shop_drawings").select("*").eq("job_id", jobId)
      .order("created_at", { ascending: false });
    setItems((data || []) as Drawing[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${jobId}/drawings/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-files").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("job-files").getPublicUrl(path);
    setFileUrl(publicUrl);
    setUploading(false);
    toast.success("Drawing uploaded");
  };

  const handleAdd = async () => {
    if (!user || !fileUrl) { toast.error("Upload a drawing file first"); return; }
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("shop_drawings").insert({
      job_id: jobId, title: title.trim(), revision: parseInt(revision) || 1,
      file_url: fileUrl, uploaded_by: user.id,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Drawing logged");
    setTitle(""); setRevision("1"); setFileUrl(""); setShow(false);
    fetchItems();
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const updates: any = { status, approved_by: user?.id };
    if (status === "approved") {
      const name = prompt("Client approver name:");
      if (!name) return;
      updates.client_approver_name = name;
      updates.client_approved_at = new Date().toISOString();
    } else {
      const reason = prompt("Rejection reason:");
      if (!reason) return;
      updates.rejection_reason = reason;
    }
    const { error } = await supabase.from("shop_drawings").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Drawing ${status}`);
    fetchItems();
  };

  const hasApproved = items.some((d) => d.status === "approved");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Shop Drawings</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        {!hasApproved && (
          <p className="text-xs text-destructive">⚠ Production cannot start until at least one drawing is client-approved.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-2 rounded border border-border p-3">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Main gate elevation" />
            <Label>Revision</Label>
            <Input type="number" value={revision} onChange={(e) => setRevision(e.target.value)} />
            <div>
              <Label>Drawing file</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                    Upload
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
                  </label>
                </Button>
                {fileUrl && <span className="text-xs text-success">Attached</span>}
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Drawing
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drawings uploaded.</p>
        ) : (
          <div className="space-y-2">
            {items.map((d) => (
              <div key={d.id} className="rounded border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.title} (Rev {d.revision})</p>
                    {d.client_approver_name && (
                      <p className="text-xs text-muted-foreground">Approved by {d.client_approver_name}</p>
                    )}
                    {d.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Rejected: {d.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <JobFileLink url={d.file_url} className="text-accent">
                      <ExternalLink className="h-4 w-4" />
                    </JobFileLink>
                    <Badge variant="outline" className={
                      d.status === "approved" ? "border-success text-success"
                      : d.status === "rejected" ? "border-destructive text-destructive"
                      : "border-accent text-accent"
                    }>
                      {d.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {d.status === "pending" && isAdmin && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="border-success text-success" onClick={() => setStatus(d.id, "approved")}>
                      <Check className="mr-1 h-3 w-3" /> Mark Client-Approved
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => setStatus(d.id, "rejected")}>
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
