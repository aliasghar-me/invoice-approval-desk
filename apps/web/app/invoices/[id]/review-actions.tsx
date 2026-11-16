"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ApiError, updateInvoiceStatus, type InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";

interface Props {
  id: number;
  status: InvoiceStatus;
  allowedTransitions: InvoiceStatus[];
  approvalBlockedReason: string | null;
}

function disabledReason(status: InvoiceStatus, approvalBlockedReason: string | null, to: InvoiceStatus) {
  if (status === "processing") return "Still processing. Send it to review before deciding.";
  if (status === "approved" || status === "rejected")
    return `Already ${STATUS_LABEL[status].toLowerCase()}. Decisions are final.`;
  if (to === "approved" && approvalBlockedReason) return approvalBlockedReason;
  return null;
}

export function ReviewActions({ id, status, allowedTransitions, approvalBlockedReason }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const can = (to: InvoiceStatus) => allowedTransitions.includes(to);
  const reason =
    disabledReason(status, approvalBlockedReason, "approved") ??
    disabledReason(status, approvalBlockedReason, "rejected");

  function move(to: InvoiceStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await updateInvoiceStatus(id, to);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
      // Re-read from the API either way, so the page shows the stored state.
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Decision</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => move("approved")}
          disabled={pending || !can("approved")}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => move("rejected")}
          disabled={pending || !can("rejected")}
          className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Reject
        </button>
        {can("needs_review") && (
          <button
            type="button"
            onClick={() => move("needs_review")}
            disabled={pending}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Send to review
          </button>
        )}
      </div>

      {reason && <p className="mt-3 text-sm text-slate-600">{reason}</p>}
      {pending && <p className="mt-3 text-sm text-slate-500" role="status">Saving…</p>}
      {error && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
