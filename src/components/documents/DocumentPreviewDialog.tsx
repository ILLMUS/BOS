import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildDocumentPdf, documentFileName, KIND_LABEL, money, type DocumentPayload,
} from "@/lib/documentPdf";
import { loadIssuerParty } from "@/lib/documentBranding";
import { isValidWhatsAppNumber, normalizeWhatsAppNumber, whatsappLink } from "@/lib/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Payload without the issuer block — that is loaded from the business profile. */
  payload: Omit<DocumentPayload, "from">;
  jobId?: string | null;
  /** Prefills the WhatsApp recipient. */
  clientPhone?: string | null;
  /** Called with the stored file URL after the document is shared. */
  onStored?: (url: string) => void;
}

/**
 * Generates the PDF, previews it inline and lets the team send it straight to the
 * client's WhatsApp number as a shareable link.
 */
export default function DocumentPreviewDialog({ open, onOpenChange, payload, jobId, clientPhone, onStored }: Props) {
  const { orgId } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const label = KIND_LABEL[payload.kind];

  const total = payload.total ?? (payload.items || []).reduce((s, i) => s + (i.amount ?? i.qty * i.rate), 0);
  const [message, setMessage] = useState("");

  const fileName = useMemo(
    () => documentFileName({ ...payload, from: { name: "" } } as DocumentPayload),
    [payload],
  );

  useEffect(() => {
    if (!open) return;
    setPhone(normalizeWhatsAppNumber(clientPhone || ""));
    let objectUrl: string | null = null;
    let active = true;
    (async () => {
      const from = orgId ? await loadIssuerParty(orgId) : { name: "Your business" };
      if (!active) return;
      const doc = buildDocumentPdf({ ...payload, from });
      const b = doc.output("blob");
      objectUrl = URL.createObjectURL(b);
      setBlob(b);
      setUrl(objectUrl);
      setMessage(
        `Hi ${payload.to.name || "there"}, please find your ${label.toLowerCase()} ${payload.number} ` +
        `totalling ${money(total)} from ${from.name}.`,
      );
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(payload), orgId]);

  const download = () => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sendWhatsApp = async () => {
    if (!blob) return;
    if (!isValidWhatsAppNumber(phone)) return toast.error("Enter a valid WhatsApp number (e.g. 26876123456)");
    setSending(true);
    try {
      let link = "";
      if (jobId) {
        const path = `${jobId}/documents/${Date.now()}-${fileName}`;
        const { error } = await supabase.storage.from("job-files").upload(path, blob, {
          contentType: "application/pdf",
        });
        if (error) throw error;
        const { data, error: signErr } = await supabase.storage
          .from("job-files")
          .createSignedUrl(path, 60 * 60 * 24 * 30);
        if (signErr) throw signErr;
        link = data?.signedUrl || "";
        const { data: { publicUrl } } = supabase.storage.from("job-files").getPublicUrl(path);
        onStored?.(publicUrl);
      }
      const text = link ? `${message}\n\n${link}` : message;
      window.open(whatsappLink(phone, text), "_blank", "noopener,noreferrer");
      toast.success("WhatsApp opened with the document link");
    } catch (e: any) {
      toast.error(e.message || "Could not prepare the document link");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label} {payload.number} — PDF preview</DialogTitle>
          <DialogDescription>
            Review the document, download it, or send it straight to the client on WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[55vh] w-full overflow-hidden rounded border border-border bg-muted">
          {url ? (
            <iframe title={`${label} preview`} src={`${url}#toolbar=0`} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="doc-wa">Client WhatsApp number</Label>
            <Input
              id="doc-wa"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="26876123456"
              inputMode="tel"
            />
            <p className="text-[11px] text-muted-foreground">Country code, digits only (Eswatini = 268).</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-msg">Message</Label>
            <Textarea id="doc-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={download} disabled={!blob} className="gap-1.5">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={sendWhatsApp} disabled={!blob || sending} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Send to client on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
