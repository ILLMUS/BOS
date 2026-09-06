import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

/**
 * Placeholder surface. There is no integration activity store yet, so this
 * always renders an honest empty state rather than invented entries.
 */
export default function IntegrationLogs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Integration Logs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Activity from inbound and outbound integration traffic will appear here.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
          <ScrollText className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No integration activity recorded</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Log capture is not enabled yet. Once integrations are connected, requests, syncs and
            failures will be listed here with their timestamps and outcomes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
