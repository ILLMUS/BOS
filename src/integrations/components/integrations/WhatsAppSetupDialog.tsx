import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_WHATSAPP_CONFIG,
  WhatsAppConfig,
  fillTemplate,
  isValidWhatsAppNumber,
  loadWhatsAppConfig,
  saveWhatsAppConfig,
  whatsappLink,
} from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (config: WhatsAppConfig) => void;
}

/** Click-to-chat setup — no API, no verification, just wa.me deep links. */
export default function WhatsAppSetupDialog({ open, onOpenChange, onSaved }: Props) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && orgId) loadWhatsAppConfig(orgId).then(setConfig).catch(() => undefined);
  }, [open, orgId]);

  const valid = isValidWhatsAppNumber(config.businessNumber);
  const preview = whatsappLink(
    config.businessNumber || "268",
    fillTemplate(config.defaultMessage, { client: "Sipho Dlamini", job: "JOB-001" }),
  );

  async function handleSave() {
    if (!orgId) return;
    if (config.enabled && !valid) {
      toast({ title: "Check the number", description: "Use the full international number, e.g. +268 7612 3456.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveWhatsAppConfig(orgId, config);
      onSaved?.(config);
      toast({ title: "WhatsApp saved", description: config.enabled ? "Click-to-chat is now active." : "Click-to-chat is turned off." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> WhatsApp Business
          </DialogTitle>
          <DialogDescription>
            Click-to-chat links open WhatsApp with a prefilled message. No API key or business
            verification needed — works on web and mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable click-to-chat</p>
              <p className="text-xs text-muted-foreground">Show WhatsApp buttons across the workspace.</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-number">Business WhatsApp number</Label>
            <Input
              id="wa-number"
              value={config.businessNumber}
              placeholder="+268 7612 3456"
              onChange={(e) => setConfig((c) => ({ ...c, businessNumber: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Include the country code (Eswatini is +268). Used when a client starts a chat with you.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-message">Default message</Label>
            <Textarea
              id="wa-message"
              rows={3}
              value={config.defaultMessage}
              onChange={(e) => setConfig((c) => ({ ...c, defaultMessage: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Use <code>{"{client}"}</code> and <code>{"{job}"}</code> — they are filled in automatically.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium">Preview</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">{preview}</p>
            <Button asChild size="sm" variant="outline" className="mt-2" disabled={!valid}>
              <a href={preview} target="_blank" rel="noopener noreferrer">
                Test chat <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
