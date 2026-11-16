import type { InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";

const TONE: Record<InvoiceStatus, string> = {
  processing: "bg-slate-100 text-slate-700 ring-slate-300",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-300",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  rejected: "bg-rose-50 text-rose-800 ring-rose-300",
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DuplicateBadge({ ofId }: { ofId: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-900 ring-1 ring-inset ring-orange-300">
      Possible duplicate of #{ofId}
    </span>
  );
}
