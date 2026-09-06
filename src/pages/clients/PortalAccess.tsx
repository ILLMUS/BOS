import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { loadJobsLite } from "@/lib/clientSuccess";
import { Copy, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";

type JobLite = Awaited<ReturnType<typeof loadJobsLite>>[number];

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export default function PortalAccess() {
  const { orgId } = useAuth();
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => setJobs(await loadJobsLite());

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [orgId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => `${j.job_number} ${j.client_name}`.toLowerCase().includes(q));
  }, [jobs, query]);

  const linkFor = (token: string | null) => (token ? `${window.location.origin}/track?token=${token}` : "");

  const copy = async (token: string | null) => {
    if (!token) return;
    await navigator.clipboard.writeText(linkFor(token));
    toast.success("Portal link copied");
  };

  const rotate = async (job: JobLite) => {
    setBusyId(job.id);
    const { error } = await supabase.from("jobs").update({ tracking_token: randomToken() }).eq("id", job.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Access link regenerated — the old link no longer works");
    reload();
  };

  const revoke = async (job: JobLite) => {
    setBusyId(job.id);
    const { error } = await supabase.from("jobs").update({ tracking_token: null }).eq("id", job.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Portal access revoked");
    reload();
  };

  const active = jobs.filter((j) => j.tracking_token).length;

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="font-heading text-2xl font-bold">Client Portal Access</h1>
        <p className="text-sm text-muted-foreground">
          Each job has a private tracking link clients can open without an account. Share, regenerate or revoke it here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Jobs with access", value: active },
          { label: "Access revoked", value: jobs.length - active },
          { label: "Total jobs", value: jobs.length },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="font-heading text-lg">Job access links</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search job or client" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs match that search.</p>
          ) : (
            visible.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <Link to={`/jobs/${j.id}`} className="hover:underline">{j.job_number}</Link>
                    <span className="text-muted-foreground"> · {j.client_name}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{j.tracking_token ? linkFor(j.tracking_token) : "No portal link"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={j.tracking_token ? "outline" : "secondary"}>{j.tracking_token ? "Active" : "Revoked"}</Badge>
                  {j.tracking_token && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copy(j.tracking_token)}>
                        <Copy className="mr-1 h-3.5 w-3.5" />Copy
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={linkFor(j.tracking_token)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" disabled={busyId === j.id} onClick={() => rotate(j)}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />{j.tracking_token ? "Regenerate" : "Enable"}
                  </Button>
                  {j.tracking_token && (
                    <Button size="sm" variant="ghost" disabled={busyId === j.id} onClick={() => revoke(j)}>Revoke</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
