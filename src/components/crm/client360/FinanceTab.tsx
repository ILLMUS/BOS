import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/crm";
import type { Client360Data } from "@/hooks/useClient360";
import { ExternalLink } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";


interface Props extends Pick<Client360Data, "quotes" | "invoices" | "payments" | "variations" | "jobs" | "expenses"> {}

export default function FinanceTab({ quotes, invoices, payments, variations, jobs, expenses }: Props) {
  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.job_number || "—";
  const invoiced = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const received = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = invoiced - received;
  const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Invoiced", v: formatMoney(invoiced) },
          { l: "Received", v: formatMoney(received) },
          { l: "Outstanding", v: formatMoney(outstanding) },
          { l: "Costs", v: formatMoney(spent) },
        ].map((k) => (
          <Card key={k.l}><CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.l}</p>
            <p className="mt-1 text-xl font-semibold">{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Quotes</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quotes.length ? quotes.map((q) => (
              <div key={`${q.jobId}-${q.reference}`} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{q.reference}</p>
                  <p className="text-xs text-muted-foreground">{q.jobNumber} · synced {formatDate(q.syncedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatMoney(q.amount)}</span>
                  {q.documentUrl && <a href={q.documentUrl} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-4 w-4" /></a>}
                </div>
              </div>
            )) : <p className="text-muted-foreground">No quotes synced.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoices.length ? invoices.map((i) => (
              <div key={`${i.jobId}-${i.reference}`} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{i.reference}</p>
                  <p className="text-xs text-muted-foreground">{i.jobNumber}{i.dueDate ? ` · due ${formatDate(i.dueDate)}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatMoney(i.amount)}</span>
                  {i.documentUrl && <a href={i.documentUrl} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-4 w-4" /></a>}
                </div>
              </div>
            )) : <p className="text-muted-foreground">No invoices synced.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payments received</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.length ? payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <div className="flex items-center gap-2 font-medium">{formatMoney(Number(p.amount))} <Badge variant="outline">{p.payment_type}</Badge></div>
                  <p className="text-xs text-muted-foreground">{jobNumber(p.job_id)} · {formatDate(p.paid_at)}{p.reference ? ` · ${p.reference}` : ""}</p>
                </div>
                {p.proof_url && <JobFileLink url={p.proof_url} className="text-accent"><ExternalLink className="h-4 w-4" /></JobFileLink>}
              </div>
            )) : <p className="text-muted-foreground">No payments recorded.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Variations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {variations.length ? variations.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">VO-{v.variation_number} · {v.description}</p>
                  <p className="text-xs text-muted-foreground">{jobNumber(v.job_id)} · {formatDate(v.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatMoney(Number(v.amount))}</span>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
              </div>
            )) : <p className="text-muted-foreground">No variations.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Costs</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expenses.length ? expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.category} · {formatDate(e.spent_at)}{e.job_id ? ` · ${jobNumber(e.job_id)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatMoney(Number(e.amount))}</span>
                  {e.billable && <Badge variant="outline">Billable</Badge>}
                </div>
              </div>
            )) : <p className="text-muted-foreground">No costs recorded.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
