import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Info, Paperclip, PenLine, Phone, Plus, StickyNote, Trash2 } from "lucide-react";

export interface QuoteExtrasValue {
  terms?: string;
  notes?: string;
  additional_info?: string;
  contact_details?: string;
  signature_name?: string;
  attachments?: { id: string; label: string; url: string }[];
}

const BLOCKS: { key: keyof QuoteExtrasValue; label: string; icon: typeof FileText; rows: number }[] = [
  { key: "terms", label: "Terms & Conditions", icon: FileText, rows: 4 },
  { key: "notes", label: "Notes", icon: StickyNote, rows: 3 },
  { key: "additional_info", label: "Additional Info", icon: Info, rows: 3 },
  { key: "contact_details", label: "Contact Details", icon: Phone, rows: 2 },
];

interface Props {
  value: QuoteExtrasValue;
  onChange: (v: QuoteExtrasValue) => void;
  readOnly?: boolean;
}

/** Optional blocks shown under the quote — each appears on the PDF when filled. */
export default function QuoteExtras({ value, onChange, readOnly }: Props) {
  const patch = (u: Partial<QuoteExtrasValue>) => onChange({ ...value, ...u });
  const attachments = value.attachments || [];

  return (
    <div className="space-y-3">
      {BLOCKS.map(({ key, label, icon: Icon, rows }) => {
        const current = (value[key] as string) || "";
        if (readOnly && !current) return null;
        return (
          <div key={key} className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5" /> {label}
            </Label>
            {readOnly ? (
              <p className="whitespace-pre-wrap rounded border border-border bg-muted/30 p-3 text-sm">{current}</p>
            ) : (
              <Textarea rows={rows} value={current} placeholder={`Add ${label.toLowerCase()}…`}
                onChange={(e) => patch({ [key]: e.target.value } as Partial<QuoteExtrasValue>)} />
            )}
          </div>
        );
      })}

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <PenLine className="h-3.5 w-3.5" /> Signature (name shown on the document)
        </Label>
        {readOnly ? (
          <p className="text-sm">{value.signature_name || "—"}</p>
        ) : (
          <Input value={value.signature_name || ""} placeholder="e.g. J. Dlamini, Director"
            onChange={(e) => patch({ signature_name: e.target.value })} />
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" /> Attachments (links)
        </Label>
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            {readOnly ? (
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                {a.label || a.url}
              </a>
            ) : (
              <>
                <Input className="h-9" placeholder="Label" value={a.label}
                  onChange={(e) => patch({ attachments: attachments.map((x) => x.id === a.id ? { ...x, label: e.target.value } : x) })} />
                <Input className="h-9" placeholder="https://…" value={a.url}
                  onChange={(e) => patch({ attachments: attachments.map((x) => x.id === a.id ? { ...x, url: e.target.value } : x) })} />
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9"
                  onClick={() => patch({ attachments: attachments.filter((x) => x.id !== a.id) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button type="button" size="sm" variant="outline" className="gap-1"
            onClick={() => patch({ attachments: [...attachments, { id: crypto.randomUUID(), label: "", url: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add attachment
          </Button>
        )}
      </div>
    </div>
  );
}
