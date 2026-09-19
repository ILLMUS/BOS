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
    <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <p className="text-lg font-bold">Good morning</p>
        <p className="text-xs text-muted-foreground">Here is what needs your attention today.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Active work", "24"],
          ["Awaiting approval", "6"],
          ["New clients", "12"],
          ["Completed", "91%"],
        ].map(([label, value], index) => (
          <div key={label} className="border border-border bg-card p-3">
            <div className={cn("mb-3 h-1 w-8", index % 2 ? "bg-[hsl(var(--chart-2))]" : "bg-primary")} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="border border-border bg-card p-4">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold">Performance</p>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex h-28 items-end gap-2">
            {[36, 58, 44, 76, 61, 88, 70].map((height, index) => (
              <div key={index} className="flex h-full flex-1 items-end bg-muted">
                <div className={cn("w-full", index % 3 === 1 ? "bg-[hsl(var(--chart-2))]" : "bg-primary")} style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Recent activity</p>
          {["Quote approved", "New client added", "Work completed"].map((item) => (
            <div key={item} className="flex items-center gap-2 border-b border-border py-2 last:border-0">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs">{item}</span>
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
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-lg font-bold">Customer delivery</p><p className="text-xs text-muted-foreground">Workflow progress and ownership</p></div>
        <Button size="sm">Add work</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {stages.map((stage, index) => (
          <div key={stage} className={cn("border p-3", index < 3 ? "border-primary bg-primary/10" : "border-border bg-card")}>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Step {index + 1}</p>
            <p className="mt-1 text-xs font-semibold">{stage}</p>
          </div>
        ))}
      </div>
      <div className="border border-border bg-card">
        {["Initial consultation", "Prepare proposal", "Customer review", "Schedule delivery"].map((item, index) => (
          <div key={item} className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-7 w-7 items-center justify-center", index < 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {index < 2 ? <CheckCircle2 className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
              </div>
              <div><p className="truncate text-xs font-semibold">{item}</p><p className="text-[10px] text-muted-foreground">Assigned team member</p></div>
            </div>
            <span className={cn("text-[10px] font-semibold", index === 2 ? "text-[hsl(var(--chart-2))]" : "text-muted-foreground")}>{index < 2 ? "Done" : index === 2 ? "Active" : "Waiting"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentPreview({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  return (
    <div className="bg-muted p-4 md:p-6">
      <div className="mx-auto max-w-2xl border border-border bg-card p-5 md:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-border pb-5">
          <div className="h-14 w-24 text-primary"><PreviewLogo logoUrl={logoUrl} businessName={businessName} /></div>
          <div className="text-right"><p className="text-2xl font-bold text-primary">QUOTATION</p><p className="text-xs text-muted-foreground">QT-00142</p></div>
        </div>
        <div className="grid grid-cols-2 gap-6 py-5 text-xs">
          <div><p className="font-semibold text-primary">From</p><p className="mt-1 font-bold">{businessName}</p><p className="text-muted-foreground">Your business details</p></div>
          <div><p className="font-semibold text-primary">Prepared for</p><p className="mt-1 font-bold">Sample customer</p><p className="text-muted-foreground">customer@example.com</p></div>
        </div>
        <div className="overflow-hidden border border-border text-xs">
          <div className="grid grid-cols-[1fr_auto] bg-primary px-3 py-2 font-semibold text-primary-foreground"><span>Description</span><span>Amount</span></div>
          {["Professional service", "Materials and expenses", "Delivery"].map((item, index) => (
            <div key={item} className="grid grid-cols-[1fr_auto] border-b border-border px-3 py-2 last:border-0"><span>{item}</span><span>{["E 12,500.00", "E 3,200.00", "E 850.00"][index]}</span></div>
          ))}
        </div>
        <div className="ml-auto mt-4 w-52 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>E 16,550.00</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>E 2,482.50</span></div>
          <div className="flex justify-between border-t-2 border-[hsl(var(--chart-2))] pt-2 text-sm font-bold text-primary"><span>Total</span><span>E 19,032.50</span></div>
        </div>
      </div>
    </div>
  );
}

export default function BrandingPreviewDialog({ open, onOpenChange, businessName, logoUrl, primary, secondary }: BrandingPreviewDialogProps) {
  const primaryHsl = hexToHsl(primary);
  const secondaryHsl = hexToHsl(secondary);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const previewStyle = {
    ...(primaryHsl ? { "--primary": primaryHsl, "--accent": primaryHsl, "--ring": primaryHsl, "--sidebar-primary": primaryHsl } : {}),
    ...(secondaryHsl ? { "--chart-2": secondaryHsl } : {}),
  } as CSSProperties;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-6xl grid-rows-none flex-col gap-0 overflow-hidden p-0 sm:rounded-md">
        <DialogHeader className="border-b border-border px-5 py-4 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><DialogTitle>Brand preview</DialogTitle><DialogDescription>These changes are not visible to your team until you publish them.</DialogDescription></div>
            <div className="flex border border-border bg-muted p-0.5">
              <Button type="button" size="icon" variant={device === "desktop" ? "default" : "ghost"} onClick={() => setDevice("desktop")} aria-label="Desktop preview"><Monitor className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant={device === "mobile" ? "default" : "ghost"} onClick={() => setDevice("mobile")} aria-label="Mobile preview"><Smartphone className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-muted p-3 md:p-5">
          <div style={previewStyle} className={cn("mx-auto flex min-h-[620px] overflow-hidden border border-border bg-background text-foreground shadow-lg transition-[max-width]", device === "mobile" ? "max-w-[390px]" : "max-w-full")}>
            <aside className={cn("shrink-0 bg-sidebar text-sidebar-foreground", device === "mobile" ? "w-14" : "w-44")}>
              <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden bg-sidebar-primary text-sidebar-primary-foreground"><PreviewLogo logoUrl={logoUrl} businessName={businessName} /></div>
                {device === "desktop" && <span className="truncate text-xs font-bold">{businessName}</span>}
              </div>
              <div className="space-y-1 p-2">
                {[LayoutDashboard, Workflow, Users, FileText].map((Icon, index) => (
                  <div key={index} className={cn("flex h-9 items-center gap-2 px-2 text-xs", index === 0 ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70")}>
                    <Icon className="h-4 w-4 shrink-0" />{device === "desktop" && <span>{["Dashboard", "Workflows", "Customers", "Documents"][index]}</span>}
                  </div>
                ))}
              </div>
            </aside>
            <div className="min-w-0 flex-1">
              <div className="flex h-16 items-center justify-between border-b border-border px-4"><div className="flex items-center gap-2">{device === "mobile" && <Menu className="h-4 w-4" />}<span className="text-sm font-bold">{businessName}</span></div><div className="h-8 w-8 bg-primary text-center text-xs font-bold leading-8 text-primary-foreground">AB</div></div>
              <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="m-3 h-auto max-w-full justify-start overflow-x-auto rounded-none bg-muted p-1">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="document">Customer document</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-0"><DashboardPreview /></TabsContent>
                <TabsContent value="workflow" className="mt-0"><WorkflowPreview /></TabsContent>
                <TabsContent value="document" className="mt-0"><DocumentPreview businessName={businessName} logoUrl={logoUrl} /></TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}