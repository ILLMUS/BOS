import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/crm";
import { reconcileAllJobs, type FlagSeverity, type ReconcileInput } from "@/lib/jobReconcile";

const ICON: Record<FlagSeverity, typeof Info> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONE: Record<FlagSeverity, string> = {
  error: "text-destructive",
  warning: "text-accent",
  info: "text-muted-foreground",
};

export default function ReconciliationTab(input: ReconcileInput) {
  const report = useMemo(() => reconcileAllJobs(input), [input]);
  const [open, setOpen] = useState<string | null>(report.flagged[0]?.jobId ?? null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Jobs checked", v: String(report.checked) },
          { l: "Mismatches", v: String(report.errors), tone: report.errors ? "text-destructive" : "" },
          { l: "Needs a look", v: String(report.warnings), tone: report.warnings ? "text-accent" : "" },
          { l: "In agreement", v: String(report.clean) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.l}</p>
              <p className={`mt-1 text-xl font-semibold ${k.tone || ""}`}>{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote → invoice → money received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!report.rows.length && (
            <p className="text-sm text-muted-foreground">No job has money figures yet, so there is nothing to compare.</p>
          )}

          {report.rows.map((r) => {
            const Icon = r.status ? ICON[r.status] : CheckCircle2;
            const tone = r.status ? TONE[r.status] : "text-primary";
            const expanded = open === r.jobId;
            return (
              <div key={r.jobId} className="rounded-lg border border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 text-left"
                  onClick={() => setOpen(expanded ? null : r.jobId)}
                >
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.jobNumber} · {r.clientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Quoted {formatMoney(r.quoted)} · Invoiced {formatMoney(r.invoiced)} · Received {formatMoney(r.received)}
                    </p>
                  </div>
                  {r.status === "error" && <Badge variant="destructive">Mismatch</Badge>}
                  {r.status === "warning" && <Badge variant="outline">Check</Badge>}
                  {!r.status && <Badge variant="secondary">Balanced</Badge>}
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-border p-3">
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      {[
                        { l: "Quoted", v: r.quoted },
                        { l: "Approved variations", v: r.approvedVariations },
                        { l: "Agreed value", v: r.agreedValue },
                        { l: "Invoiced", v: r.invoiced },
                        { l: "Received", v: r.received },
                        { l: "Outstanding", v: r.outstanding },
                      ].map((c) => (
                        <div key={c.l} className="rounded-lg border border-border p-2">
                          <p className="text-xs text-muted-foreground">{c.l}</p>
                          <p className="font-medium">{formatMoney(c.v)}</p>
                        </div>
                      ))}
                    </div>

                    {r.flags.length ? (
                      <div className="space-y-1.5">
                        {r.flags.map((f) => {
                          const FIcon = ICON[f.severity];
                          return (
                            <div key={f.code} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
                              <FIcon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[f.severity]}`} />
                              <div>
                                <p className="font-medium">{f.label}</p>
                                <p className="text-xs text-muted-foreground">{f.detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Every figure on this job agrees.</p>
                    )}

                    <Button asChild size="sm" variant="outline">
                      <Link to={`/jobs/${r.jobId}`}>Open job</Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
