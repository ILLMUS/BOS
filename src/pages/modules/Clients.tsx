import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { formatDate } from "@/lib/crm";
import { OPEN_TICKET_STATUSES, label, priorityVariant } from "@/lib/clientSuccess";
import { Building2, KeyRound, LifeBuoy, Loader2, Star, Wrench } from "lucide-react";

const TOOLS = [
  { to: "/clients/portal", label: "Client portal access", description: "Share, regenerate or revoke job tracking links", icon: KeyRound },
  { to: "/clients/tickets", label: "Support tickets", description: "Issues, warranty calls and requests", icon: LifeBuoy },
  { to: "/clients/feedback", label: "Feedback & reviews", description: "Ratings, complaints and compliments", icon: Star },
  { to: "/clients/reminders", label: "Renewals & maintenance", description: "Recurring service and contract reminders", icon: Wrench },
  { to: "/crm/accounts", label: "Accounts & contacts", description: "Every company in your lifecycle", icon: Building2 },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [t, r, f, a] = await Promise.all([
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("client_reminders").select("*").eq("status", "scheduled").order("due_date").limit(50),
        supabase.from("client_feedback").select("rating"),
        supabase.from("accounts").select("id", { count: "exact", head: true }).eq("lifecycle_stage", "client"),
      ]);
      setTickets(t.data || []);
      setReminders(r.data || []);
      setFeedback(f.data || []);
      setClientCount(a.count || 0);
      setLoading(false);
    })();
  }, []);

  const openTickets = tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
  const overdue = reminders.filter((r) => r.due_date < today());
  const rated = feedback.filter((f) => f.rating);
  const avg = rated.length ? (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="font-heading text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground">Customer success — portal access, support, feedback and recurring care.</p>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active clients", value: clientCount },
            { label: "Open tickets", value: openTickets.length },
            { label: "Overdue reminders", value: overdue.length },
            { label: "Avg satisfaction", value: avg },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Customer success tools</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.to} className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="flex items-start gap-3">
                <t.icon className="mt-1 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline"><Link to={t.to}>Open</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Tickets needing attention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {openTickets.slice(0, 6).map((t) => (
              <Link key={t.id} to="/clients/tickets" className="flex items-center justify-between gap-2 rounded border p-3 text-sm hover:bg-muted">
                <span>#{t.ticket_number} · {t.subject}</span>
                <Badge variant={priorityVariant(t.priority)}>{label(t.priority)}</Badge>
              </Link>
            ))}
            {!loading && openTickets.length === 0 && <p className="text-sm text-muted-foreground">No open tickets.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Upcoming renewals & maintenance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reminders.slice(0, 6).map((r) => (
              <Link key={r.id} to="/clients/reminders" className="flex items-center justify-between gap-2 rounded border p-3 text-sm hover:bg-muted">
                <span>{r.title}</span>
                <Badge variant={r.due_date < today() ? "destructive" : "outline"}>{formatDate(r.due_date)}</Badge>
              </Link>
            ))}
            {!loading && reminders.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
