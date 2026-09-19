/**
 * Generic quotation engine — currency-agnostic so any business can use the
 * quote builder, not just one country or one tax rate.
 */

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  major: string;
  majorPlural: string;
  minor: string;
  minorPlural: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "SZL", symbol: "E", label: "Eswatini Lilangeni (SZL, E)", major: "Lilangeni", majorPlural: "Emalangeni", minor: "Cent", minorPlural: "Cents" },
  { code: "ZAR", symbol: "R", label: "South African Rand (ZAR, R)", major: "Rand", majorPlural: "Rand", minor: "Cent", minorPlural: "Cents" },
  { code: "USD", symbol: "$", label: "US Dollar (USD, $)", major: "Dollar", majorPlural: "Dollars", minor: "Cent", minorPlural: "Cents" },
  { code: "GBP", symbol: "£", label: "British Pound Sterling (GBP, £)", major: "Pound", majorPlural: "Pounds", minor: "Pence", minorPlural: "Pence" },
  { code: "EUR", symbol: "€", label: "Euro (EUR, €)", major: "Euro", majorPlural: "Euros", minor: "Cent", minorPlural: "Cents" },
  { code: "BWP", symbol: "P", label: "Botswana Pula (BWP, P)", major: "Pula", majorPlural: "Pula", minor: "Thebe", minorPlural: "Thebe" },
  { code: "NAD", symbol: "N$", label: "Namibian Dollar (NAD, N$)", major: "Dollar", majorPlural: "Dollars", minor: "Cent", minorPlural: "Cents" },
  { code: "MZN", symbol: "MT", label: "Mozambican Metical (MZN, MT)", major: "Metical", majorPlural: "Meticais", minor: "Centavo", minorPlural: "Centavos" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KES, KSh)", major: "Shilling", majorPlural: "Shillings", minor: "Cent", minorPlural: "Cents" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (NGN, ₦)", major: "Naira", majorPlural: "Naira", minor: "Kobo", minorPlural: "Kobo" },
  { code: "AED", symbol: "AED", label: "UAE Dirham (AED)", major: "Dirham", majorPlural: "Dirhams", minor: "Fils", minorPlural: "Fils" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR, ₹)", major: "Rupee", majorPlural: "Rupees", minor: "Paisa", minorPlural: "Paise" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD, A$)", major: "Dollar", majorPlural: "Dollars", minor: "Cent", minorPlural: "Cents" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (CAD, C$)", major: "Dollar", majorPlural: "Dollars", minor: "Cent", minorPlural: "Cents" },
];

export const DEFAULT_CURRENCY = "SZL";

export const currencyFor = (code?: string | null): CurrencyOption =>
  CURRENCIES.find((c) => c.code === (code || DEFAULT_CURRENCY)) || CURRENCIES[0];

export const formatAmount = (value: number, code?: string | null) => {
  const c = currencyFor(code);
  const n = Number.isFinite(value) ? value : 0;
  return `${c.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Tax label varies by country — businesses can rename it (VAT, GST, Sales Tax…). */
export const TAX_LABELS = ["VAT", "GST", "Sales Tax", "Tax"];

export interface QuoteLine {
  id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  qty: number;
  rate: number;
  /** Per-line tax rate in percent. */
  tax_rate: number;
  /** Optional per-line discount in percent. */
  discount_pct?: number;
  unit?: string;
}

export interface QuoteDiscount {
  mode: "percent" | "fixed";
  value: number;
}

export interface QuoteCustomField {
  id: string;
  label: string;
  value: string;
}

export interface QuoteDoc {
  currency: string;
  tax_label: string;
  tax_inclusive: boolean;
  default_tax_rate: number;
  lines: QuoteLine[];
  discount?: QuoteDiscount;
  shipping?: number;
  custom_fields?: QuoteCustomField[];
  show_total_in_words?: boolean;
}

export const emptyLine = (taxRate = 0): QuoteLine => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  qty: 1,
  rate: 0,
  tax_rate: taxRate,
  discount_pct: 0,
});

export interface LineTotals {
  net: number;
  tax: number;
  gross: number;
}

export function lineTotals(line: QuoteLine, taxInclusive: boolean): LineTotals {
  const raw = (Number(line.qty) || 0) * (Number(line.rate) || 0);
  const afterDiscount = raw * (1 - (Number(line.discount_pct) || 0) / 100);
  const rate = (Number(line.tax_rate) || 0) / 100;
  if (taxInclusive) {
    const net = rate ? afterDiscount / (1 + rate) : afterDiscount;
    return { net, tax: afterDiscount - net, gross: afterDiscount };
  }
  const tax = afterDiscount * rate;
  return { net: afterDiscount, tax, gross: afterDiscount + tax };
}

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
}

export function quoteTotals(doc: QuoteDoc): QuoteTotals {
  const lines = doc.lines || [];
  const sums = lines.reduce(
    (acc, l) => {
      const t = lineTotals(l, !!doc.tax_inclusive);
      acc.subtotal += t.net;
      acc.tax += t.tax;
      return acc;
    },
    { subtotal: 0, tax: 0 },
  );
  const gross = sums.subtotal + sums.tax;
  const d = doc.discount;
  const discount = !d || !d.value ? 0 : d.mode === "percent" ? gross * (Number(d.value) || 0) / 100 : Number(d.value) || 0;
  const shipping = Number(doc.shipping) || 0;
  const total = Math.max(0, gross - discount + shipping);
  return { subtotal: round(sums.subtotal), tax: round(sums.tax), discount: round(discount), shipping: round(shipping), total: round(total) };
}

export const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const ONES = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` And ${chunkToWords(n % 100)}` : ""}`;
}

export function numberToWords(value: number): string {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return "Zero";
  const scales = [
    { v: 1_000_000_000, name: "Billion" },
    { v: 1_000_000, name: "Million" },
    { v: 1_000, name: "Thousand" },
  ];
  const parts: string[] = [];
  for (const s of scales) {
    if (n >= s.v) {
      parts.push(`${chunkToWords(Math.floor(n / s.v))} ${s.name}`);
      n %= s.v;
    }
  }
  if (n > 0) parts.push(chunkToWords(n));
  return parts.join(" ");
}

/** e.g. "Two Pounds And Forty Pence Only" */
export function amountInWords(value: number, code?: string | null): string {
  const c = currencyFor(code);
  const total = round(value);
  const major = Math.floor(total);
  const minor = Math.round((total - major) * 100);
  const majorName = major === 1 ? c.major : c.majorPlural;
  const minorName = minor === 1 ? c.minor : c.minorPlural;
  const head = `${numberToWords(major)} ${majorName}`;
  return minor ? `${head} And ${numberToWords(minor)} ${minorName} Only` : `${head} Only`;
}
