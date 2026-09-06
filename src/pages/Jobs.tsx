import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageSkeleton from "@/components/ui/page-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AUTHORITY } from "@/lib/authority";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { Plus, Search, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"jobs">;

interface JobProgress {
  pct: number;
  done: number;
  total: number;
  currentName: string | null;
}

export default function Jobs() {
  const navigate = useNavigate();
  const { hasRole, authority, user } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<Record<string, JobProgress>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      let list = data || [];

      // Field members only see the work they were handed.
      if (authority <= AUTHORITY.FIELD && user) {
        const { data: mine } = await supabase
          .from("job_stages")
          .select("job_id")
          .or(`primary_owner_id.eq.${user.id},secondary_owner_id.eq.${user.id}`);
        const allowed = new Set((mine || []).map((r: any) => r.job_id));
        list = list.filter((j) => allowed.has(j.id));
      }
      setJobs(list);

      if (list.length > 0) {
        // Progress comes from the job's own SOP stages, not the legacy stage enum
        const { data: stageRows } = await supabase
          .from("job_stages")
          .select("job_id, status, position, stage_name, stage")
          .in("job_id", list.map((j) => j.id))
          .order("position");

        const map: Record<string, JobProgress> = {};
        (stageRows || []).forEach((row: any) => {
          const entry = (map[row.job_id] ||= { pct: 0, done: 0, total: 0, currentName: null });
          entry.total += 1;
          if (row.status === "approved") entry.done += 1;
          if (!entry.currentName && row.status !== "approved" && row.status !== "locked") {
            entry.currentName = row.stage_name || (row.stage ? STAGE_LABELS[row.stage] : null);
          }
        });
        Object.values(map).forEach((e) => {
          e.pct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
        });
        setProgress(map);
      }
      setLoading(false);
    };
    fetchJobs();
  }, [authority, user]);

  const filtered = jobs.filter(
    (j) =>
      j.client_name.toLowerCase().includes(search.toLowerCase()) ||
      j.job_number.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-accent/10 text-accent border-accent/20";
      case "completed": return "bg-success/10 text-success border-success/20";
      case "on_hold": return "bg-warning/10 text-warning border-warning/20";
      case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Jobs</h1>
        {isSuperAdmin && (
          <Button
            onClick={() => navigate("/jobs/new")}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by client or job number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Job #</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-left font-medium">Current Stage</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No jobs found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((job) => {
                    const p = progress[job.id];
                    const legacyIdx = STAGE_ORDER.indexOf(job.current_stage);
                    const pct = p
                      ? p.pct
                      : Math.round(((legacyIdx + 1) / STAGE_ORDER.length) * 100);
                    const done = p ? p.done : Math.max(legacyIdx, 0);
                    const total = p ? p.total : STAGE_ORDER.length;
                    const stageLabel =
                      p?.currentName ?? STAGE_LABELS[job.current_stage] ?? job.current_stage;
                    return (
                      <tr
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{job.job_number}</td>
                        <td className="px-4 py-3 font-medium">{job.client_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{job.service_type || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {stageLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusColor(job.status)} variant="outline">
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct === 100 ? "bg-success" : "bg-accent"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              {pct}% · {done}/{total} steps
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
