export type SopFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "email"
  | "tel"
  | "select"
  | "checkbox"
  | "file";

export const FIELD_TYPE_OPTIONS: { value: SopFieldType; label: string; hint: string }[] = [
  { value: "text", label: "Short text", hint: "One-line answer" },
  { value: "textarea", label: "Long text", hint: "Paragraph / notes" },
  { value: "number", label: "Number", hint: "Quantities, counts" },
  { value: "currency", label: "Money", hint: "Amounts" },
  { value: "date", label: "Date", hint: "Calendar date" },
  { value: "email", label: "Email", hint: "Email address" },
  { value: "tel", label: "Phone", hint: "Phone number" },
  { value: "select", label: "Dropdown", hint: "Pick one option" },
  { value: "checkbox", label: "Yes / No", hint: "Confirmation tick" },
  { value: "file", label: "File upload", hint: "Photos, PDFs, docs" },
];

export function slugifyKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field"
  );
}

export interface SopFieldRow {
  id: string;
  stage_id: string;
  position: number;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: any;
}

export function parseOptions(options: any): string[] {
  if (Array.isArray(options)) return options.map((o) => String(o));
  return [];
}