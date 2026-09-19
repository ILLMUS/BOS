import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCopy } from "@/contexts/CopyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Briefcase, Sparkles, User, MapPin, Phone, Mail, Wrench } from "lucide-react";
import { toast } from "sonner";
import { friendlyJobCreateError, logJobCreateFailure } from "@/lib/jobErrors";
import { clearDraft, readDraft, useDraft } from "@/hooks/useAutosave";

const JOB_DRAFT_KEY = "draft:new-job";

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
        relative overflow-hidden rounded-[16px]
        border border-white/[0.085]
        bg-[#10151d]/95
        p-6 sm:p-7
        shadow-[0_18px_60px_rgba(0,0,0,0.35)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function NewJob() {
  const navigate = useNavigate();
  const { user, hasRole, orgId } = useAuth();
  const { t, phrase } = useCopy();
  const isSuperAdmin = hasRole("super_admin");
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; is_active: boolean; version: number; is_locked: boolean }[]
  >([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [form, setForm] = useState(() =>
    readDraft(JOB_DRAFT_KEY, {
      client_name: "",
      client_phone: "",
      client_email: "",
      client_location: "",
      service_type: "",
    })
  );
  useDraft(JOB_DRAFT_KEY, form);

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

      clearDraft(JOB_DRAFT_KEY);
      toast.success("Job created successfully");
      navigate(`/jobs/${jobId}`);
    } catch (err: any) {
      toast.error(friendlyJobCreateError(err));
      logJobCreateFailure(err, {
        userId: user.id,
        orgId,
        clientName: form.client_name,
        templateId,
        source: "new_job_page",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 text-slate-200">
      {/* HEADER STRIP */}
      <div className="flex items-center gap-3 border-b border-white/[0.065] pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            New {t("work_item")}
          </h1>
          <p className="text-[11px] text-slate-400">
            Initialize a new client job execution pipeline
          </p>
        </div>
      </div>

      {/* FORM CARD */}
      <GlassCard>
        <div className="mb-5 border-b border-white/[0.065] pb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            {t("client")} & Workflow Configuration
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Assign standard operating procedures and target client profile details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4.5">
          {/* WORKFLOW SELECTION */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              {t("workflow")} <span className="text-cyan-400">*</span>
            </Label>
            {templates.length === 0 ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                No workflows available — please construct one in the SOP Builder first.
              </div>
            ) : (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 text-[11px] text-slate-200 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30">
                  <SelectValue placeholder="Choose a workflow" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#121822] text-slate-200">
                  {templates.map((tmpl) => (
                    <SelectItem
                      key={tmpl.id}
                      value={tmpl.id}
                      className="text-[11px] focus:bg-cyan-500/10 focus:text-cyan-300"
                    >
                      {tmpl.name} · v{tmpl.version}
                      {tmpl.is_active ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* CLIENT NAME */}
          <div className="space-y-1.5">
            <Label
              htmlFor="client_name"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              Client Name <span className="text-cyan-400">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                id="client_name"
                value={form.client_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_name: e.target.value }))
                }
                placeholder="Acme Corp / John Doe"
                required
                className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 pl-9 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
          </div>

          {/* CONTACT DETAILS GRID */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="client_phone"
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
              >
                Phone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="client_phone"
                  placeholder="+268 ..."
                  value={form.client_phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_phone: e.target.value }))
                  }
                  className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 pl-9 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="client_email"
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="client_email"
                  type="email"
                  placeholder="client@example.com"
                  value={form.client_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_email: e.target.value }))
                  }
                  className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 pl-9 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="space-y-1.5">
            <Label
              htmlFor="client_location"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              Location
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                id="client_location"
                placeholder="Site address or location"
                value={form.client_location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_location: e.target.value }))
                }
                className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 pl-9 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
          </div>

          {/* SERVICE TYPE */}
          <div className="space-y-1.5">
            <Label
              htmlFor="service_type"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              Type of Service
            </Label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                id="service_type"
                value={form.service_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, service_type: e.target.value }))
                }
                placeholder="e.g., Steel Gates, Balustrades, Carports..."
                className="h-9.5 rounded-xl border-white/[0.08] bg-black/40 pl-9 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.065]">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-9 rounded-lg border-white/[0.08] bg-white/[0.02] px-4 text-[11px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting || !form.client_name || !templateId}
              className="h-9 rounded-lg bg-cyan-500 px-4 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 disabled:opacity-50"
            >
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create Job
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}