import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatDate } from "@/lib/crm";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type Deal = Tables<"deals">;
type Lead = Tables<"leads">;

const RANGES = [
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "365", label: "Last 12 months" },
  { key: "all", label: "All time" },
];

const normaliseReason = (r: string | null | undefined) => (r || "").trim() || "No reason recorded";

export default function WinLoss() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [range, setRange] = useState("90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, l] = await Promise.all([
        supabase.from("deals").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*").eq("status", "disqualified"),
      ]);
      setDeals(d.data || []);
      setLeads(l.data || []);
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d;
  }, [range]);

  const inRange = (iso: string | null) => {
    if (!cutoff) return true;
    if (!iso) return false;
    return new Date(iso) >= cutoff;
  };

  const closed = deals.filter((d) => d.status !== "open" && inRange(d.closed_at || d.updated_at));
  const won = closed.filter((d) => d.status === "won");
  const lost = closed.filter((d) => d.status === "lost");
  const wonValue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const lostValue = lost.reduce((s, d) => s + Number(d.value || 0), 0);
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const avgWon = won.length ? wonValue / won.length : 0;

  const lossReasons = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    lost.forEach((d) => {
      const key = normaliseReason(d.lost_reason);
      const cur = map.get(key) || { count: 0, value: 0 };
      map.set(key, { count: cur.count + 1, value: cur.value + Number(d.value || 0) });
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [lost]);

  const disqualReasons = useMemo(() => {
    const map = new Map<string, number>();
    leads.filter((l) => inRange(l.updated_at)).forEach((l) => {
      const key = normaliseReason(l.disqualified_reason);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads, cutoff]);

  const maxLoss = lossReasons[0]?.[1].count || 1;
  const maxDq = disqualReasons[0]?.[1] || 1;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Win / loss analytics</h1>
          <p className="text-sm text-muted-foreground">Why deals close and why they slip away.</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Win rate", value: `${winRate}%` },
          { label: "Deals won", value: `${won.length} · ${formatMoney(wonValue)}` },
          { label: "Deals lost", value: `${lost.length} · ${formatMoney(lostValue)}` },
          { label: "Average won deal", value: formatMoney(avgWon) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="font-heading text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Loss reasons (deals)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {lossReasons.length === 0 && <p className="text-sm text-muted-foreground">No lost deals in this period.</p>}
          {lossReasons.map(([reason, r]) => (
            <div key={reason} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{reason}</span>
                <span className="shrink-0 text-muted-foreground">{r.count} · {formatMoney(r.value)}</span>
              </div>
              <Progress value={(r.count / maxLoss) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Lead disqualification reasons</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {disqualReasons.length === 0 && <p className="text-sm text-muted-foreground">No disqualified leads in this period.</p>}
          {disqualReasons.map(([reason, count]) => (
            <div key={reason} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{reason}</span>
                <span className="shrink-0 text-muted-foreground">{count}</span>
              </div>
              <Progress value={(count / maxDq) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Recently closed</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {closed.length === 0 && <p className="text-sm text-muted-foreground">Nothing closed in this period.</p>}
          {closed.slice(0, 12).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(d.closed_at || d.updated_at)}
                  {d.status === "lost" && d.lost_reason ? ` · ${d.lost_reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatMoney(d.value)}</span>
                <Badge variant={d.status === "won" ? "default" : "destructive"}>{d.status === "won" ? "Won" : "Lost"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}