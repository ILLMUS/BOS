import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

type FieldDef = { key: string; label: string; type: string; required: boolean };
type FormDef = {
  id: string; name: string; description: string | null; fields: FieldDef[];
  success_message: string; org_name: string;
};

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [def, setDef] = useState<FormDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_capture_form", { _slug: slug || "" });
      setDef((data as unknown as FormDef) || null);
      setLoading(false);
    })();
  }, [slug]);

  const submit = async () => {
    if (!def) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("submit_capture_form", {
      _slug: slug || "",
      _payload: values as unknown as never,
    });
    setSending(false);
    if (err) return setError(err.message);
    const res = data as unknown as { message?: string };
    setDone(res?.message || def.success_message);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!def) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md"><CardContent className="p-6 text-center text-sm text-muted-foreground">This form is no longer available.</CardContent></Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{def.org_name}</p>
          <CardTitle className="font-heading text-xl">{def.name}</CardTitle>
          {def.description && <p className="text-sm text-muted-foreground">{def.description}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm">{done}</p>
            </div>
          ) : (
            <>
              {(def.fields || []).map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  ) : (
                    <Input type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                      value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={sending || (def.fields || []).some((f) => f.required && !values[f.key]?.trim())}
                onClick={submit}
              >
                {sending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Send enquiry
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}