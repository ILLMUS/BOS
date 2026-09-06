import PageSkeleton from "@/components/ui/page-skeleton";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CalendarIcon, DollarSign, Factory, Handshake, Loader2, RefreshCw, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useReporting } from "@/hooks/useReporting";
import type { ReportRange } from "@/lib/reporting";
import { SalesReport } from "@/components/reporting/SalesReport";
import { OperationsReport } from "@/components/reporting/OperationsReport";
import { FinanceReport } from "@/components/reporting/FinanceReport";
import { PeopleReport } from "@/components/reporting/PeopleReport";

const PRESETS = [7, 30, 90];

export default function Reports() {
  const { isAdmin, user, organization } = useAuth();
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const range: ReportRange = useMemo(
    () => ({ from: from ?? null, to: to ?? null }),
    [from, to],
  );

  const { loading, reload, sales, ops, finance, people, hasData } = useReporting(range);

  // Members only see their own workload; admins see the whole team.
  const visiblePeople = isAdmin ? people : people.filter((p) => p.userId === user?.id);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Live figures from {organization?.name || "your workspace"} — nothing simulated.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((d) => {
            const active = from && !to && format(from, "yyyy-MM-dd") === format(subDays(new Date(), d), "yyyy-MM-dd");
            return (
              <Button
                key={d}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => { setFrom(subDays(new Date(), d)); setTo(undefined); }}
              >
                {d} days
              </Button>
            );
          })}

          <DatePick label="From" value={from} onChange={setFrom} />
          <DatePick label="To" value={to} onChange={setTo} />

          {(from || to) && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setFrom(undefined); setTo(undefined); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {!hasData && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No business data to report on yet</p>
            <p className="text-sm text-muted-foreground">
              Reports fill in automatically as leads, deals, work and payments are captured.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={isAdmin ? "sales" : "operations"}>
        <TabsList className="flex-wrap">
          {isAdmin && (
            <TabsTrigger value="sales" className="gap-1.5"><Handshake className="h-3.5 w-3.5" /> Sales</TabsTrigger>
          )}
          <TabsTrigger value="operations" className="gap-1.5"><Factory className="h-3.5 w-3.5" /> Operations</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="finance" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Finance</TabsTrigger>
          )}
          <TabsTrigger value="people" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> {isAdmin ? "People" : "My performance"}
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="sales" className="mt-4"><SalesReport data={sales} /></TabsContent>
        )}
        <TabsContent value="operations" className="mt-4"><OperationsReport data={ops} /></TabsContent>
        {isAdmin && (
          <TabsContent value="finance" className="mt-4"><FinanceReport data={finance} /></TabsContent>
        )}
        <TabsContent value="people" className="mt-4">
          <PeopleReport people={visiblePeople} currentUserId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DatePick({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", value && "text-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="pointer-events-auto p-3" />
      </PopoverContent>
    </Popover>
  );
}
