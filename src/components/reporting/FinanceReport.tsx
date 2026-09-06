import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, EmptyState } from "./MetricCard";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/finance";
import { money, type FinanceReport as FinanceData } from "@/lib/reporting";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig: ChartConfig = {
  received: { label: "Received", color: "hsl(var(--primary))" },
  spent: { label: "Costs", color: "hsl(var(--muted-foreground))" },
};

export function FinanceReport({ data }: { data: FinanceData }) {
  const hasTrend = data.trend.some((t) => t.received > 0 || t.spent > 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Quoted" value={money(data.quoted)} hint={`${data.quotes.length} quotes`} />
        <MetricCard label="Invoiced" value={money(data.invoiced)} hint={`${data.invoices.length} invoices`} />
        <MetricCard label="Received" value={money(data.received)} tone="positive" hint={`${data.collectionRate}% collected`} />
        <MetricCard label="Outstanding" value={money(data.outstanding)} tone={data.outstanding > 0 ? "warning" : "default"} />
        <MetricCard label="Net revenue" value={money(data.netRevenue)} hint={`${money(data.expenses)} costs`} tone={data.netRevenue >= 0 ? "positive" : "danger"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs costs (6 months)</CardTitle></CardHeader>
          <CardContent>
            {!hasTrend ? <EmptyState message="No payments or expenses recorded yet." /> : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis width={50} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" fill="var(--color-spent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Costs by category</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.expensesByCategory.length === 0 ? <EmptyState message="No expenses recorded." /> :
              data.expensesByCategory.map((c) => (
                <div key={c.category} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{EXPENSE_CATEGORY_LABELS[c.category] || c.category}</span>
                  <span className="font-medium">{money(c.amount)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
