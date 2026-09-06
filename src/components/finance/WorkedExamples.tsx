import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, CheckCircle2, Circle } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/crm";
import { CURRENCY_CODE } from "@/lib/currency";
import type { ExternalDoc, Job } from "@/lib/finance";
import type { Tables } from "@/integrations/supabase/types";

type DocType = "quote" | "invoice" | "receipt";

interface Example {
  account: string;
  docType: DocType;
  stageLabel: string;
  story: string;
  preset: { reference: string; amount: number; status: string; dueDays: number | null };
}

/** Three worked reference examples, one parked at each money stage. */
const EXAMPLES: Example[] = [
  {
    account: "Mbabane Clinic Trust",
    docType: "quote",
    stageLabel: "Quote",
    story: "Priced and quoted, waiting on the client to accept. Nothing invoiced yet.",
    preset: { reference: "QTE-EX-001", amount: 96000, status: "issued", dueDays: 30 },
  },
  {
    account: "Manzini Mall Developers",
    docType: "invoice",
    stageLabel: "Invoice",
    story: "Work delivered and invoiced. Deposit in, balance still outstanding.",
    preset: { reference: "INV-EX-002", amount: 219000, status: "part_paid", dueDays: 21 },
  },
  {
    account: "Ezulwini Lodge Group",
    docType: "receipt",
    stageLabel: "Receipt",
    story: "Invoice settled in full and receipted. This is what a closed job looks like.",
    preset: { reference: "RCT-EX-003", amount: 205000, status: "paid", dueDays: null },
  },
];

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

interface Props {
  accounts: Tables<"accounts">[];
  jobs: Job[];
  docs: ExternalDoc[];
  onFill: (preset: Partial<ExternalDoc>) => void;
  onEdit: (doc: ExternalDoc) => void;
}

export default function WorkedExamples({ accounts, jobs, docs, onFill, onEdit }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worked examples — quote, invoice, receipt</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Three sample clients, each parked at a different money stage, so you can read a complete
          example of every state. Filling an example only adds a record — nothing existing is
          removed. When you are done reviewing, delete the example documents from the Quotes,
          Invoices and Payments tabs.
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {EXAMPLES.map((ex) => {
          const account = accounts.find((a) => a.name === ex.account);
          const job = jobs.find((j) => j.client_name === ex.account);
          const existing = docs.filter(
            (d) => d.doc_type === ex.docType && (account ? d.account_id === account.id : false),
          );
          const filled = existing.length > 0;

          return (
            <Card key={ex.account} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{ex.account}</CardTitle>
                  <Badge variant="outline">{ex.stageLabel}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job ? (
                    <Link to={`/jobs/${job.id}`} className="hover:underline">{job.job_number}</Link>
                  ) : (
                    "No linked work item"
                  )}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                <p className="text-muted-foreground">{ex.story}</p>

                <div className="flex items-center gap-2 text-xs">
                  {filled ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={filled ? "" : "text-muted-foreground"}>
                    {filled
                      ? `${existing.length} ${ex.docType}${existing.length === 1 ? "" : "s"} on record`
                      : `No ${ex.docType} recorded yet`}
                  </span>
                </div>

                <div className="space-y-2">
                  {existing.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.reference}</p>
                        <p className="truncate text-muted-foreground capitalize">
                          {d.status.replace(/_/g, " ")} · {formatDate(d.issued_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="font-medium">{formatMoney(Number(d.amount))}</span>
                        <Button size="icon" variant="ghost" aria-label={`Edit ${d.reference}`} onClick={() => onEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-auto"
                  variant={filled ? "outline" : "default"}
                  onClick={() =>
                    onFill({
                      doc_type: ex.docType,
                      reference: ex.preset.reference,
                      amount: ex.preset.amount,
                      status: ex.preset.status,
                      currency: CURRENCY_CODE,
                      issued_at: new Date().toISOString().slice(0, 10),
                      due_date: ex.preset.dueDays ? addDays(ex.preset.dueDays) : null,
                      client_name: ex.account,
                      account_id: account?.id ?? null,
                      job_id: job?.id ?? null,
                      deal_id: null,
                      is_example: true,
                      notes: `Worked example — ${ex.stageLabel.toLowerCase()} stage reference.`,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Fill example {ex.docType}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
