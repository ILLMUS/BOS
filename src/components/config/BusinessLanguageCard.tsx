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
import { Loader2 } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What you call things</CardTitle>
        <CardDescription>
          Chosen when you set up. Change any word here and it updates across menus, pages and buttons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {COPY_TERMS.map((term) => (
            <div key={term.term} className="space-y-1">
              <Label htmlFor={`term-${term.term}`} className="text-xs">{term.label}</Label>
              <Input
                id={`term-${term.term}`}
                value={words[term.term]}
                onChange={(e) => setWords({ ...words, [term.term]: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">{term.description}</p>
            </div>
          ))}
        </div>
        <Button onClick={saveAll} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save wording
        </Button>
      </CardContent>
    </Card>
  );
}
