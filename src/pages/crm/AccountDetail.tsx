import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import LifecycleBadge from "@/components/crm/LifecycleBadge";
import LifecycleTrail from "@/components/crm/LifecycleTrail";
import StartWorkDialog from "@/components/crm/StartWorkDialog";
import SummaryCards from "@/components/crm/client360/SummaryCards";
import ContactsTab from "@/components/crm/client360/ContactsTab";
import CommercialTab from "@/components/crm/client360/CommercialTab";
import WorkTab from "@/components/crm/client360/WorkTab";
import FinanceTab from "@/components/crm/client360/FinanceTab";
import DocumentsTab from "@/components/crm/client360/DocumentsTab";
import HistoryTab from "@/components/crm/client360/HistoryTab";
import { useClient360 } from "@/hooks/useClient360";
import { LIFECYCLE_LABELS, type Deal, type LifecycleStage } from "@/lib/crm";
import { ArrowLeft, Loader2 } from "lucide-react";

/** Client 360 — the central relationship record across commercial, operational and financial history. */
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

  if (c360.loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  const account = c360.account;
  if (!account || !id) return <p className="text-muted-foreground">Account not found.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/crm/accounts")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Accounts
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{account.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {[account.industry, account.location, account.email, account.phone].filter(Boolean).join(" · ") || "No details captured"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LifecycleBadge stage={account.lifecycle_stage} />
            <Select value={account.lifecycle_stage} onValueChange={(v) => updateStage(v as LifecycleStage)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LIFECYCLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent><LifecycleTrail stage={account.lifecycle_stage} hasWork={c360.jobs.length > 0} /></CardContent>
      </Card>

      <SummaryCards data={c360} />

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="work">Work &amp; SOP</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-2">
          <ContactsTab accountId={id} contacts={c360.contacts} onChange={c360.reload} />
          <WorkTab jobs={c360.jobs.filter((j) => j.status === "active")} stages={c360.stages} templates={c360.templates} compact />
        </TabsContent>

        <TabsContent value="commercial" className="mt-4">
          <CommercialTab leads={c360.leads} opportunities={c360.opportunities} deals={c360.deals} onStartWork={setWorkDeal} />
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          <WorkTab jobs={c360.jobs} stages={c360.stages} templates={c360.templates} />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceTab quotes={c360.quotes} invoices={c360.invoices} payments={c360.payments} variations={c360.variations} jobs={c360.jobs} expenses={c360.expenses} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab drawings={c360.drawings} quotes={c360.quotes} invoices={c360.invoices} payments={c360.payments} jobs={c360.jobs} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab audit={c360.audit} jobs={c360.jobs} accountId={id} />
        </TabsContent>
      </Tabs>

      <StartWorkDialog deal={workDeal} onOpenChange={(o) => !o && setWorkDeal(null)} onDone={c360.reload} />
    </div>
  );
}
