import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Loader2, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { EMPLOYEE_RANGES, NICHE_PRESETS } from "@/lib/businessSetup";
import { COPY_TERMS, copyForNiche, copyToItems, type CopyMap } from "@/lib/copyConfig";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL_STEPS = 5;

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.35)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.04] blur-3xl" />
      {children}
    </div>
  );
}

export default function Onboarding() {
  const { session, isLoading, orgId, refreshProfile, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [nicheKey, setNicheKey] = useState("");
  const [nicheOther, setNicheOther] = useState("");
  const [location, setLocation] = useState("");
  const [employees, setEmployees] = useState("");
  const [services, setServices] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [words, setWords] = useState<CopyMap>(() => copyForNiche(null));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090e]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (orgId) return <Navigate to="/dashboard" replace />;

  const preset = NICHE_PRESETS.find((p) => p.key === nicheKey);
  const nicheLabel = nicheKey === "other" ? nicheOther : preset?.label ?? "";
  const ex = preset?.examples ?? { business: "Your Business Name", services: "Your main products or services", prefix: "BIZ", role: "Team Member", step: "Quality Check" };

  const pickNiche = (key: string) => {
    setNicheKey(key);
    const p = NICHE_PRESETS.find((x) => x.key === key);
    if (p) {
      setRoles(p.roles);
      setSteps(p.steps);
      setWorkflowName(p.workflow);
      setWords(copyForNiche(key));
    }
  };

  const move = (list: string[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const canContinue =
    (step === 1 && name.trim() !== "" && nicheKey !== "" && (nicheKey !== "other" || nicheOther.trim() !== "")) ||
    (step === 2) ||
    (step === 3 && steps.length > 0) ||
    step === 4 ||
    step === 5;

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const { data: newOrgId, error: rpcError } = await supabase.rpc("setup_workspace", {
      _name: name.trim(),
      _job_prefix: prefix.trim() || null,
      _industry: nicheLabel || null,
      _location: location.trim() || null,
      _employee_count: employees || null,
      _main_services: services.trim() || null,
      _description: description.trim() || null,
      _roles: roles.filter((r) => r.trim() !== ""),
      _workflow_name: workflowName.trim() || "Main Workflow",
      _steps: steps.filter((s) => s.trim() !== ""),
    });
    if (rpcError) {
      setError(rpcError.message);
      setSubmitting(false);
      return;
    }
    if (newOrgId) {
      await supabase
        .from("org_config")
        .upsert(
          { org_id: newOrgId as string, key: "copy_terms", value: copyToItems(words) as unknown as never },
          { onConflict: "org_id,key" },
        );
    }
    await refreshProfile();
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090e] px-4 py-10 text-slate-200">
      <div className="w-full max-w-2xl">
        <GlassCard>
          {/* HEADER */}
          <div className="border-b border-white/[0.085] bg-white/[0.02] p-6 pb-5">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 12, scale: 1.05 }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-400 shadow-inner"
              >
                <Building2 className="h-5 w-5" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  Tell us about your business
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Your answers build a workflow tuned for how <span className="text-slate-200 italic">you</span> work.
                </p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-5 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < step ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "bg-white/[0.06]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-xs text-slate-300">Business name <span className="text-cyan-400">*</span></Label>
                      <Input
                        id="company"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`e.g. ${ex.business}`}
                        className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/20 text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Business niche <span className="text-cyan-400">*</span></Label>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {NICHE_PRESETS.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => pickNiche(p.key)}
                            className={`rounded-xl border p-3 text-left text-xs transition-all ${
                              nicheKey === p.key
                                ? "border-cyan-400/50 bg-cyan-500/10 font-medium text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                : "border-white/[0.08] bg-[#0b0e14] text-slate-300 hover:border-white/[0.15]"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {nicheKey === "other" && (
                        <Input
                          className="mt-2.5 h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                          value={nicheOther}
                          onChange={(e) => setNicheOther(e.target.value)}
                          placeholder="Describe your niche, e.g. Mobile car detailing"
                        />
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="loc" className="text-xs text-slate-300">Location</Label>
                        <Input
                          id="loc"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="City, country"
                          className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-300">Number of employees</Label>
                        <Select value={employees} onValueChange={setEmployees}>
                          <SelectTrigger className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-200 text-xs">
                            <SelectValue placeholder="Choose a range" />
                          </SelectTrigger>
                          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200 text-xs">
                            {EMPLOYEE_RANGES.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs focus:bg-cyan-500/20 focus:text-cyan-300">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="services" className="text-xs text-slate-300">What do you sell or deliver?</Label>
                      <Input
                        id="services"
                        value={services}
                        onChange={(e) => setServices(e.target.value)}
                        placeholder={`e.g. ${ex.services}`}
                        className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc" className="text-xs text-slate-300">How would you describe the business in a sentence?</Label>
                      <Textarea
                        id="desc"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-xs text-slate-300">Job number prefix</Label>
                      <Input
                        id="prefix"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                        maxLength={8}
                        placeholder={ex.prefix}
                        className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs font-mono uppercase"
                      />
                      <p className="text-[10px] text-slate-400">
                        Jobs will be numbered <span className="font-mono text-cyan-300">{(prefix || ex.prefix).toUpperCase()}-00001</span>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Who works on jobs? (team roles)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((r, i) => (
                          <Badge key={`${r}-${i}`} variant="outline" className="gap-1.5 py-1 px-2.5 border-white/[0.1] bg-white/[0.03] text-slate-200 text-xs">
                            {r}
                            <button type="button" onClick={() => setRoles(roles.filter((_, x) => x !== i))} className="hover:text-red-400 transition-colors">
                              <Trash2 className="h-3 w-3 text-slate-400" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          placeholder={`Add a role, e.g. ${ex.role}`}
                          className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newRole.trim()) {
                              e.preventDefault();
                              setRoles([...roles, newRole.trim()]);
                              setNewRole("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 px-4 rounded-xl border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
                          onClick={() => { if (newRole.trim()) { setRoles([...roles, newRole.trim()]); setNewRole(""); } }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3.5 text-xs text-cyan-200">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      <span>
                        Based on <strong className="text-white">{nicheLabel || "your niche"}</strong> we drafted these steps. Rename, reorder or delete anything — this becomes your live workflow.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Workflow name</Label>
                      <Input
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        placeholder="Main Workflow"
                        className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 focus-visible:border-cyan-400/50 text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Steps, in the order they happen <span className="text-cyan-400">*</span></Label>
                      <div className="space-y-2">
                        {steps.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono border-white/[0.1] bg-[#0b0e14] text-slate-400 text-[10px] h-9 px-2.5">
                              {i + 1}
                            </Badge>
                            <Input
                              value={s}
                              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
                              className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 focus-visible:border-cyan-400/50 text-xs"
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/[0.06]" onClick={() => setSteps(move(steps, i, -1))}>↑</Button>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/[0.06]" onClick={() => setSteps(move(steps, i, 1))}>↓</Button>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:bg-red-500/10" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newStep}
                          onChange={(e) => setNewStep(e.target.value)}
                          placeholder={`Add a step, e.g. ${ex.step}`}
                          className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newStep.trim()) {
                              e.preventDefault();
                              setSteps([...steps, newStep.trim()]);
                              setNewStep("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 px-4 rounded-xl border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                          onClick={() => { if (newStep.trim()) { setSteps([...steps, newStep.trim()]); setNewStep(""); } }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      What do you call things in your business? These words customize labels across the application interface.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COPY_TERMS.map((term) => (
                        <div key={term.term} className="space-y-1">
                          <Label htmlFor={`w-${term.term}`} className="text-[11px] text-slate-300">{term.label}</Label>
                          <Input
                            id={`w-${term.term}`}
                            value={words[term.term]}
                            onChange={(e) => setWords({ ...words, [term.term]: e.target.value })}
                            className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 focus-visible:border-cyan-400/50 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      You can modify these any time later from organization preferences.
                    </p>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-3.5 text-xs">
                    <p className="text-slate-400">Review your settings below before compiling your workspace.</p>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0b0e14] divide-y divide-white/[0.06] overflow-hidden">
                      {[
                        ["Business", name],
                        ["Niche", nicheLabel],
                        ["Location", location || "—"],
                        ["Employees", employees || "—"],
                        ["Services", services || "—"],
                        ["Roles", roles.join(", ") || "—"],
                        ["Workflow", `${workflowName || "Main Workflow"} (${steps.length} steps)`],
                        ["Wording", `${words.work_items}, ${words.stages}, ${words.clients}`],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex gap-4 p-3.5">
                          <span className="w-28 shrink-0 text-slate-400">{k}</span>
                          <span className="font-medium text-slate-100 truncate">{v as string}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Checklist items, additional stage rules, and deadlines can be added in the SOP Builder next.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* FOOTER CONTROLS */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.085] mt-6">
              <Button
                variant="ghost"
                onClick={() => (step === 1 ? signOut() : setStep(step - 1))}
                disabled={submitting}
                className="h-9 text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs rounded-xl"
              >
                {step === 1 ? <><LogOut className="mr-1.5 h-3.5 w-3.5" />Sign out</> : <><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back</>}
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  className="h-9 px-5 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                  onClick={() => setStep(step + 1)}
                  disabled={!canContinue}
                >
                  Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  className="h-9 px-5 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Build my workspace
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}