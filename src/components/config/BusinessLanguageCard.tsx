import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCopy } from "@/contexts/CopyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { COPY_TERMS, copyToItems, type CopyMap } from "@/lib/copyConfig";
import { Loader2, Languages, Save } from "lucide-react";
import { motion } from "framer-motion";

/** Lets an owner rename the core nouns so the app speaks their industry's language. */
export default function BusinessLanguageCard() {
  const { orgId } = useAuth();
  const { copy, reload } = useCopy();
  const [words, setWords] = useState<CopyMap>(copy);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setWords(copy); }, [copy]);

  const saveAll = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from("org_config")
      .upsert(
        { org_id: orgId, key: "copy_terms", value: copyToItems(words) as unknown as never },
        { onConflict: "org_id,key" },
      );
    setSaving(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    await reload();
    toast({ title: "Wording updated", description: "The whole app now uses these words." });
  };

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
              <Languages className="h-4 w-4" />
            </motion.div>
            <span className="truncate">What you call things</span>
          </CardTitle>
          <CardDescription className="break-words text-xs text-slate-400 mt-1">
            Chosen when you set up. Change any word here and it updates across menus, pages and buttons.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 min-w-0">
            {COPY_TERMS.map((term) => (
              <div
                key={term.term}
                className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
              >
                <Label htmlFor={`term-${term.term}`} className="text-xs font-semibold text-slate-200 block truncate">
                  {term.label}
                </Label>
                <Input
                  id={`term-${term.term}`}
                  value={words[term.term] ?? ""}
                  onChange={(e) => setWords({ ...words, [term.term]: e.target.value })}
                  className="h-9 border-white/10 bg-[#030d12] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0"
                />
                <p className="break-words text-[11px] text-slate-400">{term.description}</p>
              </div>
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={saveAll}
              disabled={saving}
              className="w-full sm:w-auto h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save wording
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}