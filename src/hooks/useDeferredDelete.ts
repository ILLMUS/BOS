import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** How long the user has to undo a delete before it becomes permanent. */
export const UNDO_WINDOW_MS = 10_000;

export interface DeferredDeleteOptions {
  /** Unique id of the thing being deleted (prevents duplicate timers). */
  id: string;
  /** What to show in the undo message, e.g. "Q3 outreach". */
  label: string;
  /** Wording of the message, defaults to `"<label>" moved to trash`. */
  message?: string;
  /** Hide it from the screen straight away (or mark it as trashed). */
  onRemove: () => void | Promise<void>;
  /** Put it back exactly as it was when the user taps Undo. */
  onRestore: () => void | Promise<void>;
  /** Delete it for good once the undo window closes. */
  onCommit: () => void | Promise<void>;
}

/**
 * Deletes with a 10 second grace period: the item disappears immediately,
 * an undo message stays on screen, and the permanent delete only runs
 * when nobody acts on it.
 */
export function useDeferredDelete() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const remove = useCallback(async (opts: DeferredDeleteOptions) => {
    const existing = timers.current.get(opts.id);
    if (existing) clearTimeout(existing);

    await opts.onRemove();

    let undone = false;
    const timer = setTimeout(async () => {
      timers.current.delete(opts.id);
      if (undone) return;
      try {
        await opts.onCommit();
      } catch {
        toast.error("Could not finish deleting", { description: opts.label });
      }
    }, UNDO_WINDOW_MS);
    timers.current.set(opts.id, timer);

    toast(opts.message ?? `“${opts.label}” moved to trash`, {
      description: "Deleted for good in 10 seconds.",
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          timers.current.delete(opts.id);
          void Promise.resolve(opts.onRestore()).then(() =>
            toast.success(`“${opts.label}” restored`),
          );
        },
      },
    });
  }, []);

  return { remove };
}
