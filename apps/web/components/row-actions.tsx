"use client";

import { useState } from "react";
import type { Invoice, InvoiceStatus } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useDecision } from "@/lib/use-decision";

const BTN =
  "relative z-10 inline-flex h-8 flex-none items-center rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed";

/**
 * The row's own job, in a fixed trailing column: decide from the queue without opening the
 * invoice. Approve and Reject are final, so each asks once in place before it sends.
 */
export function RowActions({ invoice }: { invoice: Invoice }) {
  const { decide, pending } = useDecision();
  const [confirming, setConfirming] = useState<InvoiceStatus | null>(null);
  const can = (to: InvoiceStatus) => invoice.allowedTransitions.includes(to);
  const what = `#${invoice.id} ${invoice.vendor}`;
  const amount = formatMoney(invoice.amountCents, invoice.currency);

  if (confirming) {
    return (
      <div
        className="relative z-10 flex items-center justify-end gap-2"
        onKeyDown={(e) => e.key === "Escape" && setConfirming(null)}
      >
        <span className="hidden text-sm text-muted lg:inline">
          {confirming === "approved" ? "Approve" : "Reject"} {amount}?
        </span>
        <button
          type="button"
          autoFocus
          disabled={pending}
          onClick={() => decide(invoice.id, confirming, what)}
          className={`${BTN} ${
            confirming === "approved"
              ? "bg-primary text-white hover:bg-black"
              : "bg-negative text-white hover:bg-neg-ink"
          }`}
        >
          {pending ? "Saving…" : confirming === "approved" ? "Confirm approve" : "Confirm reject"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(null)}
          className={`${BTN} text-muted hover:text-ink`}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (invoice.status === "needs_review") {
    return (
      <div className="relative z-10 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming("approved")}
          disabled={!can("approved")}
          title={invoice.approvalBlockedReason ?? undefined}
          aria-label={`Approve ${what}`}
          className={`${BTN} border border-control bg-surface text-ink hover:border-ink disabled:border-border disabled:text-muted disabled:hover:border-border`}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setConfirming("rejected")}
          disabled={!can("rejected")}
          aria-label={`Reject ${what}`}
          className={`${BTN} text-ink hover:bg-raised`}
        >
          Reject
        </button>
      </div>
    );
  }

  if (invoice.status === "processing") {
    return (
      <div className="relative z-10 flex justify-end">
        <button
          type="button"
          disabled={pending || !can("needs_review")}
          onClick={() => decide(invoice.id, "needs_review", what)}
          className={`${BTN} border border-control bg-surface text-ink hover:border-ink`}
        >
          {pending ? "Saving…" : "Send to review"}
        </button>
      </div>
    );
  }

  return null;
}
