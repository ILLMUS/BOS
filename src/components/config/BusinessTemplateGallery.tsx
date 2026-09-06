import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Loader2, PackagePlus, Workflow } from "lucide-react";
import { toast } from "sonner";
import {
  BUSINESS_TEMPLATES,
  installBusinessTemplate,
  workflowsFor,
  type BusinessTemplate,
} from "@/lib/businessTemplates";

interface Props {
  onInstalled?: () => void;
}

/** Phase 9 — start a workspace from a predefined business configuration. */
export default function BusinessTemplateGallery({ onInstalled }: Props) {
  const { orgId, user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<BusinessTemplate | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const run = async (tpl: BusinessTemplate) => {
    if (!orgId) return;
    setInstalling(tpl.key);
    try {
      const res = await installBusinessTemplate(orgId, user?.id, tpl);
      toast.success(`${tpl.name} installed — customise anything from here`);
      onInstalled?.();
      if (res.primaryTemplateId) navigate("/admin/sop");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not install that template");
    } finally {
      setInstalling(null);
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold">Business templates</h2>
        <p className="text-sm text-muted-foreground">
          A starting configuration for the whole workspace — roles, departments, services, lifecycle
          wording and ready-made workflows. Everything installs into the same engine you already use
          and stays fully editable.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {BUSINESS_TEMPLATES.map((tpl) => {
          const workflows = workflowsFor(tpl);
          return (
            <Card key={tpl.key} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <CardDescription>{tpl.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <ul className="space-y-1 text-sm">
                  {tpl.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-muted-foreground">{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Workflow className="h-3.5 w-3.5" /> {workflows.length} workflow(s)
                  </p>
                  {workflows.map((w) => (
                    <p key={w.key}>
                      {w.name} · {w.stages.length} stages
                    </p>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tpl.roles.slice(0, 6).map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="mt-auto w-full"
                  disabled={!orgId || installing !== null}
                  onClick={() => setPending(tpl)}
                >
                  {installing === tpl.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PackagePlus className="mr-2 h-4 w-4" />
                  )}
                  Install this setup
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Install {pending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This adds the roles, departments, services and workflows to your workspace and updates
              the matching configuration lists. Existing work is untouched, and you can rename,
              reorder or delete anything afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && run(pending)}>Install</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
