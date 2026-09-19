import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, MessageCircle, RefreshCw } from "lucide-react";
import { loadStageDecision, trackingUrl, type ClientDecision } from "@/lib/clientApproval";

interface Props {
  jobNumber: string;
  clientName: string;
  clientPhone?: string | null;
  stageId: string;
  stageName: string;
  trackingToken: string | null;
  clientCode: string | null;
  onDecision?: (d: ClientDecision | null) => void;
}

export default function ClientApprovalPanel({
  jobNumber,
  clientName,
  clientPhone,
  stageId,
  stageName,
  trackingToken,
  clientCode,
  onDecision,
}: Props) {
  const [decision, setDecision] = useState<ClientDecision | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const d = await loadStageDecision(stageId);
    setDecision(d);
    onDecision?.(d);
    setLoading(false);
  }, [stageId, onDecision]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const link = trackingToken ? trackingUrl(trackingToken) : "";
  const message =
    `Hi ${clientName}, your project ${jobNumber} is ready for your approval of "${stageName}".\n\n` +
    `Review and approve here: ${link}\n` +
    `Your client ID (needed to approve): ${clientCode || "—"}`;

  const copy = async (value: string, what: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`);
  };

  const whatsapp = () => {
    const phone = (clientPhone || "").replace(/[^\d]/g, "");
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Card className="border-accent/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">Client approval</CardTitle>
          <Badge
            variant="outline"
            className={
              decision?.decision === "approved"
                ? "border-success text-success"
                : decision?.decision === "declined"
                ? "border-destructive text-destructive"
                : "border-accent text-accent"
            }
          >
            {loading ? "CHECKING" : decision ? decision.decision.toUpperCase() : "WAITING ON CLIENT"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {decision ? (
          <div className="rounded border border-border p-3">
            <p className="font-medium">
              {decision.decision === "approved" ? "Approved" : "Declined"} by{" "}
              {decision.client_name || clientName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(decision.created_at).toLocaleString()}
            </p>
            {decision.comment && <p className="mt-2 text-sm">“{decision.comment}”</p>}
          </div>
        ) : (
          <p className="text-muted-foreground">
            This step moves forward only once {clientName} approves it from their tracking link.
            Send them the link and their client ID — the ID is their password to approve.
          </p>
        )}

        {!trackingToken ? (
          <p className="text-warning">
            This job has no tracking link yet. Enable it in Client Portal Access.
          </p>
        ) : (
          <>
            <div className="rounded border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Client ID</p>
              <p className="font-heading text-xl font-bold tracking-[0.3em]">{clientCode || "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(link, "Tracking link")}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(clientCode || "", "Client ID")}
                disabled={!clientCode}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy client ID
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(message, "Message")}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy message
              </Button>
              <Button size="sm" variant="outline" onClick={whatsapp}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
