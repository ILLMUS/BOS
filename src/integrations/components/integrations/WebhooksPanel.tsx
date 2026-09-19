import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Webhook, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

/**
 * Structure only. Outbound/inbound webhook delivery is not implemented yet —
 * the only live inbound endpoint today is the Quote Builder API, managed under
 * the API Provider tab.
 */
export default function WebhooksPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpFromLine className="h-5 w-5 text-accent" />
            Outbound webhooks
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Notify external systems when work, approvals or finance records change.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <Webhook className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No outbound webhooks configured</p>
              <p className="text-xs text-muted-foreground">
                Webhook delivery is not enabled for this workspace yet.
              </p>
            </div>
            <Button size="sm" variant="outline" disabled>
              Add webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowDownToLine className="h-5 w-5 text-accent" />
            Inbound endpoints
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Endpoints external systems can push data into.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Quote Builder API</p>
              <p className="truncate text-xs text-muted-foreground">
                Receives quotes, invoices and receipts from the external document builder.
              </p>
            </div>
            <Badge>Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage its keys and base URL under the API Provider tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
