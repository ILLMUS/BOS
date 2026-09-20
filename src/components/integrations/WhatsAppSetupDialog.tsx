import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
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
      <DialogContent className="border-white/10 bg-[#05131a] text-white shadow-2xl backdrop-blur-xl sm:max-w-lg min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <MessageSquare className="h-4 w-4" />
            </motion.div>
            <span className="truncate">WhatsApp Business</span>
          </DialogTitle>
          <DialogDescription className="break-words text-xs text-slate-400">
            Click-to-chat links open WhatsApp with a prefilled message. No API key or business
            verification needed — works on web and mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0">
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-slate-200 text-xs sm:text-sm">Enable click-to-chat</p>
              <p className="break-words text-[11px] text-slate-400">Show WhatsApp buttons across the workspace.</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
              className="data-[state=checked]:bg-teal-500 shrink-0"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="wa-number" className="text-xs font-medium text-slate-300">
              Business WhatsApp number
            </Label>
            <Input
              id="wa-number"
              value={config.businessNumber}
              placeholder="+268 7612 3456"
              onChange={(e) => setConfig((c) => ({ ...c, businessNumber: e.target.value }))}
              className="h-9 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 min-w-0"
            />
            <p className="break-words text-[11px] text-slate-400">
              Include the country code (Eswatini is +268). Used when a client starts a chat with you.
            </p>
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label htmlFor="wa-message" className="text-xs font-medium text-slate-300">
              Default message
            </Label>
            <Textarea
              id="wa-message"
              rows={3}
              value={config.defaultMessage}
              onChange={(e) => setConfig((c) => ({ ...c, defaultMessage: e.target.value }))}
              className="border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 resize-none min-w-0"
            />
            <p className="break-words text-[11px] text-slate-400">
              Use <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-slate-300">{"{client}"}</code> and <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-slate-300">{"{job}"}</code> — they are filled in automatically.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/90 p-3.5 space-y-2 min-w-0">
            <p className="text-xs font-semibold text-slate-300">Preview</p>
            <p className="break-all font-mono text-[11px] text-teal-300/90">{preview}</p>
            <Button
              asChild
              size="sm"
              variant="outline"
              disabled={!valid}
              className="h-7 border-white/10 bg-white/5 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <a href={preview} target="_blank" rel="noopener noreferrer">
                Test chat <ExternalLink className="ml-1.5 h-3 w-3 text-teal-400" />
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 border-white/10 bg-transparent text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}