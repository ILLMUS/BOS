import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
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
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const field = (key: keyof Fields, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={f[key]}
        placeholder={placeholder}
        disabled={readOnly}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business profile</CardTitle>
        <CardDescription>Who you are and what you do. Drives suggestions across the workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Business name")}
          {field("industry", "Industry / niche", "e.g. your industry")}
          {field("location", "Location")}
          {field("employee_count", "Team size", "e.g. 5-20")}
          {field("main_services", "Main services", "Comma separated")}
          {field("job_prefix", "Work reference prefix", "e.g. JOB")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={f.description}
            disabled={readOnly}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </div>
        {!readOnly && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}