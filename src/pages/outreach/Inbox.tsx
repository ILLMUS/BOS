import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/crm";
import {
  ArrowRight,
  Inbox,
  Loader2,
  Mail,
  Phone,
  UserCheck,
  XCircle,
  Building2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"form_submissions">;

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

export default function OutreachInbox() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [s, f] = await Promise.all([
      supabase.from("form_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("capture_forms").select("id,name"),
    ]);
    setRows(s.data || []);
    setForms(Object.fromEntries((f.data || []).map((x) => [x.id, x.name])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const routeToLead = async (s: Submission) => {
    if (!orgId) return;
    setBusy(s.id);

    const { data: account, error: aErr } = await supabase
      .from("accounts")
      .insert({
        org_id: orgId,
        name: s.company || s.full_name || s.email || "Inbound enquiry",
        email: s.email,
        phone: s.phone,
        notes: s.message,
        source: forms[s.form_id] || "Inbound",
        lifecycle_stage: "lead",
        owner_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (aErr || !account) {
      setBusy(null);
      return toast({ title: "Could not route enquiry", description: aErr?.message, variant: "destructive" });
    }

    let contactId: string | null = null;
    if (s.full_name || s.email) {
      const { data: c } = await supabase
        .from("contacts")
        .insert({
          org_id: orgId,
          account_id: account.id,
          full_name: s.full_name || s.email || "Contact",
          email: s.email,
          phone: s.phone,
          is_primary: true,
        })
        .select("id")
        .single();
      contactId = c?.id ?? null;
    }

    const { data: lead } = await supabase
      .from("leads")
      .insert({
        org_id: orgId,
        account_id: account.id,
        contact_id: contactId,
        title: `${s.company || s.full_name || "Inbound"} - ${forms[s.form_id] || "enquiry"}`,
        description: s.message,
        source: forms[s.form_id] || "Inbound",
        status: "new",
        owner_id: user?.id ?? null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    await supabase
      .from("form_submissions")
      .update({
        status: "routed",
        account_id: account.id,
        contact_id: contactId,
        lead_id: lead?.id ?? null,
      })
      .eq("id", s.id);

    setBusy(null);
    toast({ title: "Routed to the pipeline", description: "Account, contact and lead created." });
    load();
  };

  const dismiss = async (id: string) => {
    await supabase.from("form_submissions").update({ status: "dismissed" }).eq("id", id);
    load();
  };

  const List = ({ items }: { items: Submission[] }) => (
    <div className="space-y-3">
      {!items.length && (
        <GlassCard className="p-8 text-center">
          <p className="text-xs text-slate-400">Nothing here.</p>
        </GlassCard>
      )}
      {items.map((s) => (
        <GlassCard key={s.id} className="p-4 transition-all hover:border-cyan-400/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              {/* HEADER BADGES & TITLE */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {s.full_name || s.company || s.email || "Anonymous"}
                </span>

                <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {forms[s.form_id] || "Form"}
                </span>

                {s.status === "routed" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                    Routed
                  </span>
                )}

                {s.status === "dismissed" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                    <XCircle className="h-3 w-3 text-slate-500" />
                    Dismissed
                  </span>
                )}
              </div>

              {/* COMPANY NAME */}
              {s.company && s.full_name && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  {s.company}
                </p>
              )}

              {/* MESSAGE CONTENT */}
              {s.message && (
                <div className="flex items-start gap-1.5 rounded-xl border border-white/[0.05] bg-[#161c26]/60 p-2.5 text-xs text-slate-300">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <p className="leading-relaxed">{s.message}</p>
                </div>
              )}

              {/* METADATA / CONTACT DETAILS */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                {s.email && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Mail className="h-3 w-3 text-cyan-400" />
                    {s.email}
                  </span>
                )}
                {s.phone && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    {s.phone}
                  </span>
                )}
                <span className="text-slate-500">{formatDateTime(s.created_at)}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex shrink-0 items-center gap-2 self-start">
              {s.status === "new" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => routeToLead(s)}
                    disabled={busy === s.id}
                    className="h-8 rounded-lg bg-cyan-500 px-3 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {busy === s.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Route to lead
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss(s.id)}
                    className="h-8 rounded-lg text-xs font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  >
                    Dismiss
                  </Button>
                </>
              )}
              {s.account_id && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
                >
                  <Link to={`/crm/accounts/${s.account_id}`} className="flex items-center gap-1">
                    Open account <ChevronRight className="h-3.5 w-3.5 text-cyan-400" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex items-center gap-3 border-b border-white/[0.085] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inbound inbox</h1>
          <p className="text-xs text-slate-400">
            Every capture-form submission, and where it landed in the pipeline.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <Tabs defaultValue="new" className="space-y-4">
          <TabsList className="h-10 rounded-xl border border-white/[0.085] bg-[#10151d] p-1 text-slate-400">
            <TabsTrigger
              value="new"
              className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
            >
              New ({rows.filter((r) => r.status === "new").length})
            </TabsTrigger>
            <TabsTrigger
              value="routed"
              className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
            >
              Routed
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
            >
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <List items={rows.filter((r) => r.status === "new")} />
          </TabsContent>
          <TabsContent value="routed">
            <List items={rows.filter((r) => r.status === "routed")} />
          </TabsContent>
          <TabsContent value="all">
            <List items={rows} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}