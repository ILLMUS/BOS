import { useState, useEffect } from "react";
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
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
  Activity,
  Flame,
  CheckCircle2,
} from "lucide-react";
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [templates, setTemplates] = useState<LibraryTemplate[]>([]);
  const [selected, setSelected] = useState<LibraryTemplate | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Trigger rich loading state every time dialog opens
  useEffect(() => {
    if (open) {
      setIsInitializing(true);
      const timer = setTimeout(() => {
        const loaded = SOP_LIBRARY || [];
        setTemplates(loaded);
        setSelected(loaded.length > 0 ? loaded[0] : null);
        setIsInitializing(false);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle template removal with smoke explosion feedback
  const handleDeleteTemplate = (e: React.MouseEvent, key: string, name: string) => {
    e.stopPropagation();
    setDeletingKey(key);

    setTimeout(() => {
      const updated = templates.filter((t) => t.key !== key);
      setTemplates(updated);
      if (selected?.key === key) {
        setSelected(updated.length > 0 ? updated[0] : null);
      }
      setDeletingKey(null);
      toast.success(`Removed "${name}" from view`);
    }, 450);
  };

  const install = async (tpl: LibraryTemplate) => {
    if (!orgId || !tpl) return;
    setInstalling(tpl.key);
    try {
      const templateId = await installLibraryTemplate(orgId, userId, tpl);
      toast.success(`"${tpl.name}" installed — ready to run`);
      setOpen(false);
      onInstalled(templateId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add template");
    } finally {
      setInstalling(null);
    }
  };

  return (
    <>
      {/* Dynamic Keyframe Animations & Smoke Wave CSS */}
      <style>{`
        @keyframes vaporWave {
          0% { transform: translateY(0) scaleX(1) scaleY(1); opacity: 0.15; }
          50% { transform: translateY(-12px) scaleX(1.15) scaleY(1.1); opacity: 0.45; }
          100% { transform: translateY(-24px) scaleX(1.3) scaleY(1.25); opacity: 0; }
        }
        @keyframes smokeExplosion {
          0% { transform: scale(1); opacity: 1; filter: blur(0px); }
          50% { transform: scale(1.08) translateY(-8px); opacity: 0.5; filter: blur(6px); }
          100% { transform: scale(0.8) translateY(-20px); opacity: 0; filter: blur(12px); }
        }
        @keyframes neonPulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px rgba(34, 211, 238, 0.4); }
          50% { opacity: 0.4; transform: scale(0.92); box-shadow: 0 0 20px rgba(34, 211, 238, 0.8); }
        }
        .animate-vapor {
          animation: vaporWave 3.5s infinite linear;
        }
        .animate-smoke-out {
          animation: smokeExplosion 0.45s ease-out forwards;
        }
        .animate-live-pulse {
          animation: neonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="relative overflow-hidden border-cyan-500/30 bg-[#10151d] text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] hover:text-white"
          >
            {/* Ambient Background Glow Accent */}
            <span className="pointer-events-none absolute -left-4 -top-4 h-12 w-12 rounded-full bg-cyan-400/20 blur-xl" />
            <Sparkles className="mr-2 h-4 w-4 animate-spin text-cyan-400 [animation-duration:6s]" />
            <span>Start from a template</span>
            <span className="ml-2 flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl border-white/[0.1] bg-[#0c1017]/95 p-6 text-slate-200 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* BACKGROUND AMBIENT GLOWS */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

          {/* HEADER SECTION */}
          <DialogHeader className="relative border-b border-white/[0.08] pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-black text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                  <Zap className="h-4 w-4 animate-pulse text-cyan-400" />
                </div>
                <span>SOP Template Engine</span>
              </DialogTitle>

              {/* LIVE BLINKING SYSTEM STATUS */}
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-live-pulse" />
                LIVE WORKFLOW HUB
              </div>
            </div>
            <DialogDescription className="mt-1 text-xs text-slate-400">
              Pick a dynamic blueprint to sync directly into your environment. All stages and rules remain fully editable.
            </DialogDescription>
          </DialogHeader>

          {/* INITIALIZATION LOADING ANIMATION */}
          {isInitializing ? (
            <div className="flex h-[420px] flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <Activity className="absolute h-6 w-6 animate-pulse text-cyan-400" />
              </div>
              <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase animate-pulse">
                Synchronizing Library Protocols...
              </p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex h-[420px] flex-col items-center justify-center space-y-3 text-center">
              <Flame className="h-10 w-10 text-slate-600 animate-bounce" />
              <p className="text-sm font-semibold text-slate-400">
                All templates cleared from active workspace context.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTemplates(SOP_LIBRARY || []);
                  setSelected(SOP_LIBRARY?.[0] || null);
                }}
                className="border-white/10 bg-white/5 text-xs text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
              >
                Reload Default Templates
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-[260px_1fr] pt-2">
              {/* SIDEBAR NAVIGATION */}
              <ScrollArea className="h-[430px] pr-2">
                <div className="space-y-2">
                  {templates.map((t) => {
                    const isSelected = selected?.key === t.key;
                    const isDeleting = deletingKey === t.key;

                    return (
                      <div
                        key={t.key}
                        onClick={() => setSelected(t)}
                        className={`
                          group relative flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all duration-300
                          ${
                            isDeleting
                              ? "animate-smoke-out border-red-500/50 bg-red-500/10 pointer-events-none"
                              : isSelected
                              ? "border-cyan-400/50 bg-cyan-500/[0.08] shadow-[0_0_20px_rgba(34,211,238,0.12)] text-white"
                              : "border-white/[0.06] bg-[#121822]/60 hover:border-white/20 hover:bg-white/[0.04] text-slate-300"
                          }
                        `}
                      >
                        {/* ACTIVE TAB INDICATION GLOW BAR */}
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        )}

                        <div className="pl-1.5">
                          <span className="block text-sm font-bold tracking-tight">{t.niche}</span>
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                            {t.stages?.length || 0} stages
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* DELETE ACTION WITH SMOKE TRIGGER */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTemplate(e, t.key, t.name)}
                            title="Remove template"
                            className="rounded-lg p-1.5 text-slate-500 opacity-0 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                              isSelected ? "translate-x-0.5 text-cyan-400" : "text-slate-500"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* MAIN PREVIEW PANEL */}
              {selected ? (
                <div className="flex flex-col justify-between space-y-4 rounded-xl border border-white/[0.08] bg-[#121822]/80 p-5 backdrop-blur-md">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white">{selected.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{selected.summary}</p>
                      </div>
                      <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px]">
                        Active Blueprint
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(selected.roles || []).map((r) => (
                        <Badge
                          key={r}
                          className="border border-white/10 bg-white/[0.05] text-[10px] font-medium text-slate-300"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>

                    {/* STAGES SCROLL AREA WITH VAPOR WAVES & ACCENTS */}
                    <ScrollArea className="relative h-[230px] rounded-lg border border-white/[0.06] bg-[#0a0e14]/80 p-3.5">
                      <ol className="space-y-3">
                        {(selected.stages || []).map((s, i) => {
                          const fields = s?.fields || [];
                          return (
                            <li
                              key={s?.name || i}
                              className="relative overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 transition-colors duration-200 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03]"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="border-cyan-400/30 bg-cyan-400/10 font-mono text-[10px] text-cyan-300"
                                  >
                                    0{i + 1}
                                  </Badge>
                                  <span className="text-xs font-bold text-white">{s?.name}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {s?.role} · {s?.slaHours ?? 0}h SLA
                                </span>
                              </div>

                              {s?.description && (
                                <p className="mt-1.5 text-[11px] leading-normal text-slate-400 pl-7">
                                  {s.description}
                                </p>
                              )}

                              {fields.length > 0 && (
                                <p className="mt-1 text-[10px] text-slate-500 pl-7 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-cyan-400/80" />
                                  <span>
                                    {fields.length} requirement(s): {fields.map((f) => f?.label).filter(Boolean).join(", ")}
                                  </span>
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ol>

                      {/* CONTINUOUS SMOKE/VAPOR WAVE ANIMATION ON CRITICAL SECTION */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-t from-cyan-500/20 to-transparent animate-vapor" />
                      </div>
                    </ScrollArea>
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="relative pt-2">
                    {/* Glowing smoke overlay under button */}
                    <div className="pointer-events-none absolute -top-4 left-1/2 h-8 w-3/4 -translate-x-1/2 bg-cyan-400/15 blur-lg" />

                    <Button
                      className="relative w-full overflow-hidden border border-cyan-400/40 bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300"
                      onClick={() => install(selected)}
                      disabled={!orgId || installing !== null}
                    >
                      {installing === selected.key ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                          Building & Deploying Workflow...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Deploy "{selected.name}" Workspace Blueprint
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}