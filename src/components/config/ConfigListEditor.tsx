import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfigItem, ConfigSectionDef, slugifyKey } from "@/lib/orgConfig";

interface Props {
  section: ConfigSectionDef;
  items: ConfigItem[];
  readOnly?: boolean;
  onSave: (items: ConfigItem[]) => Promise<void>;
}

/** Generic editor for an ordered list of named configuration items. */
export default function ConfigListEditor({ section, items, readOnly, onSave }: Props) {
  const [draft, setDraft] = useState<ConfigItem[]>(items);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(items);
    setDirty(false);
  }, [items]);

  const locked = (key: string) => (section.lockedKeys || []).includes(key);

  const update = (next: ConfigItem[]) => {
    setDraft(next);
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    let key = slugifyKey(label);
    if (draft.some((d) => d.key === key)) key = `${key}_${draft.length + 1}`;
    update([...draft, { key, label }]);
    setNewLabel("");
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setDirty(false);
      toast.success(`${section.label} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{section.label}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft.length === 0 && <p className="text-sm text-muted-foreground">Nothing configured yet.</p>}

        {draft.map((it, i) => (
          <div key={it.key} className="flex items-center gap-2">
            <Input
              value={it.label}
              disabled={readOnly}
              onChange={(e) =>
                update(draft.map((d, di) => (di === i ? { ...d, label: e.target.value } : d)))
              }
            />
            {locked(it.key) && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Lock className="h-3 w-3" /> core
              </Badge>
            )}
            {!readOnly && (
              <>
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={locked(it.key)}
                  onClick={() => update(draft.filter((_, di) => di !== i))}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}

        {!readOnly && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              placeholder={`Add ${section.label.toLowerCase().replace(/s$/, "")}`}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button variant="outline" onClick={add}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}