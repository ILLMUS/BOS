import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReconcileReport } from "@/lib/jobReconcile";

/**
 * Raises an immediate alert for finance owners whenever a job's quote,
 * invoice, receipt and payment figures stop agreeing. The database side
 * de-duplicates, so repeat renders never spam anyone.
 */
export function useMismatchAlerts(report: ReconcileReport, ready: boolean) {
  const sent = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ready) return;
    const urgent = report.rows.filter((r) => r.status === "error" || r.status === "warning");

    urgent.forEach(async (row) => {
      const detail = row.flags
        .filter((f) => f.severity === "error" || f.severity === "warning")
        .map((f) => f.detail)
        .join(" ");
      const key = `${row.jobId}:${detail}`;
      if (sent.current.has(key)) return;
      sent.current.add(key);

      await supabase.rpc("notify_finance_mismatch", {
        _job_id: row.jobId,
        _title: `Money mismatch on ${row.jobNumber}`,
        _message: `${row.clientName}: ${detail}`,
      });
    });
  }, [report, ready]);
}
