import type { InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";

// Pale pairs: the tint with the dark of the same hue. Processing is neutral, it needs nobody yet.
const TONE: Record<InvoiceStatus, string> = {
  processing: "bg-neutral-bg text-neutral-ink",
  needs_review: "bg-warn-bg text-warn-ink",
  approved: "bg-pos-bg text-pos-ink",
  rejected: "bg-neg-bg text-neg-ink",
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex h-5 flex-none items-center whitespace-nowrap rounded-full px-2 text-xs font-medium ${TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DuplicateTag({ ofId }: { ofId: number }) {
  return (
    <span className="inline-flex h-5 flex-none items-center whitespace-nowrap rounded-full border border-warn-edge bg-warn-bg px-2 text-xs font-medium text-warn-ink">
      Repeats #{ofId}
    </span>
  );
}
