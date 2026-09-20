import { useState, type CSSProperties } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  Monitor,
  Smartphone,
  Users,
  Workflow,
  Sparkles,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BrandingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
}

function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function PreviewLogo({ logoUrl, businessName }: { logoUrl: string | null; businessName: string }) {
  return logoUrl ? (
    <img src={logoUrl} alt={`${businessName} logo preview`} className="h-full w-full object-contain p-1" />
  ) : (
    <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-4 p-4 md:p-6 text-slate-100">
      <div>
        <p className="text-lg font-bold text-white">Good morning</p>
        <p className="text-xs text-slate-400">Here is what needs your attention today.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 min-w-0">
        {[
          ["Active work", "24"],
          ["Awaiting approval", "6"],
          ["New clients", "12"],
          ["Completed", "91%"],
        ].map(([label, value], index) => (
          <div key={label} className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3 min-w-0 shadow-sm">
            <div className={cn("mb-3 h-1 w-8 rounded-full", index % 2 ? "bg-[hsl(var(--chart-2))]" : "bg-primary")} />
            <p className="text-xl font-bold tracking-tight text-white">{value}</p>
            <p className="truncate text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr] min-w-0">
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 min-w-0">
          <div className="mb-5 flex items-center justify-between min-w-0">
            <p className="text-sm font-semibold text-white">Performance</p>
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="flex h-28 items-end gap-2">
            {[36, 58, 44, 76, 61, 88, 70].map((height, index) => (
              <div key={index} className="flex h-full flex-1 items-end rounded-t bg-white/5">
                <div
                  className={cn("w-full rounded-t transition-all duration-300", index % 3 === 1 ? "bg-[hsl(var(--chart-2))]" : "bg-primary")}
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 min-w-0">
          <p className="mb-3 text-sm font-semibold text-white">Recent activity</p>
          {["Quote approved", "New client added", "Work completed"].map((item) => (
            <div key={item} className="flex items-center gap-2 border-b border-white/[0.06] py-2 last:border-0 min-w-0">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-xs text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowPreview() {
  const stages = ["New", "Qualified", "In progress", "Approval", "Complete"];
  return (
    <div className="space-y-5 p-4 md:p-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div>
          <p className="text-lg font-bold text-white">Customer delivery</p>
          <p className="text-xs text-slate-400">Workflow progress and ownership</p>
        </div>
        <Button size="sm" className="h-8 bg-primary text-xs font-semibold text-slate-950 hover:opacity-90">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add work
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5 min-w-0">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className={cn(
              "rounded-xl border p-3 min-w-0",
              index < 3 ? "border-primary/40 bg-primary/10" : "border-white/[0.08] bg-[#02080b]/60"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step {index + 1}</p>
            <p className="mt-1 truncate text-xs font-semibold text-white">{stage}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 overflow-hidden min-w-0">
        {["Initial consultation", "Prepare proposal", "Customer review", "Schedule delivery"].map((item, index) => (
          <div key={item} className="flex items-center justify-between gap-3 border-b border-white/[0.06] p-3 last:border-0 min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", index < 2 ? "bg-primary text-slate-950" : "bg-white/5 text-slate-400")}>
                {index < 2 ? <CheckCircle2 className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-200">{item}</p>
                <p className="truncate text-[10px] text-slate-400">Assigned team member</p>
              </div>
            </div>
            <span className={cn("shrink-0 text-[10px] font-semibold", index === 2 ? "text-[hsl(var(--chart-2))]" : "text-slate-400")}>
              {index < 2 ? "Done" : index === 2 ? "Active" : "Waiting"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentPreview({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  return (
    <div className="p-4 md:p-6 min-w-0">
      <div className="mx-auto max-w-2xl rounded-xl border border-white/[0.08] bg-[#02080b] p-5 shadow-2xl md:p-8 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/[0.08] pb-5 min-w-0">
          <div className="h-12 w-28 text-primary flex items-center min-w-0">
            <PreviewLogo logoUrl={logoUrl} businessName={businessName} />
          </div>
          <div className="text-right min-w-0">
            <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">QUOTATION</p>
            <p className="text-xs text-slate-400">QT-00142</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 py-5 text-xs min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-primary">From</p>
            <p className="mt-1 font-bold text-white truncate">{businessName}</p>
            <p className="text-slate-400 truncate">Your business details</p>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-primary">Prepared for</p>
            <p className="mt-1 font-bold text-white truncate">Sample customer</p>
            <p className="text-slate-400 truncate">customer@example.com</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/[0.08] text-xs min-w-0">
          <div className="grid grid-cols-[1fr_auto] bg-primary px-3 py-2 font-semibold text-slate-950">
            <span>Description</span>
            <span>Amount</span>
          </div>
          {["Professional service", "Materials and expenses", "Delivery"].map((item, index) => (
            <div key={item} className="grid grid-cols-[1fr_auto] border-b border-white/[0.06] bg-white/[0.02] px-3 py-2 text-slate-300 last:border-0">
              <span className="truncate pr-2">{item}</span>
              <span className="font-mono">{["E 12,500.00", "E 3,200.00", "E 850.00"][index]}</span>
            </div>
          ))}
        </div>
        <div className="ml-auto mt-4 w-52 space-y-2 text-xs min-w-0">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono text-slate-200">E 16,550.00</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Tax</span>
            <span className="font-mono text-slate-200">E 2,482.50</span>
          </div>
          <div className="flex justify-between border-t-2 border-[hsl(var(--chart-2))] pt-2 text-sm font-bold text-primary">
            <span>Total</span>
            <span className="font-mono">E 19,032.50</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandingPreviewDialog({
  open,
  onOpenChange,
  businessName,
  logoUrl,
  primary,
  secondary,
}: BrandingPreviewDialogProps) {
  const primaryHsl = hexToHsl(primary);
  const secondaryHsl = hexToHsl(secondary);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const previewStyle = {
    ...(primaryHsl ? { "--primary": primaryHsl, "--accent": primaryHsl, "--ring": primaryHsl, "--sidebar-primary": primaryHsl } : {}),
    ...(secondaryHsl ? { "--chart-2": secondaryHsl } : {}),
  } as CSSProperties;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-6xl grid-rows-none flex-col gap-0 overflow-hidden border-white/[0.08] bg-[#05131a] p-0 text-white shadow-2xl backdrop-blur-md sm:rounded-xl">
        <DialogHeader className="border-b border-white/[0.06] px-4 py-3.5 pr-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
                <Sparkles className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="truncate">Brand preview</span>
              </DialogTitle>
              <DialogDescription className="break-words text-xs text-slate-400">
                These changes are not visible to your team until you publish them.
              </DialogDescription>
            </div>
            <div className="flex rounded-lg border border-white/10 bg-[#02080b]/80 p-0.5 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setDevice("desktop")}
                aria-label="Desktop preview"
                className={cn("h-7 w-7 rounded-md text-xs", device === "desktop" ? "bg-teal-500/20 text-teal-300" : "text-slate-400 hover:text-white")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setDevice("mobile")}
                aria-label="Mobile preview"
                className={cn("h-7 w-7 rounded-md text-xs", device === "mobile" ? "bg-teal-500/20 text-teal-300" : "text-slate-400 hover:text-white")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-[#02080b]/80 p-3 md:p-6">
          <div
            style={previewStyle}
            className={cn(
              "mx-auto flex min-h-[600px] overflow-hidden rounded-xl border border-white/10 bg-[#030d12] text-slate-100 shadow-2xl transition-[max-width] duration-300 min-w-0",
              device === "mobile" ? "max-w-[390px]" : "max-w-full"
            )}
          >
            {/* PREVIEW SIDEBAR */}
            <aside className={cn("shrink-0 border-r border-white/[0.06] bg-[#02080b]/90 transition-all duration-300", device === "mobile" ? "w-14" : "w-44")}>
              <div className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-slate-950 font-bold">
                  <PreviewLogo logoUrl={logoUrl} businessName={businessName} />
                </div>
                {device === "desktop" && <span className="truncate text-xs font-bold text-white">{businessName}</span>}
              </div>
              <div className="space-y-1 p-2 min-w-0">
                {[LayoutDashboard, Workflow, Users, FileText].map((Icon, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-medium transition-colors min-w-0",
                      index === 0 ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {device === "desktop" && <span className="truncate">{["Dashboard", "Workflows", "Customers", "Documents"][index]}</span>}
                  </div>
                ))}
              </div>
            </aside>

            {/* PREVIEW MAIN BODY */}
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4 min-w-0 shrink-0">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {device === "mobile" && <Menu className="h-4 w-4 text-slate-400 shrink-0" />}
                  <span className="truncate text-xs font-bold text-slate-200 sm:text-sm">{businessName}</span>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-slate-950">
                  AB
                </div>
              </div>

              <Tabs defaultValue="dashboard" className="w-full flex-1 flex flex-col min-w-0">
                <TabsList className="m-3 h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#02080b] p-1 shrink-0">
                  <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-slate-950">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-slate-950">
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger value="document" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-slate-950">
                    Customer document
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto min-w-0">
                  <TabsContent value="dashboard" className="mt-0 min-w-0">
                    <DashboardPreview />
                  </TabsContent>
                  <TabsContent value="workflow" className="mt-0 min-w-0">
                    <WorkflowPreview />
                  </TabsContent>
                  <TabsContent value="document" className="mt-0 min-w-0">
                    <DocumentPreview businessName={businessName} logoUrl={logoUrl} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}