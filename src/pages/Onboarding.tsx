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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Loader2, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { EMPLOYEE_RANGES, NICHE_PRESETS } from "@/lib/businessSetup";

const TOTAL_STEPS = 4;

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
    step === 4;

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc("setup_workspace", {
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
    await refreshProfile();
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">Tell us about your business</CardTitle>
            <CardDescription>
              Your answers build a workflow made for how <em>you</em> work — any industry, any service.
            </CardDescription>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 ${i < step ? "bg-accent" : "bg-muted"}`} />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Business name *</Label>
                  <Input id="company" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${ex.business}`} />
                </div>

                <div className="space-y-2">
                  <Label>Business niche *</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {NICHE_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => pickNiche(p.key)}
                        className={`rounded border p-3 text-left text-sm transition ${
                          nicheKey === p.key ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {nicheKey === "other" && (
                    <Input
                      className="mt-2"
                      value={nicheOther}
                      onChange={(e) => setNicheOther(e.target.value)}
                      placeholder="Describe your niche, e.g. Mobile car detailing"
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="loc">Location</Label>
                    <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country" />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of employees</Label>
                    <Select value={employees} onValueChange={setEmployees}>
                      <SelectTrigger><SelectValue placeholder="Choose a range" /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_RANGES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="services">What do you sell or deliver?</Label>
                  <Input id="services" value={services} onChange={(e) => setServices(e.target.value)} placeholder={`e.g. ${ex.services}`} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">How would you describe the business in a sentence?</Label>
                  <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Job number prefix</Label>
                  <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={8} placeholder={ex.prefix} />
                  <p className="text-xs text-muted-foreground">
                    Jobs will be numbered {(prefix || ex.prefix).toUpperCase()}-00001.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Who works on jobs? (team roles)</Label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r, i) => (
                      <Badge key={`${r}-${i}`} variant="outline" className="gap-1 py-1">
                        {r}
                        <button type="button" onClick={() => setRoles(roles.filter((_, x) => x !== i))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder={`Add a role, e.g. ${ex.role}`}
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
                <div className="flex items-start gap-2 rounded border border-accent/40 bg-accent/5 p-3 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    Based on <strong>{nicheLabel || "your niche"}</strong> we drafted these steps. Rename, reorder
                    or delete anything — this becomes your live workflow.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>Workflow name</Label>
                  <Input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Main Workflow" />
                </div>

                <div className="space-y-2">
                  <Label>Steps, in the order they happen *</Label>
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{i + 1}</Badge>
                      <Input
                        value={s}
                        onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSteps(move(steps, i, -1))}>↑</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSteps(move(steps, i, 1))}>↓</Button>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      placeholder={`Add a step, e.g. ${ex.step}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newStep.trim()) {
                          e.preventDefault();
                          setSteps([...steps, newStep.trim()]);
                          setNewStep("");
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => { if (newStep.trim()) { setSteps([...steps, newStep.trim()]); setNewStep(""); } }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Check it over, then we'll build your workspace.</p>
                <div className="rounded border border-border divide-y divide-border">
                  {[
                    ["Business", name],
                    ["Niche", nicheLabel],
                    ["Location", location || "—"],
                    ["Employees", employees || "—"],
                    ["Services", services || "—"],
                    ["Roles", roles.join(", ") || "—"],
                    ["Workflow", `${workflowName || "Main Workflow"} (${steps.length} steps)`],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex gap-4 p-3">
                      <span className="w-28 shrink-0 text-muted-foreground">{k}</span>
                      <span className="font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  You can add questions to each step, deadlines and owners later in the SOP Builder.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => (step === 1 ? signOut() : setStep(step - 1))} disabled={submitting}>
                {step === 1 ? <><LogOut className="mr-2 h-4 w-4" />Sign out</> : <><ArrowLeft className="mr-2 h-4 w-4" />Back</>}
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => setStep(step + 1)}
                  disabled={!canContinue}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Build my workspace
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
