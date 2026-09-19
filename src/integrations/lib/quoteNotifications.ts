import { supabase } from "@/integrations/supabase/client";

export type QuoteEvent = "ready_for_approval" | "rejected" | "sent";

/**
 * Alerts the quotation step's assigned owners plus every manager and board
 * member in the workspace. Best-effort: the database de-duplicates (12h) and
 * skips the person who triggered the event, so callers never need to guard.
 */
export async function notifyQuoteEvent(
  jobId: string,
  event: QuoteEvent,
  title: string,
  message: string,
) {
  try {
    await (supabase.rpc as CallableFunction)("notify_quote_event", {
      _job_id: jobId,
      _event: event,
      _title: title,
      _message: message,
    });
  } catch {
    // Notifications must never block the underlying action.
  }
}
