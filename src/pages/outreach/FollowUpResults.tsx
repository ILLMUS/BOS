import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatInZone, groupBy, loadScheduledSends, OUTCOME_LABELS, summarise, type ScheduledSend,
} from "@/lib/followups";
import { Loader2, MessageCircle, TrendingUp, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Pick<Tables<"campaigns">, "id" | "name">;

export default function FollowUpResults() {
  const { orgId } = useAuth();
  const [sends, setSends] = useState<ScheduledSend[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [rows, cs] = await Promise.all([
        loadScheduledSends(orgId),
        supabase.from("campaigns").select("id,name").eq("org_id", orgId).order("name"),
      ]);
      if (cancelled) return;
      setSends(rows);
      setCampaigns(cs.data ?? []);
      setLoading(false);
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [orgId]);

  const scoped = useMemo(
    () => (filter === "all" ? sends : sends.filter((s) => s.campaign_id === filter)),
    [sends, filter],
  );
  const totals = useMemo(() => summarise(scoped), [scoped]);
  const name = (id: string) => campaigns.find((c) => c.id === id)?.name ?? "Campaign";

  const perCampaign = useMemo(
    () => [...groupBy(scoped, (s) => s.campaign_id).entries()].map(([id, rows]) => ({ id, rows, s: summarise(rows) })),
    [scoped],
  );
  const perStage = useMemo(
    () => [...groupBy(scoped, (s) => `${s.step_index}|${s.step_subject}`).entries()]
      .map(([k, rows]) => ({ k, label: k.split("|")[1] || `Step ${Number(k.split("|")[0]) + 1}`, index: Number(k.split("|")[0]), rows, s: summarise(rows) }))
      .sort((a, b) => a.index - b.index),
    [scoped],
  );
  const unresolved = useMemo(
    () => scoped.filter((s) => s.status === "sent" && (!s.outcome || ["sent", "no_answer"].includes(s.outcome)))
      .sort((a, b) => (a.sent_at ?? "").localeCompare(b.sent_at ?? "")),
    [scoped],
  );
  const outcomeCounts = useMemo(() => {
    const m = new Map<string, number>();
    scoped.filter((s) => s.status === "sent").forEach((s) => {
      const k = s.outcome || "sent";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scoped]);

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">WhatsApp follow-up outcomes across every campaign and stage.</p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Messages sent" value={totals.sent} sub={`${totals.total} scheduled in total`} />
        <Stat label="Response rate" value={`${totals.responseRate}%`} sub={`${totals.responded} replies or meetings`} />
        <Stat label="Unresolved" value={totals.unresolved} sub="Sent with no reply yet" />
        <Stat label="Waiting approval" value={totals.pending} sub={`${totals.approved} approved, ${totals.cancelled} cancelled`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" /> Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!outcomeCounts.length && <p className="text-sm text-muted-foreground">No messages logged yet.</p>}
            {outcomeCounts.map(([k, n]) => (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{OUTCOME_LABELS[k] ?? k}</span>
                  <span className="text-muted-foreground">{n} · {Math.round((n / totals.sent) * 100)}%</span>
                </div>
                <Progress value={(n / totals.sent) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> By campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!perCampaign.length && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
            {perCampaign.map(({ id, s }) => (
              <div key={id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link className="text-sm font-medium underline" to={`/outreach/campaigns/${id}`}>{name(id)}</Link>
                  <Badge variant="outline">{s.responseRate}% response</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.sent} sent · {s.responded} responded · {s.unresolved} unresolved · {s.pending} awaiting approval
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> By sequence stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!perStage.length && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          {perStage.map((st) => (
            <div key={st.k} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Step {st.index + 1} · {st.label}</p>
                <Badge variant="outline">{st.s.responseRate}% response</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {st.s.sent} sent · {st.s.responded} responded · {st.s.noAnswer} no answer · {st.s.notInterested} not interested · {st.s.unresolved} unresolved
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Unresolved leads ({unresolved.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!unresolved.length && <p className="text-sm text-muted-foreground">Every contacted client has an outcome.</p>}
          {unresolved.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.client_name || "Client"}</p>
                <p className="text-xs text-muted-foreground">
                  {name(r.campaign_id)} · Step {r.step_index + 1} · {r.step_subject}
                  {r.sent_at && <> · sent {formatInZone(r.sent_at, r.timezone)}</>}
                </p>
              </div>
              <Badge variant="outline">{OUTCOME_LABELS[r.outcome ?? "sent"] ?? "Awaiting reply"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
