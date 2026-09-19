import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney } from "@/lib/crm";
import { useFinance } from "@/hooks/useFinance";
import { buildPostings, missingCodes, type PostingDraft } from "@/lib/autoPost";
import type { JournalEntry, LedgerAccount } from "@/lib/ledger";

interface Props {
  orgId: string | null;
  accounts: LedgerAccount[];
  entries: JournalEntry[];
  onPosted: () => void;
}

export default function AutoPostPanel({ orgId, accounts, entries, onPosted }: Props) {
  const fin = useFinance();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [posting, setPosting] = useState(false);

  const drafts = useMemo(() => {
    const jobNumber = (id: string | null) => fin.jobs.find((j) => j.id === id)?.job_number || "—";
    return buildPostings({ invoices: fin.invoices, payments: fin.payments, expenses: fin.expenses, entries, jobNumber });
  }, [fin.invoices, fin.payments, fin.expenses, fin.jobs, entries]);

  const missing = useMemo(() => missingCodes(drafts, accounts), [drafts, accounts]);
  const chosen = drafts.filter((d) => selected[d.sourceRef]);

  const post = async () => {
    if (!orgId || !chosen.length) return;
    setPosting(true);
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));
    const { data: auth } = await supabase.auth.getUser();
    let done = 0;

    for (const d of chosen) {
      if (d.lines.some((l) => !byCode.has(l.code))) continue;
      const { data: entry, error } = await supabase
        .from("journal_entries")
        .insert({
          org_id: orgId, entry_date: d.date, memo: d.memo, reference: d.reference,
          source: "auto", source_ref: d.sourceRef, job_id: d.jobId, account_id: d.accountId,
          created_by: auth.user?.id ?? null,
        })
        .select("id").single();
      if (error || !entry) { toast.error(error?.message || "Could not post an entry"); continue; }

      const { error: lineError } = await supabase.from("journal_lines").insert(
        d.lines.map((l, i) => ({
          org_id: orgId, entry_id: entry.id, ledger_account_id: byCode.get(l.code)!,
          description: l.description, debit: l.debit, credit: l.credit, position: i,
        })),
      );
      if (lineError) { toast.error(lineError.message); continue; }
      done += 1;
    }

    setPosting(false);
    setSelected({});
    toast.success(`${done} ${done === 1 ? "entry" : "entries"} posted to the ledger`);
    onPosted();
  };

  if (fin.loading) {
    return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking records…</div>;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">Post from day-to-day records</p>
            <p className="text-sm text-muted-foreground">
              Invoices, payments and costs that are not in the ledger yet. Each item is posted once.
            </p>
          </div>
          <Button onClick={post} disabled={!chosen.length || posting}>
            <Wand2 className="mr-2 h-4 w-4" />{posting ? "Posting…" : `Post ${chosen.length || ""}`.trim()}
          </Button>
        </CardContent>
      </Card>

      {!!missing.length && (
        <p className="text-sm text-destructive">
          Missing accounts {missing.join(", ")} — install the standard accounts first.
        </p>
      )}

      {!drafts.length && <p className="text-sm text-muted-foreground">Everything is already posted to the ledger.</p>}

      {!!drafts.length && (
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            id="ap-all"
            checked={chosen.length === drafts.length && drafts.length > 0}
            onCheckedChange={(v) =>
              setSelected(v ? Object.fromEntries(drafts.map((d) => [d.sourceRef, true])) : {})
            }
          />
          <label htmlFor="ap-all" className="text-muted-foreground">Select all {drafts.length}</label>
        </div>
      )}

      {drafts.map((d: PostingDraft) => (
        <Card key={d.sourceRef}>
          <CardContent className="flex items-start gap-3 p-4">
            <Checkbox
              className="mt-1"
              aria-label={`Select ${d.memo}`}
              checked={!!selected[d.sourceRef]}
              onCheckedChange={(v) => setSelected((s) => ({ ...s, [d.sourceRef]: !!v }))}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{d.label}</Badge>
                <span className="font-medium">{d.memo}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(d.date)}{d.reference ? ` · ${d.reference}` : ""}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {d.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span>{l.code} · {l.description}</span>
                    <span>{l.debit ? `Dr ${formatMoney(l.debit)}` : `Cr ${formatMoney(l.credit)}`}</span>
                  </div>
                ))}
              </div>
            </div>
            <span className="font-medium">{formatMoney(d.amount)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
