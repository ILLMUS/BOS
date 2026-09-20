import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Fields {
  name: string;
  industry: string;
  location: string;
  employee_count: string;
  main_services: string;
  description: string;
  job_prefix: string;
}

/** Edits the organization record itself — the "business" half of configuration. */
export default function BusinessProfileCard({ readOnly }: { readOnly?: boolean }) {
  const { orgId, refreshProfile } = useAuth();
  const [f, setF] = useState<Fields | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name, industry, location, employee_count, main_services, description, job_prefix")
        .eq("id", orgId)
        .maybeSingle();
      setF({
        name: data?.name || "",
        industry: data?.industry || "",
        location: data?.location || "",
        employee_count: data?.employee_count || "",
        main_services: data?.main_services || "",
        description: data?.description || "",
        job_prefix: data?.job_prefix || "",
      });
    })();
  }, [orgId]);

  const save = async () => {
    if (!orgId || !f) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update(f).eq("id", orgId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Business profile saved");
      refreshProfile();
    }
  };

  if (!f) {
    return (
      <Card className="w-full border-white/[0.08] bg-[#05131a]/60 backdrop-blur-md">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
        </CardContent>
      </Card>
    );
  }

  const field = (key: keyof Fields, label: string, placeholder?: string) => (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={key} className="text-xs font-semibold text-slate-300">
        {label}
      </Label>
      <Input
        id={key}
        value={f[key]}
        placeholder={placeholder}
        disabled={readOnly}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="w-full border-white/[0.1] bg-[#02080b]/80 text-xs text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:ring-teal-400/20 disabled:opacity-60"
      />
    </div>
  );

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="break-words text-base font-bold tracking-tight text-white sm:text-lg">
              Business profile
            </CardTitle>
            <CardDescription className="break-words text-xs text-slate-400">
              Who you are and what you do. Drives suggestions across the workspace.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
          {field("name", "Business name")}
          {field("industry", "Industry / niche", "e.g. your industry")}
          {field("location", "Location")}
          {field("employee_count", "Team size", "e.g. 5-20")}
          {field("main_services", "Main services", "Comma separated")}
          {field("job_prefix", "Work reference prefix", "e.g. JOB")}
        </div>

        <div className="space-y-1.5 min-w-0 w-full">
          <Label htmlFor="description" className="text-xs font-semibold text-slate-300">
            Description
          </Label>
          <Textarea
            id="description"
            rows={3}
            value={f.description}
            disabled={readOnly}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="w-full resize-none border-white/[0.1] bg-[#02080b]/80 text-xs text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:ring-teal-400/20 disabled:opacity-60"
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={save}
              disabled={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-xs font-semibold text-white shadow-lg shadow-teal-950/40 hover:from-teal-600 hover:to-emerald-700"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save Business Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}