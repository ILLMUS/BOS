import StageField from "./StageField";
import FileUploadField from "./FileUploadField";
import type { StageFormProps } from "./types";

export default function FabInstallForm({ formData, onChange, readOnly, jobId }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Track production progress and installation completion.</p>
      <StageField type="select" label="Production Status" required readOnly={readOnly}
        value={formData.fab_status || ""} onChange={(v) => update("fab_status", v)}
        options={[
          { label: "Not Started", value: "not_started" },
          { label: "In Progress", value: "in_progress" },
          { label: "Completed", value: "completed" },
          { label: "On Hold", value: "on_hold" },
        ]}
      />
      <StageField type="date" label="Production Completion Date" readOnly={readOnly}
        value={formData.fab_completion_date || ""} onChange={(v) => update("fab_completion_date", v)}
      />
      <StageField type="date" label="Scheduled Installation Date" required readOnly={readOnly}
        value={formData.install_date || ""} onChange={(v) => update("install_date", v)}
      />
      <StageField type="select" label="Installation Status" required readOnly={readOnly}
        value={formData.install_status || ""} onChange={(v) => update("install_status", v)}
        options={[
          { label: "Not Started", value: "not_started" },
          { label: "In Progress", value: "in_progress" },
          { label: "Completed", value: "completed" },
          { label: "Rework Required", value: "rework" },
        ]}
      />
      <StageField type="number" label="Installation Team Size" readOnly={readOnly}
        value={formData.install_team_size || ""} onChange={(v) => update("install_team_size", v)}
        placeholder="Number of installers"
      />
      <FileUploadField label="Progress & Completion Photos" readOnly={readOnly} jobId={jobId} folder="fabrication-install"
        value={formData.install_photos || []} onChange={(v) => update("install_photos", v)}
        accept="image/*"
      />
      <StageField type="textarea" label="Installation Notes" readOnly={readOnly}
        value={formData.install_notes || ""} onChange={(v) => update("install_notes", v)}
        placeholder="Quality issues, client observations, snag items..."
        rows={4}
      />
    </div>
  );
}
