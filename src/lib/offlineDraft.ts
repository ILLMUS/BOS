// Offline-tolerant drafts for job step forms.
// Field crews often fill steps with no signal — we keep the last edit in
// localStorage and push it up as soon as the connection returns.

const PREFIX = "rst.draft.stage.";

export interface StageDraft {
  stageId: string;
  jobId: string;
  formData: Record<string, any>;
  notes: string;
  savedAt: number;
  /** true once it has been written to the server */
  synced: boolean;
}

const key = (stageId: string) => `${PREFIX}${stageId}`;

export function readDraft(stageId: string): StageDraft | null {
  try {
    const raw = localStorage.getItem(key(stageId));
    return raw ? (JSON.parse(raw) as StageDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: StageDraft) {
  try {
    localStorage.setItem(key(draft.stageId), JSON.stringify(draft));
  } catch {
    /* quota / private mode — nothing we can do */
  }
}

export function clearDraft(stageId: string) {
  try {
    localStorage.removeItem(key(stageId));
  } catch {
    /* ignore */
  }
}

export function listPendingDrafts(): StageDraft[] {
  const out: StageDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const d = JSON.parse(raw) as StageDraft;
      if (!d.synced) out.push(d);
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function formatDraftAge(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}
