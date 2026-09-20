import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, Save, Trash2, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { ConfigItem, ConfigSectionDef, slugifyKey } from "@/lib/orgConfig";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="relative w-full min-w-0 group">
      {/* MOVING SHADOW / GLOW EFFECT */}
      <motion.div
        animate={{
          x: [-15, 15, -15],
          y: [-8, 8, -8],
          opacity: [0.25, 0.5, 0.25],
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
              <ListFilter className="h-4 w-4" />
            </motion.div>
            <span className="truncate">{section.label}</span>
          </CardTitle>
          <CardDescription className="break-words text-xs text-slate-400 mt-1">
            {section.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-3">
          {draft.length === 0 && (
            <p className="text-xs text-slate-400 py-2">Nothing configured yet.</p>
          )}

          <div className="space-y-2 min-w-0">
            <AnimatePresence>
              {draft.map((it, i) => (
                <motion.div
                  key={it.key}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-white/[0.06] bg-[#02080b]/60 p-2 min-w-0"
                >
                  <Input
                    value={it.label}
                    disabled={readOnly}
                    onChange={(e) =>
                      update(draft.map((d, di) => (di === i ? { ...d, label: e.target.value } : d)))
                    }
                    className="h-8 border-white/10 bg-[#030d12] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0 flex-1"
                  />

                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    {locked(it.key) && (
                      <Badge variant="outline" className="shrink-0 gap-1 border-teal-500/30 bg-teal-500/10 text-teal-400 text-[10px] h-6 px-2">
                        <Lock className="h-2.5 w-2.5" /> core
                      </Badge>
                    )}

                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="Move up"
                          className="h-7 w-7 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => move(i, 1)}
                          disabled={i === draft.length - 1}
                          aria-label="Move down"
                          className="h-7 w-7 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={locked(it.key)}
                          onClick={() => update(draft.filter((_, di) => di !== i))}
                          aria-label="Remove"
                          className="h-7 w-7 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!readOnly && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 min-w-0">
              <Input
                placeholder={`Add ${section.label.toLowerCase().replace(/s$/, "")}`}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                className="h-8 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0 flex-1"
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
                <Button
                  variant="outline"
                  onClick={add}
                  disabled={!newLabel.trim()}
                  className="h-8 w-full sm:w-auto border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5 text-teal-400" /> Add
                </Button>
              </motion.div>
            </div>
          )}

          {!readOnly && (
            <div className="flex justify-end pt-3 min-w-0">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={save}
                  disabled={!dirty || saving}
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