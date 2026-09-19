import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface Props {
  jobId: string;
}

interface Trail {
  accountId: string | null;
  accountName: string | null;
  dealId: string | null;
  dealName: string | null;
  opportunityName: string | null;
  leadTitle: string | null;
}

/**
 * Phase 10 — read-only backlink from work to the commercial record it came from,
 * so the lifecycle stays visibly connected: lead → opportunity → deal → client → work.
 */
export default function JobLifecycleTrail({ jobId }: Props) {
  const [trail, setTrail] = useState<Trail | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("account_id, deal_id")
        .eq("id", jobId)
        .maybeSingle();
      if (!job || (!job.account_id && !job.deal_id)) return;

      const [{ data: account }, { data: deal }] = await Promise.all([
        job.account_id
          ? supabase.from("accounts").select("id, name").eq("id", job.account_id).maybeSingle()
          : Promise.resolve({ data: null }),
        job.deal_id
          ? supabase.from("deals").select("id, name, opportunity_id").eq("id", job.deal_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      let opportunityName: string | null = null;
      let leadTitle: string | null = null;
      if (deal?.opportunity_id) {
        const { data: opp } = await supabase
          .from("opportunities")
          .select("name, lead_id")
          .eq("id", deal.opportunity_id)
          .maybeSingle();
        opportunityName = opp?.name ?? null;
        if (opp?.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("title")
            .eq("id", opp.lead_id)
            .maybeSingle();
          leadTitle = lead?.title ?? null;
        }
      }

      if (!cancelled) {
        setTrail({
          accountId: account?.id ?? null,
          accountName: account?.name ?? null,
          dealId: deal?.id ?? null,
          dealName: deal?.name ?? null,
          opportunityName,
          leadTitle,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!trail) return null;

  const steps = [
    trail.leadTitle ? { label: "Lead", value: trail.leadTitle, to: "/crm/leads" } : null,
    trail.opportunityName
      ? { label: "Opportunity", value: trail.opportunityName, to: "/crm/opportunities" }
      : null,
    trail.dealName ? { label: "Deal", value: trail.dealName, to: "/crm/deals" } : null,
    trail.accountName
      ? { label: "Client", value: trail.accountName, to: `/crm/accounts/${trail.accountId}` }
      : null,
  ].filter(Boolean) as { label: string; value: string; to: string }[];

  if (!steps.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Lifecycle
      </span>
      {steps.map((s, i) => (
        <span key={s.label} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <Link to={s.to} className="flex items-center gap-1.5 hover:underline">
            <Badge variant="outline" className="text-[10px] uppercase">
              {s.label}
            </Badge>
            <span className="max-w-[180px] truncate">{s.value}</span>
          </Link>
        </span>
      ))}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <Badge variant="secondary">Work</Badge>
    </div>
  );
}
