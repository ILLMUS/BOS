import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCopy } from "@/contexts/CopyContext";
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
import { Check, Loader2, PackagePlus, Workflow, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
  const { orgId, user, refreshProfile } = useAuth();
  const { reload: reloadCopy } = useCopy();
  const navigate = useNavigate();
  const [pending, setPending] = useState<BusinessTemplate | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const run = async (tpl: BusinessTemplate) => {
    if (!orgId) return;
    setInstalling(tpl.key);
    try {
      const res = await installBusinessTemplate(orgId, user?.id, tpl);
      await refreshProfile();
      await reloadCopy();
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
    <div className="space-y-6 min-w-0">
      <div className="space-y-1 min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <LayoutTemplate className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Business templates</span>
        </h2>
        <p className="break-words text-xs text-slate-400">
          A starting configuration for the whole workspace — roles, departments, services, lifecycle
          wording and ready-made workflows. Everything installs into the same engine you already use
          and stays fully editable.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 min-w-0">
        {BUSINESS_TEMPLATES.map((tpl) => {
          const workflows = workflowsFor(tpl);
          return (
            <div key={tpl.key} className="relative w-full min-w-0 group flex flex-col">
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

              <Card className="relative flex flex-1 flex-col w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
                <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
                  <CardTitle className="text-base font-bold tracking-tight text-white sm:text-lg truncate">
                    {tpl.name}
                  </CardTitle>
                  <CardDescription className="break-words text-xs text-slate-400 mt-1">
                    {tpl.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 p-4 text-xs sm:p-6 sm:text-sm min-w-0">
                  <ul className="space-y-2 text-xs min-w-0">
                    {tpl.highlights.map((h) => (
                      <li key={h} className="flex gap-2 min-w-0">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                        <span className="break-words text-slate-300">{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3 space-y-1 text-xs text-slate-400 min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                      <Workflow className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                      <span>{workflows.length} workflow(s)</span>
                    </p>
                    {workflows.map((w) => (
                      <p key={w.key} className="break-words text-[11px] text-slate-400 pl-5">
                        {w.name} · {w.stages.length} stages
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {tpl.roles.slice(0, 6).map((r) => (
                      <Badge
                        key={r}
                        variant="outline"
                        className="border-white/10 bg-white/5 text-[10px] text-slate-300 shrink-0"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto pt-2 min-w-0">
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        className="w-full h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
                        disabled={!orgId || installing !== null}
                        onClick={() => setPending(tpl)}
                      >
                        {installing === tpl.key ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Install this setup
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-white/10 bg-[#05131a] text-white shadow-2xl backdrop-blur-xl sm:max-w-lg min-w-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-white min-w-0 truncate">
              Install {pending?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="break-words text-xs text-slate-400">
              This adds the roles and workflows, then applies the starter statuses, services and wording
              for this industry. Existing work is untouched, and you can rename, reorder or delete
              anything afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-8 border-white/10 bg-transparent text-xs text-slate-300 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && run(pending)}
              className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400"
            >
              Install
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}