import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface BaseFieldProps {
  label: string;
  required?: boolean;
  readOnly: boolean;
}

interface TextFieldProps extends BaseFieldProps {
  type: "text" | "email" | "tel" | "number" | "date" | "currency";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: "checkbox";
  checked: boolean;
  onChange: (val: boolean) => void;
  description?: string;
}

type StageFieldProps = TextFieldProps | TextareaFieldProps | SelectFieldProps | CheckboxFieldProps;

export default function StageField(props: StageFieldProps) {
  const { label, required, readOnly, type } = props;

  if (type === "checkbox") {
    const { checked, onChange, description } = props;
    return (
      <div className="flex items-start gap-3 rounded border border-border p-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onChange(!!v)}
          disabled={readOnly}
          id={label}
        />
        <div>
          <Label htmlFor={label} className="cursor-pointer">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    );
  }

  if (type === "select") {
    const { value, onChange, options } = props;
    return (
      <div className="space-y-1.5">
        <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
        <Select value={value || ""} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "textarea") {
    const { value, onChange, placeholder, rows } = props;
    return (
      <div className="space-y-1.5">
        <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          readOnly={readOnly}
          className={readOnly ? "bg-muted" : ""}
        />
      </div>
    );
  }

  // text, email, tel, number, date, currency
  const { value, onChange, placeholder } = props;
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <div className="relative">
        {type === "currency" && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">E</span>
        )}
        <Input
          type={type === "currency" ? "number" : type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`${readOnly ? "bg-muted" : ""} ${type === "currency" ? "pl-7" : ""}`}
          step={type === "currency" || type === "number" ? "0.01" : undefined}
        />
      </div>
    </div>
  );
}
