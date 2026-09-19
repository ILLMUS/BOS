import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Loader2, User, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { STAGE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { shouldToast } from "@/lib/notificationPrefs";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Enums"]["job_stage"];

interface Row {
  id: string;
  job_id: string;
  stage: Stage;
  sla_started_at: string | null;
  sla_deadline_hours: number | null;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
  updated_at: string;
  job_number?: string;
  client_name?: string;
  primary_name?: string;
  secondary_name?: string;
}

function overdueState(sla_started_at: string | null, sla_deadline_hours: number | null) {
  if (!sla_started_at || !sla_deadline_hours) return { overdue: false, dueIn: null as string | null };
  const deadline = new Date(sla_started_at).getTime() + sla_deadline_hours * 3600_000;
  const now = Date.now();
  return {
    overdue: now > deadline,
    dueIn: formatDistanceToNow(new Date(deadline), { addSuffix: true }),
  };
}

export default function PendingApprovalsQueue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const knownRef = useRef<Map<string, string> | null>(null);
  const STORAGE_KEY = "pending-approvals:viewed";
  const LAST_SEEN_KEY = "pending-approvals:lastSeen";
  // Map of stage-id -> last updated_at that was viewed
  const [viewed, setViewed] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const v = localStorage.getItem(LAST_SEEN_KEY);
    return v ? Number(v) : 0;
  });

  const persistViewed = (next: Record<string, string>) => {
    setViewed({ ...next });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const markOne = (r: Row) => {
    const next = { ...viewed, [r.id]: r.updated_at };
    persistViewed(next);
  };

  const markOneRef = useRef(markOne);
  markOneRef.current = markOne;

  const markAll = () => {
    const next = { ...viewed };
    rows.forEach((r) => (next[r.id] = r.updated_at));
    persistViewed(next);
    const now = Date.now();
    setLastSeen(now);
    localStorage.setItem(LAST_SEEN_KEY, String(now));
  };

  const isNew = (r: Row) => {
    const seen = viewed[r.id];
    if (!seen) return new Date(r.updated_at).getTime() > lastSeen;
    return new Date(r.updated_at).getTime() > new Date(seen).getTime();
  };

  const unreadCount = rows.filter(isNew).length;

  const fetchRows = useCallback(async () => {
    const { data } = await supabase
      .from("job_stages")
      .select("id, job_id, stage, sla_started_at, sla_deadline_hours, primary_owner_id, secondary_owner_id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (!data) {
      setLoading(false);
      return;
    }

    const jobIds = [...new Set(data.map((r) => r.job_id))];
    const ownerIds = [
      ...new Set([
        ...data.map((r) => r.primary_owner_id),
        ...data.map((r) => r.secondary_owner_id),
      ].filter(Boolean) as string[]),
    ];

    const [jobsRes, profilesRes] = await Promise.all([
      jobIds.length
        ? supabase.from("jobs").select("id, job_number, client_name").in("id", jobIds)
        : Promise.resolve({ data: [] as { id: string; job_number: string; client_name: string }[] }),
      ownerIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

    const jobMap = new Map((jobsRes.data ?? []).map((j) => [j.id, j]));
    const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));

    setRows(
      data.map((r) => ({
        ...r,
        job_number: jobMap.get(r.job_id)?.job_number,
        client_name: jobMap.get(r.job_id)?.client_name,
        primary_name: r.primary_owner_id ? nameMap.get(r.primary_owner_id) : undefined,
        secondary_name: r.secondary_owner_id ? nameMap.get(r.secondary_owner_id) : undefined,
      })),
    );
    setLoading(false);

    const enriched: Row[] = data.map((r) => ({
      ...r,
      job_number: jobMap.get(r.job_id)?.job_number,
      client_name: jobMap.get(r.job_id)?.client_name,
      primary_name: r.primary_owner_id ? nameMap.get(r.primary_owner_id) : undefined,
      secondary_name: r.secondary_owner_id ? nameMap.get(r.secondary_owner_id) : undefined,
    }));
    const prev = knownRef.current;
    if (prev) {
      // Toast for new pending approvals — prioritize those where current user is an owner
      const fresh = enriched.filter((r) => {
        const seen = prev.get(r.id);
        return !seen || seen !== r.updated_at;
      });
      const mine = fresh.filter(
        (r) => user && (r.primary_owner_id === user.id || r.secondary_owner_id === user.id),
      );
      const toShow = (mine.length ? mine : fresh).slice(0, 3);
      toShow.forEach((r) => {
        const mineFlag = !!user && (r.primary_owner_id === user.id || r.secondary_owner_id === user.id);
        if (!shouldToast("approval", { stage: r.stage, assignedToMe: mineFlag })) return;
        toast(mineFlag ? "Assigned to you" : "New pending approval", {
          description: `${r.job_number ?? ""}${r.client_name ? ` · ${r.client_name}` : ""} — ${STAGE_LABELS[r.stage]}`,
          action: {
            label: "Open",
            onClick: () => {
              markOneRef.current(r);
              navigate(`/jobs/${r.job_id}?stage=${r.stage}`);
            },
          },
          cancel: {
            label: "Mark viewed",
            onClick: () => markOneRef.current(r),
          },
        });
      });
    }
    knownRef.current = new Map(enriched.map((r) => [r.id, r.updated_at]));
  }, [navigate, user]);

  useEffect(() => {
    fetchRows();
    let debounce: number | null = null;
    const schedule = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(fetchRows, 400);
    };
    const channel = supabase
      .channel("pending-approvals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_stages" }, schedule)
      .subscribe();
    const tick = window.setInterval(fetchRows, 60_000);
    return () => {
      if (debounce) window.clearTimeout(debounce);
      window.clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          Pending Approvals
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {unreadCount} new
            </Badge>
          )}
          <Badge variant="outline" className="ml-auto text-xs">
            {rows.length}
          </Badge>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={markAll}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all viewed
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing awaiting approval.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const { overdue, dueIn } = overdueState(r.sla_started_at, r.sla_deadline_hours);
              const fresh = isNew(r);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      markOne(r);
                      navigate(`/jobs/${r.job_id}?stage=${r.stage}`);
                    }}
                    className={`flex w-full flex-col gap-1 rounded border p-3 text-left transition-colors hover:bg-muted ${fresh ? "border-accent bg-accent/5" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.job_number}</span>
                      <span className="font-medium">{r.client_name}</span>
                      {fresh && (
                        <Badge variant="destructive" className="text-[10px]">
                          New
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {STAGE_LABELS[r.stage]}
                      </Badge>
                      {overdue ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Overdue
                        </Badge>
                      ) : dueIn ? (
                        <span className="text-[10px] text-muted-foreground">Due {dueIn}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {r.primary_name ?? "Unassigned"}
                      </span>
                      {r.secondary_name && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {r.secondary_name}
                        </span>
                      )}
                      <span className="ml-auto">Awaiting approval</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}