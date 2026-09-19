import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, PlusCircle, RefreshCw, Loader2, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { STAGE_LABELS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { shouldToast } from "@/lib/notificationPrefs";
import type { Database, Json } from "@/integrations/supabase/types";

type Stage = Database["public"]["Enums"]["job_stage"];

interface Entry {
  id: string;
  action: string;
  stage: Stage | null;
  job_id: string | null;
  user_id: string;
  details: Json;
  created_at: string;
  actor_name?: string;
  job_number?: string;
  client_name?: string;
}

const ACTION_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  stage_approved: { icon: CheckCircle2, label: "Approved", color: "text-success" },
  job_created: { icon: PlusCircle, label: "Created", color: "text-accent" },
  refresh_sync_success: { icon: RefreshCw, label: "Synced", color: "text-primary" },
};

export default function ActivityFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const STORAGE_KEY = "activity-feed:viewed";
  const LAST_SEEN_KEY = "activity-feed:lastSeen";
  const [viewed, setViewed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const v = localStorage.getItem(LAST_SEEN_KEY);
    return v ? Number(v) : 0;
  });

  const persistViewed = (next: Set<string>) => {
    setViewed(new Set(next));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next].slice(-200)));
  };

  const markOne = (id: string) => {
    if (viewed.has(id)) return;
    const next = new Set(viewed);
    next.add(id);
    persistViewed(next);
  };

  const markOneRef = useRef(markOne);
  markOneRef.current = markOne;

  const markAll = () => {
    const next = new Set(viewed);
    entries.forEach((e) => next.add(e.id));
    persistViewed(next);
    const now = Date.now();
    setLastSeen(now);
    localStorage.setItem(LAST_SEEN_KEY, String(now));
  };

  const isNew = (e: Entry) =>
    !viewed.has(e.id) && new Date(e.created_at).getTime() > lastSeen;

  const unreadCount = entries.filter(isNew).length;

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (!data) {
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(data.map((e) => e.user_id).filter(Boolean))];
    const jobIds = [...new Set(data.map((e) => e.job_id).filter(Boolean) as string[])];

    const [profilesRes, jobsRes] = await Promise.all([
      actorIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", actorIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      jobIds.length
        ? supabase.from("jobs").select("id, job_number, client_name").in("id", jobIds)
        : Promise.resolve({ data: [] as { id: string; job_number: string; client_name: string }[] }),
    ]);

    const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));
    const jobMap = new Map((jobsRes.data ?? []).map((j) => [j.id, j]));

    setEntries(
      data.map((e) => ({
        ...e,
        actor_name: nameMap.get(e.user_id) ?? "System",
        job_number: e.job_id ? jobMap.get(e.job_id)?.job_number : undefined,
        client_name: e.job_id ? jobMap.get(e.job_id)?.client_name : undefined,
      })),
    );
    setLoading(false);

    // Toast for newly seen entries (skip initial load and self-authored)
    const enriched = data.map((e) => ({
      ...e,
      actor_name: nameMap.get(e.user_id) ?? "System",
      job_number: e.job_id ? jobMap.get(e.job_id)?.job_number : undefined,
      client_name: e.job_id ? jobMap.get(e.job_id)?.client_name : undefined,
    }));
    const prevKnown = knownIdsRef.current;
    if (prevKnown) {
      const fresh = enriched.filter((e) => !prevKnown.has(e.id) && e.user_id !== user?.id);
      fresh.slice(0, 3).forEach((e) => {
        if (!shouldToast("activity", { stage: (e.stage as Stage) ?? null })) return;
        const meta = ACTION_META[e.action] ?? { label: e.action };
        toast(`${meta.label} · ${e.actor_name}`, {
          description: e.job_number
            ? `${e.job_number}${e.client_name ? ` · ${e.client_name}` : ""}${e.stage ? ` — ${STAGE_LABELS[e.stage as Stage] ?? e.stage}` : ""}`
            : undefined,
          action: e.job_id
            ? {
                label: "Open",
                onClick: () => {
                  markOneRef.current(e.id);
                  navigate(`/jobs/${e.job_id}${e.stage ? `?stage=${e.stage}` : ""}`);
                },
              }
            : undefined,
          cancel: {
            label: "Mark viewed",
            onClick: () => markOneRef.current(e.id),
          },
        });
      });
    }
    knownIdsRef.current = new Set(enriched.map((e) => e.id));
  }, [navigate, user?.id]);

  useEffect(() => {
    fetchEntries();
    let debounce: number | null = null;
    const schedule = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(fetchEntries, 300);
    };
    const channel = supabase
      .channel("activity-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, schedule)
      .subscribe();
    return () => {
      if (debounce) window.clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Activity className="h-5 w-5 text-accent" />
          Live Activity Feed
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {unreadCount} new
            </Badge>
          )}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-auto px-2 py-1 text-xs text-muted-foreground"
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
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => {
              const meta = ACTION_META[e.action] ?? { icon: Activity, label: e.action, color: "text-muted-foreground" };
              const Icon = meta.icon;
              const fresh = isNew(e);
              return (
                <li
                  key={e.id}
                  className={`flex items-start gap-3 py-2.5 text-sm ${e.job_id ? "cursor-pointer hover:bg-muted/40" : ""} ${fresh ? "bg-accent/5" : ""}`}
                  onClick={() => {
                    markOne(e.id);
                    if (e.job_id)
                      navigate(`/jobs/${e.job_id}${e.stage ? `?stage=${e.stage}` : ""}`);
                  }}
                >
                  <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{e.actor_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {fresh && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="new" />
                      )}
                      {e.stage && (
                        <span className="text-xs text-muted-foreground">
                          {STAGE_LABELS[e.stage as Stage] ?? e.stage}
                        </span>
                      )}
                    </div>
                    {e.job_number && (
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{e.job_number}</span>
                        {e.client_name && ` · ${e.client_name}`}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}