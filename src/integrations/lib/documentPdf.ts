import { jsPDF } from "jspdf";
import { formatAmount } from "@/lib/quote";

export type DocumentKind = "quote" | "invoice" | "receipt";

export interface DocumentParty {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface DocumentLine {
  description: string;
  qty: number;
  rate: number;
  amount?: number;
}

export interface DocumentPayload {
  kind: DocumentKind;
  /** Big headline — usually the job / project title. */
  title: string;
  number: string;
  date: string;
  dueDate?: string | null;
  from: DocumentParty;
  to: DocumentParty;
  items: DocumentLine[];
  /** Sum of line amounts. Falls back to the computed sum. */
  subtotal?: number;
  vat?: number;
  total?: number;
  notes?: string | null;
  /** Extra rows shown under the totals (e.g. amount received, balance). */
  extraTotals?: { label: string; value: number }[];
  /** ISO currency code — defaults to the Eswatini Lilangeni. */
  currency?: string | null;
  /** What the tax row is called (VAT, GST, Sales Tax…). */
  taxLabel?: string | null;
  /** Written-out total, printed under the totals when present. */
  totalInWords?: string | null;
  /** Terms & conditions block printed under the totals. */
  terms?: string | null;
  /** Name printed above the signature line. */
  signature?: string | null;
  /** Links listed at the end of the document. */
  attachments?: { label: string; url: string }[];
}

const GOLD: [number, number, number] = [201, 145, 47];
const CREAM: [number, number, number] = [246, 239, 227];
const ROW_ALT: [number, number, number] = [251, 248, 242];
const INK: [number, number, number] = [32, 32, 32];
const MUTED: [number, number, number] = [122, 122, 122];
const LINE: [number, number, number] = [226, 222, 214];

const M = 22; // page margin (mm)
const W = 210;
const RIGHT = W - M;

export const KIND_LABEL: Record<DocumentKind, string> = {
  quote: "Quote",
  invoice: "Invoice",
  receipt: "Receipt",
};

export const money = (n: number, currency?: string | null) =>
  formatAmount(Number.isFinite(n) ? n : 0, currency);

export const formatDocDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
};

export function documentFileName(p: DocumentPayload) {
  const safe = (s: string) => (s || "").replace(/[^\w-]+/g, "_").replace(/^_|_$/g, "");
  return `${safe(p.to.name)}-${KIND_LABEL[p.kind]}-${safe(p.number)}.pdf`;
}

/** Renders a quote / invoice / receipt laid out like the RST document template. */
export function buildDocumentPdf(p: DocumentPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const label = KIND_LABEL[p.kind];
  const items = p.items || [];
  const computed = items.reduce((s, i) => s + (i.amount ?? i.qty * i.rate), 0);
  const subtotal = p.subtotal ?? computed;
  const vat = p.vat ?? 0;
  const total = p.total ?? subtotal + vat;
  const m = (n: number) => money(n, p.currency);

  let page = 1;
  const footer = () => {
    const y = 273;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, y, RIGHT, y);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(p.from.name, M, y + 5);
    doc.text(`${label} ${p.number}`, RIGHT, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const contact = [p.from.phone, p.from.email, p.from.address].filter(Boolean).join("  •  ");
    doc.text(contact, M, y + 9.5, { maxWidth: 120 });
    doc.text(`Page ${page}`, RIGHT, y + 9.5, { align: "right" });
  };

  // ---- Header -------------------------------------------------------------
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(23);
  const titleLines = doc.splitTextToSize(p.title || label, 120);
  doc.text(titleLines, M, 40);
  let y = 40 + (titleLines.length - 1) * 9;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text(p.from.name.toUpperCase(), RIGHT, 38, { align: "right" });

  const metaRow = (lbl: string, val: string, ry: number) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(lbl, M, ry);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(val, M + 26, ry);
  };
  metaRow(`${label} No`, p.number || "—", y + 8);
  metaRow(`${label} Date`, formatDocDate(p.date), y + 13.5);
  if (p.dueDate) metaRow("Due Date", formatDocDate(p.dueDate), y + 19);
  y += p.dueDate ? 27 : 21.5;

  // ---- Party cards --------------------------------------------------------
  const cardW = (RIGHT - M - 8) / 2;
  const cardH = 36;
  const partyCard = (x: number, heading: string, party: DocumentParty) => {
    doc.setFillColor(...CREAM);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GOLD);
    doc.text(heading, x + 6, y + 9);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(party.name || "—", x + 6, y + 16.5, { maxWidth: cardW - 12 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    let ly = y + 22;
    [party.address, party.phone, party.email].filter(Boolean).forEach((v) => {
      const lines = doc.splitTextToSize(String(v), cardW - 12);
      doc.text(lines, x + 6, ly);
      ly += lines.length * 4;
    });
  };
  partyCard(M, `${label} From`, p.from);
  partyCard(M + cardW + 8, `${label} For`, p.to);
  y += cardH + 12;

  // ---- Items table --------------------------------------------------------
  const colNo = M + 4;
  const colItem = M + 14;
  const colQty = M + 118;
  const colRate = M + 143;
  const colAmt = RIGHT - 4;
  const rowH = 9;

  const tableHeader = () => {
    doc.setFillColor(...GOLD);
    doc.rect(M, y, RIGHT - M, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("#", colNo, y + 6.5);
    doc.text("Item", colItem, y + 6.5);
    doc.text("Qty", colQty, y + 6.5, { align: "right" });
    doc.text("Rate", colRate, y + 6.5, { align: "right" });
    doc.text("Amount", colAmt, y + 6.5, { align: "right" });
    y += 10;
  };
  tableHeader();

  items.forEach((it, idx) => {
    if (y + rowH > 262) {
      footer();
      doc.addPage();
      page += 1;
      y = 28;
      tableHeader();
    }
    if (idx % 2 === 1) {
      doc.setFillColor(...ROW_ALT);
      doc.rect(M, y, RIGHT - M, rowH, "F");
    }
    const amount = it.amount ?? it.qty * it.rate;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${idx + 1}.`, colNo, y + 6);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(it.description || "—", 96)[0], colItem, y + 6);
    doc.text(String(it.qty), colQty, y + 6, { align: "right" });
    doc.text(m(it.rate), colRate, y + 6, { align: "right" });
    doc.text(m(amount), colAmt, y + 6, { align: "right" });
    y += rowH;
  });

  if (!items.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("No line items recorded.", colItem, y + 6);
    y += rowH;
  }

  // ---- Totals -------------------------------------------------------------
  y += 14;
  if (y > 235) { footer(); doc.addPage(); page += 1; y = 32; }
  const totalsX = M + 108;
  const totalRow = (lbl: string, val: number, strong = false) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(totalsX, y - 5, RIGHT, y - 5);
    doc.setFontSize(strong ? 12 : 8.5);
    doc.setFont("helvetica", strong ? "normal" : "normal");
    doc.setTextColor(...(strong ? INK : MUTED));
    doc.text(lbl, totalsX, y);
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setTextColor(...INK);
    doc.text(m(val), RIGHT, y, { align: "right" });
    y += strong ? 12 : 8;
  };

  totalRow("Amount", subtotal);
  if (vat) totalRow(p.taxLabel || "VAT", vat);
  (p.extraTotals || []).forEach((r) => totalRow(r.label, r.value));
  totalRow(p.kind === "receipt" ? "Total Paid" : "Total", total, true);

  const block = (heading: string | null, body: string, size = 8) => {
    const lines = doc.splitTextToSize(body, RIGHT - M);
    if (y + lines.length * 4 + 10 > 262) { footer(); doc.addPage(); page += 1; y = 30; }
    y += 4;
    if (heading) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text(heading.toUpperCase(), M, y);
      y += 5;
    }
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(lines, M, y);
    y += lines.length * 4 + 2;
  };

  if (p.totalInWords) block(null, `Amount in words: ${p.totalInWords}`, 8.5);
  if (p.notes) block(null, p.notes);
  if (p.terms) block("Terms & Conditions", p.terms);
  if (p.attachments?.length) {
    block("Attachments", p.attachments.map((a) => `• ${a.label || "Attachment"} — ${a.url}`).join("\n"));
  }
  if (p.signature) {
    if (y + 20 > 262) { footer(); doc.addPage(); page += 1; y = 30; }
    y += 12;
    doc.setDrawColor(...LINE);
    doc.line(RIGHT - 60, y, RIGHT, y);
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(p.signature, RIGHT, y + 5, { align: "right" });
    doc.setTextColor(...MUTED);
    doc.text("Authorised signature", RIGHT, y + 9.5, { align: "right" });
  }

  footer();
  return doc;
}

export function documentBlob(p: DocumentPayload): Blob {
  return buildDocumentPdf(p).output("blob");
}
