import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import type { Contact } from "@/lib/crm";

export default function ContactsTab({ accountId, contacts, onChange }: { accountId: string; contacts: Contact[]; onChange: () => void }) {
  const { orgId, user } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", job_title: "" });

  const add = async () => {
    if (!form.full_name.trim() || !orgId) return;
    const { error } = await supabase.from("contacts").insert({
      org_id: orgId, account_id: accountId, full_name: form.full_name.trim(),
      email: form.email || null, phone: form.phone || null,
      job_title: form.job_title || null, created_by: user?.id ?? null,
    });
    if (error) return toast({ title: "Could not add contact", description: error.message, variant: "destructive" });
    setForm({ full_name: "", email: "", phone: "", job_title: "" });
    onChange();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 font-medium">{c.full_name} {c.is_primary && <Badge variant="outline">Primary</Badge>}</div>
            <p className="text-sm text-muted-foreground">{[c.job_title, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        ))}
        {!contacts.length && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input placeholder="Role" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Button size="sm" onClick={add} disabled={!form.full_name.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add contact
        </Button>
      </CardContent>
    </Card>
  );
}
