import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_DOC_BRANDING, DocumentBranding, loadDocumentBranding, saveDocumentBranding } from "@/lib/documentBranding";

/** Contact block printed on every quote, invoice and receipt PDF. */
export default function DocumentBrandingCard({ readOnly }: { readOnly?: boolean }) {
  const { orgId } = useAuth();
  const [f, setF] = useState<DocumentBranding | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    loadDocumentBranding(orgId).then(setF).catch(() => setF(DEFAULT_DOC_BRANDING));
  }, [orgId]);

  const save = async () => {
    if (!orgId || !f) return;
    setSaving(true);
    try {
      await saveDocumentBranding(orgId, f);
      toast.success("Document details saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!f) {
    return (
      <Card><CardContent className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  const field = (key: keyof DocumentBranding, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`doc-${key}`}>{label}</Label>
      <Input
        id={`doc-${key}`}
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
        <CardTitle className="text-base">Document details</CardTitle>
        <CardDescription>Shown in the "from" block and footer of every quote, invoice and receipt PDF.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", "Phone", "+26876427025")}
          {field("email", "Email", "accounts@yourbusiness.com")}
        </div>
        {field("address", "Address", "Street, town, country")}
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
