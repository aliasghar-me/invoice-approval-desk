"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Invoice, InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL, formatDateTime, formatMoney } from "@/lib/format";
import { useDecision } from "@/lib/use-decision";

interface Props {
  invoice: Invoice;
  next: { id: number; vendor: string } | null;
}

const BTN =
  "inline-flex h-9 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed";

/**
 * The decision panel. Approve is the screen's one primary. Both decisions are final, so each asks
 * once with the amount and vendor in words. Keys: A approve, R reject, Esc cancel.
 */
export function ReviewActions({ invoice, next }: Props) {
  const { decide, pending, error } = useDecision();
  const [confirming, setConfirming] = useState<InvoiceStatus | null>(null);
  const can = (to: InvoiceStatus) => invoice.allowedTransitions.includes(to);
  const amount = formatMoney(invoice.amountCents, invoice.currency);
  const what = `#${invoice.id} ${invoice.vendor}`;
  const decided = invoice.status === "approved" || invoice.status === "rejected";
  const blocked = invoice.approvalBlockedReason !== null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (k === "escape") setConfirming(null);
      else if (k === "a" && can("approved")) setConfirming("approved");
      else if (k === "r" && can("rejected")) setConfirming("rejected");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section aria-labelledby="decision-heading" className="rounded-lg border border-border bg-surface p-5">
      <h2 id="decision-heading" className="font-medium">
        Decision
      </h2>

      {decided && (
        <p className="mt-2 text-sm text-muted">
          {STATUS_LABEL[invoice.status]} on <span className="num">{formatDateTime(invoice.updatedAt)}</span>{" "}
          UTC. Decisions are final.
        </p>
      )}

      {invoice.status === "processing" && (
        <>
          <p className="mt-2 text-sm text-muted">
            Still being processed. Send it to review to approve or reject it.
          </p>
          <button
            type="button"
            disabled={pending || !can("needs_review")}
            onClick={() => decide(invoice.id, "needs_review", what)}
            className={`${BTN} mt-4 bg-primary text-white hover:bg-black disabled:opacity-60`}
          >
            {pending ? "Saving…" : "Send to review"}
          </button>
        </>
      )}

      {invoice.status === "needs_review" && !confirming && (
        <>
          {/* When approving would pay twice, rejecting is the job: it takes the primary. */}
          <div className={`mt-4 grid gap-2 ${blocked ? "[&>*:first-child]:order-2" : ""}`}>
            <button
              type="button"
              onClick={() => setConfirming("approved")}
              disabled={!can("approved")}
              aria-describedby={blocked ? "approve-blocked" : undefined}
              className={`${BTN} ${
                blocked
                  ? "border border-dashed border-control bg-surface text-muted"
                  : "bg-primary text-white hover:bg-black"
              }`}
            >
              Approve {amount}
            </button>
            <button
              type="button"
              onClick={() => setConfirming("rejected")}
              disabled={!can("rejected")}
              className={`${BTN} ${
                blocked ? "bg-primary text-white hover:bg-black" : "bg-raised text-ink hover:bg-active"
              }`}
            >
              {blocked ? "Reject duplicate" : "Reject"}
            </button>
          </div>
          {blocked && (
            <p
              id="approve-blocked"
              className="mt-3 rounded-md border border-warn-edge bg-warn-bg px-3 py-2 text-sm text-warn-ink"
            >
              Approve is off. {invoice.approvalBlockedReason}
            </p>
          )}
          <p className="mt-3 hidden text-xs text-muted md:block">
            Keyboard: <kbd className="font-sans font-medium text-ink">A</kbd> approve,{" "}
            <kbd className="font-sans font-medium text-ink">R</kbd> reject
          </p>
        </>
      )}

      {invoice.status === "needs_review" && confirming && (
        <div className="mt-3" role="group" aria-label="Confirm decision">
          <p className="text-sm">
            {confirming === "approved" ? "Approve" : "Reject"}{" "}
            <span className="num font-medium">{amount}</span> from {invoice.vendor}?{" "}
            <span className="text-muted">This can’t be undone.</span>
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => decide(invoice.id, confirming, what)}
              className={`${BTN} text-white ${
                confirming === "approved" ? "bg-primary hover:bg-black" : "bg-negative hover:bg-neg-ink"
              } disabled:opacity-60`}
            >
              {pending ? "Saving…" : confirming === "approved" ? "Confirm approve" : "Confirm reject"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(null)}
              className={`${BTN} text-muted hover:bg-raised hover:text-ink`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-neg-bg px-3 py-2 text-sm text-neg-ink" role="alert">
          {error}
        </p>
      )}

      {next && (
        <Link
          href={`/invoices/${next.id}`}
          className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-4 text-sm text-muted hover:text-ink"
        >
          <span>
            Next to review: <span className="font-medium text-ink">#{next.id} {next.vendor}</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
