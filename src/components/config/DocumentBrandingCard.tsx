import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_DOC_BRANDING, DocumentBranding, loadDocumentBranding, saveDocumentBranding } from "@/lib/documentBranding";
import { motion } from "framer-motion";

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
      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
        </CardContent>
      </Card>
    );
  }

  const field = (key: keyof DocumentBranding, label: string, placeholder: string) => (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={`doc-${key}`} className="text-xs font-semibold text-slate-200 block truncate">
        {label}
      </Label>
      <Input
        id={`doc-${key}`}
        value={f[key]}
        placeholder={placeholder}
        disabled={readOnly}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="h-9 border-white/10 bg-[#030d12] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0 disabled:opacity-50"
      />
    </div>
  );

  return (
    <div className="relative w-full min-w-0 group">
      {/* MOVING SHADOW / GLOW EFFECT */}
      <motion.div
        animate={{
          x: [-20, 20, -20],
          y: [-10, 10, -10],
          opacity: [0.35, 0.65, 0.35],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-400/25 blur-xl pointer-events-none"
      />

      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Document details</span>
          </CardTitle>
          <CardDescription className="break-words text-xs text-slate-400 mt-1">
            Shown in the "from" block and footer of every quote, invoice and receipt PDF.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 min-w-0">
            {field("phone", "Phone", "+26876427025")}
            {field("email", "Email", "accounts@yourbusiness.com")}
          </div>
          <div className="min-w-0">
            {field("address", "Address", "Street, town, country")}
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-2 min-w-0">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={save}
                  disabled={saving}
                  className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}