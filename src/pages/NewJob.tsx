import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewJob() {
  const navigate = useNavigate();
  const { user, hasRole, orgId } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; is_active: boolean; version: number; is_locked: boolean }[]
  >([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    client_location: "",
    service_type: "",
  });

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("sop_templates")
      .select("id, name, is_active, version, is_locked")
      .eq("org_id", orgId)
      .eq("is_locked", false)
      .order("created_at")
      .then(({ data }) => {
        const list = data || [];
        setTemplates(list);
        setTemplateId((cur) => cur || list.find((t) => t.is_active)?.id || list[0]?.id || "");
      });
  }, [orgId]);

  // Only super_admin can create jobs
  if (!isSuperAdmin) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      if (!orgId) throw new Error("No organization selected");
      if (!templateId) throw new Error("Create a workflow in the SOP Builder first");

      const { data: jobId, error } = await supabase.rpc("create_job_from_template", {
        _template_id: templateId,
        _client_name: form.client_name,
        _client_phone: form.client_phone || null,
        _client_email: form.client_email || null,
        _client_location: form.client_location || null,
        _service_type: form.service_type || null,
      });
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        job_id: jobId as string,
        org_id: orgId,
        action: "job_created",
        details: { client_name: form.client_name, template_id: templateId },
      });

      toast.success("Job created successfully");
      navigate(`/jobs/${jobId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">New Job</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow *</Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No workflows yet — build one in the SOP Builder first.
                </p>
              ) : (
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Choose a workflow" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · v{t.version}{t.is_active ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                value={form.client_name}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_phone">Phone</Label>
                <Input
                  id="client_phone"
                  placeholder="+268 ..."
                  value={form.client_phone}
                  onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_location">Location</Label>
              <Input
                id="client_location"
                value={form.client_location}
                onChange={(e) => setForm((f) => ({ ...f, client_location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">Type of Service</Label>
              <Input
                id="service_type"
                value={form.service_type}
                onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                placeholder="e.g., Steel Gates, Balustrades, Carports..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={submitting || !form.client_name || !templateId}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Job
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
