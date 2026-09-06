import StageField from "@/components/stages/StageField";
import FileUploadField from "@/components/stages/FileUploadField";
import { parseOptions, type SopFieldRow } from "@/lib/sopFields";

interface Props {
  fields: SopFieldRow[];
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  readOnly: boolean;
  jobId: string;
}

export default function DynamicStageForm({ fields, formData, onChange, readOnly, jobId }: Props) {
  const update = (key: string, value: any) => onChange({ ...formData, [key]: value });

  if (fields.length === 0) {
    return (
      <p className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">
        This step has no data fields — capture what happened in the notes below and approve to move on.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const common = { label: f.label, required: f.required, readOnly };
        if (f.field_type === "file") {
          return (
            <div key={f.id} className="space-y-1">
              <FileUploadField
                label={f.label}
                value={Array.isArray(formData[f.field_key]) ? formData[f.field_key] : []}
                onChange={(urls) => update(f.field_key, urls)}
                readOnly={readOnly}
                jobId={jobId}
                folder={f.field_key}
              />
              {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
            </div>
          );
        }
        if (f.field_type === "checkbox") {
          return (
            <StageField
              key={f.id}
              {...common}
              type="checkbox"
              checked={!!formData[f.field_key]}
              onChange={(v) => update(f.field_key, v)}
              description={f.help_text || undefined}
            />
          );
        }
        if (f.field_type === "select") {
          return (
            <div key={f.id} className="space-y-1">
              <StageField
                {...common}
                type="select"
                value={formData[f.field_key] || ""}
                onChange={(v) => update(f.field_key, v)}
                options={parseOptions(f.options).map((o) => ({ label: o, value: o }))}
              />
              {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
            </div>
          );
        }
        if (f.field_type === "textarea") {
          return (
            <div key={f.id} className="space-y-1">
              <StageField
                {...common}
                type="textarea"
                value={formData[f.field_key] || ""}
                onChange={(v) => update(f.field_key, v)}
                placeholder={f.placeholder || undefined}
                rows={4}
              />
              {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
            </div>
          );
        }
        return (
          <div key={f.id} className="space-y-1">
            <StageField
              {...common}
              type={f.field_type as "text" | "email" | "tel" | "number" | "date" | "currency"}
              value={formData[f.field_key] || ""}
              onChange={(v) => update(f.field_key, v)}
              placeholder={f.placeholder || undefined}
            />
            {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
          </div>
        );
      })}
    </div>
  );
}