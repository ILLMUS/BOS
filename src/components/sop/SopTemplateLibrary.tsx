import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SOP_LIBRARY, type LibraryTemplate } from "@/lib/sopLibrary";
import { installLibraryTemplate } from "@/lib/sopInstall";

interface Props {
  orgId: string | null;
  userId?: string | null;
  onInstalled: (templateId: string) => void;
}

export default function SopTemplateLibrary({ orgId, userId, onInstalled }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryTemplate>(SOP_LIBRARY[0]);
  const [installing, setInstalling] = useState<string | null>(null);

  const install = async (tpl: LibraryTemplate) => {
    if (!orgId) return;
    setInstalling(tpl.key);
    try {
      const templateId = await installLibraryTemplate(orgId, userId, tpl);
      toast.success(`"${tpl.name}" added — edit anything you like`);
      setOpen(false);
      onInstalled(templateId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add that template");
    } finally {
      setInstalling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" /> Start from a template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> SOP template library
          </DialogTitle>
          <DialogDescription>
            Pick a best-practice workflow for your niche. It is copied into your workspace — steps,
            owners, deadlines and questions are all editable afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-1">
              {SOP_LIBRARY.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelected(t)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition-colors ${
                    selected.key === t.key
                      ? "border-accent bg-accent/5 font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span>
                    {t.niche}
                    <span className="block text-xs text-muted-foreground">{t.stages.length} steps</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3">
            <div>
              <h3 className="font-heading text-lg font-bold">{selected.name}</h3>
              <p className="text-sm text-muted-foreground">{selected.summary}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selected.roles.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </div>
            <ScrollArea className="h-[280px] rounded border border-border p-3">
              <ol className="space-y-3">
                {selected.stages.map((s, i) => (
                  <li key={s.name} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{i + 1}</Badge>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.role} · {s.slaHours}h
                        {s.requiresApproval ? " · approval" : ""}
                      </span>
                    </div>
                    <p className="mt-1 pl-8 text-xs text-muted-foreground">{s.description}</p>
                    <p className="pl-8 text-xs text-muted-foreground">
                      {s.fields.length} question(s): {s.fields.map((f) => f.label).join(", ")}
                    </p>
                  </li>
                ))}
              </ol>
            </ScrollArea>
            <Button
              className="w-full"
              onClick={() => install(selected)}
              disabled={!orgId || installing !== null}
            >
              {installing === selected.key ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="mr-2 h-4 w-4" />
              )}
              Add "{selected.name}" to my workspace
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
