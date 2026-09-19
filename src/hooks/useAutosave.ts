import { useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface Options<T> {
  /** The value to watch. Saved once it stops changing. */
  value: T;
  /** Runs the actual save. */
  onSave: (value: T) => Promise<void> | void;
  /** Skip saving (e.g. nothing changed, or required fields are empty). */
  enabled?: boolean;
  /** Quiet period before saving, in ms. */
  delay?: number;
}

/** Saves a form automatically a moment after the user stops typing. */
export function useAutosave<T>({ value, onSave, enabled = true, delay = 1200 }: Options<T>) {
  const [state, setState] = useState<AutosaveState>("idle");
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    setState("pending");
    const t = setTimeout(async () => {
      setState("saving");
      try {
        await saveRef.current(value);
        setState("saved");
      } catch {
        setState("error");
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled, delay]);

  return state;
}

/** Human wording for the autosave indicator. */
export function autosaveLabel(state: AutosaveState) {
  switch (state) {
    case "pending":
    case "saving":
      return "Saving…";
    case "saved":
      return "All changes saved";
    case "error":
      return "Could not save";
    default:
      return "";
  }
}

/** Keeps an unfinished form in this browser so it survives a reload. */
export function useDraft<T>(key: string, value: T, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable */
    }
  }, [key, value, enabled]);
}

export function readDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
