import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/crm";
import type { Client360Data } from "@/hooks/useClient360";
import { ExternalLink, FileText } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";


interface Props extends Pick<Client360Data, "drawings" | "quotes" | "invoices" | "payments" | "jobs"> {}

interface DocRow { key: string; title: string; kind: string; url: string | null; job: string; date: string | null; status?: string }

export default function DocumentsTab({ drawings, quotes, invoices, payments, jobs }: Props) {
  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.job_number || "—";

  const docs: DocRow[] = [
    ...drawings.map((d) => ({
      key: `dw-${d.id}`, title: `${d.title} (rev ${d.revision})`, kind: "Shop drawing",
      url: d.file_url, job: jobNumber(d.job_id), date: d.created_at, status: d.status,
    })),
    ...quotes.filter((q) => q.documentUrl).map((q) => ({
      key: `q-${q.jobId}-${q.reference}`, title: q.reference, kind: "Quote",
      url: q.documentUrl, job: q.jobNumber, date: q.syncedAt,
    })),
    ...invoices.filter((i) => i.documentUrl).map((i) => ({
      key: `i-${i.jobId}-${i.reference}`, title: i.reference, kind: "Invoice",
      url: i.documentUrl, job: i.jobNumber, date: i.syncedAt,
    })),
    ...payments.filter((p) => p.proof_url).map((p) => ({
      key: `p-${p.id}`, title: `Proof of payment ${p.reference || ""}`.trim(), kind: "Payment proof",
      url: p.proof_url, job: jobNumber(p.job_id), date: p.paid_at,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {docs.length ? docs.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.kind} · {d.job} · {formatDate(d.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {d.status && <Badge variant="outline">{d.status}</Badge>}
              {d.url && <JobFileLink url={d.url} className="text-accent"><ExternalLink className="h-4 w-4" /></JobFileLink>}
            </div>
          </div>
        )) : <p className="text-muted-foreground">No documents linked to this client yet.</p>}
      </CardContent>
    </Card>
  );
}
