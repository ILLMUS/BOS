import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/crm";
import type { Client360Data } from "@/hooks/useClient360";

interface Props { data: Pick<Client360Data, "deals" | "jobs" | "payments" | "invoices" | "activities"> }

/** Roll-up of commercial, operational and financial value for the client. */
export default function SummaryCards({ data }: Props) {
  const won = data.deals.filter((d) => d.status === "won");
  const wonValue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const paid = data.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const invoiced = data.invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const activeJobs = data.jobs.filter((j) => j.status === "active").length;
  const openTasks = data.activities.filter((a) => !a.completed_at && a.due_at).length;

  const items = [
    { label: "Won deals", value: `${won.length}`, sub: formatMoney(wonValue) },
    { label: "Active work", value: `${activeJobs}`, sub: `${data.jobs.length} total jobs` },
    { label: "Invoiced", value: formatMoney(invoiced), sub: `${data.invoices.length} invoices` },
    { label: "Received", value: formatMoney(paid), sub: `${data.payments.length} payments` },
    { label: "Open follow-ups", value: `${openTasks}`, sub: "scheduled" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((i) => (
        <Card key={i.label}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.label}</p>
            <p className="mt-1 text-xl font-semibold">{i.value}</p>
            <p className="text-xs text-muted-foreground">{i.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
