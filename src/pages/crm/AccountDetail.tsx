import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import LifecycleBadge from "@/components/crm/LifecycleBadge";
import LifecycleTrail from "@/components/crm/LifecycleTrail";
import StartWorkDialog from "@/components/crm/StartWorkDialog";
import ContactsTab from "@/components/crm/client360/ContactsTab";
import CommercialTab from "@/components/crm/client360/CommercialTab";
import WorkTab from "@/components/crm/client360/WorkTab";
import FinanceTab from "@/components/crm/client360/FinanceTab";
import DocumentsTab from "@/components/crm/client360/DocumentsTab";
import HistoryTab from "@/components/crm/client360/HistoryTab";
import { useClient360 } from "@/hooks/useClient360";
import { LIFECYCLE_LABELS, type Deal, type LifecycleStage } from "@/lib/crm";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CreditCard,
  DollarSign,
  Loader2,
  TrendingUp,
} from "lucide-react";

/* -------------------------------------------------------
   FUTURISTIC GLASS CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        backdrop-blur-md
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

/** Format currency amounts concisely */
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const c360 = useClient360(id);
  const [workDeal, setWorkDeal] = useState<Deal | null>(null);

  const updateStage = async (stage: LifecycleStage) => {
    if (!id) return;
    const { error } = await supabase.from("accounts").update({ lifecycle_stage: stage }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    c360.reload();
  };

  if (c360?.loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const account = c360?.account;
  if (!account || !id) return <p className="p-6 text-slate-400">Account not found.</p>;

  /* -------------------------------------------------------
     DEFENSIVE ANALYTICS COMPUTATION
  ------------------------------------------------------- */
  const invoices = c360?.invoices || [];
  const deals = c360?.deals || [];
  const jobs = c360?.jobs || [];

  const totalLtv = invoices
    .filter((i: any) => i?.status === "paid")
    .reduce((sum: number, i: any) => sum + Number(i?.total_amount || 0), 0);

  const openDeals = deals.filter((d: any) => d?.stage !== "won" && d?.stage !== "lost");
  const openPipelineValue = openDeals.reduce((sum: number, d: any) => sum + Number(d?.amount || 0), 0);

  const activeJobsCount = jobs.filter((j: any) => j?.status === "active").length;

  const outstandingBalance = invoices
    .filter((i: any) => i?.status === "sent" || i?.status === "overdue")
    .reduce((sum: number, i: any) => sum + Number(i?.total_amount || 0), 0);

  return (
    <div className="space-y-6 text-slate-200">
      {/* BACK BUTTON */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/crm/accounts")}
        className="text-slate-400 hover:bg-white/[0.05] hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Accounts
      </Button>

      {/* HEADER & LIFECYCLE TRACKER CARD */}
      <GlassCard className="p-6">
        <div className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{account.name}</h1>
              <p className="mt-1 text-xs text-slate-400">
                {[account.industry, account.location, account.email, account.phone].filter(Boolean).join(" · ") ||
                  "No contact details captured"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LifecycleBadge stage={account.lifecycle_stage} />
            <Select value={account.lifecycle_stage} onValueChange={(v) => updateStage(v as LifecycleStage)}>
              <SelectTrigger className="w-40 border-white/[0.08] bg-[#161c26] text-xs font-semibold text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                {Object.entries(LIFECYCLE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-6">
          <LifecycleTrail stage={account.lifecycle_stage} hasWork={jobs.length > 0} />
        </div>
      </GlassCard>

      {/* ANALYTICS SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* LTV Card */}
        <GlassCard className="p-4 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue (LTV)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatCurrency(totalLtv)}</div>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400/90">
              <TrendingUp className="h-3 w-3" /> Paid Invoices Total
            </p>
          </div>
        </GlassCard>

        {/* Open Pipeline Card */}
        <GlassCard className="p-4 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Pipeline</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatCurrency(openPipelineValue)}</div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Across {openDeals.length} open deals
            </p>
          </div>
        </GlassCard>

        {/* Active Projects Card */}
        <GlassCard className="p-4 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Work</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{activeJobsCount}</div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {jobs.length} Total Projects / Jobs
            </p>
          </div>
        </GlassCard>

        {/* Receivables Card */}
        <GlassCard className="p-4 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-400/20 bg-amber-400/10 text-amber-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatCurrency(outstandingBalance)}</div>
            <p className="mt-1 text-[11px] font-medium text-amber-400/90">
              Pending &amp; Unpaid Invoices
            </p>
          </div>
        </GlassCard>
      </div>

      {/* DETAILED TABS */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start border-b border-white/[0.08] bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="commercial"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Commercial
          </TabsTrigger>
          <TabsTrigger
            value="work"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Work &amp; SOP
          </TabsTrigger>
          <TabsTrigger
            value="finance"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Finance
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-2">
          <ContactsTab accountId={id} contacts={c360?.contacts || []} onChange={c360?.reload} />
          <WorkTab
            jobs={jobs.filter((j: any) => j?.status === "active")}
            stages={c360?.stages || []}
            templates={c360?.templates || []}
            compact
          />
        </TabsContent>

        <TabsContent value="commercial" className="mt-4">
          <CommercialTab
            leads={c360?.leads || []}
            opportunities={c360?.opportunities || []}
            deals={deals}
            onStartWork={setWorkDeal}
          />
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          <WorkTab jobs={jobs} stages={c360?.stages || []} templates={c360?.templates || []} />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceTab
            quotes={c360?.quotes || []}
            invoices={invoices}
            payments={c360?.payments || []}
            variations={c360?.variations || []}
            jobs={jobs}
            expenses={c360?.expenses || []}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab
            drawings={c360?.drawings || []}
            quotes={c360?.quotes || []}
            invoices={invoices}
            payments={c360?.payments || []}
            jobs={jobs}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab audit={c360?.audit || []} jobs={jobs} accountId={id} />
        </TabsContent>
      </Tabs>

      <StartWorkDialog deal={workDeal} onOpenChange={(o) => !o && setWorkDeal(null)} onDone={c360?.reload} />
    </div>
  );
}