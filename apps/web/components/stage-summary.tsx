import type { Invoice, InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL, formatMoney, plural } from "@/lib/format";

// The money waiting for a decision is the screen's main data element and the only thing in the hue.
// The other stages are neutrals, darkest for money already committed.
const STAGES: { status: InvoiceStatus; fill: string }[] = [
  { status: "needs_review", fill: "var(--hue)" },
  { status: "processing", fill: "#9aa0a6" },
  { status: "approved", fill: "var(--primary)" },
  { status: "rejected", fill: "#d4d7dc" },
];

export function StageSummary({ invoices }: { invoices: Invoice[] }) {
  // One currency in the sample data; a mixed ledger would need a total per currency.
  const currency = invoices[0]?.currency ?? "USD";
  const total = invoices.reduce((sum, i) => sum + i.amountCents, 0);
  const stages = STAGES.map((s) => {
    const rows = invoices.filter((i) => i.status === s.status);
    return { ...s, count: rows.length, cents: rows.reduce((sum, i) => sum + i.amountCents, 0) };
  });
  const [review, ...rest] = stages;

  return (
    <section
      aria-labelledby="stage-heading"
      className="mt-6 grid gap-6 rounded-lg border border-border bg-surface p-5 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10 md:p-6"
    >
      <div>
        <h2 id="stage-heading" className="flex items-center gap-2 text-sm text-muted">
          <span className="size-2 rounded-full" style={{ background: review.fill }} aria-hidden="true" />
          Waiting for review
        </h2>
        <p className="num mt-1 text-[30px] font-bold leading-9 tracking-tight">
          {formatMoney(review.cents, currency)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {plural(review.count, "invoice")} of {formatMoney(total, currency)} received
        </p>
      </div>

      <div className="flex flex-col justify-end gap-4">
        <div
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={stages
            .map((s) => `${STATUS_LABEL[s.status]} ${formatMoney(s.cents, currency)}`)
            .join(", ")}
        >
          {stages
            .filter((s) => s.cents > 0)
            .map((s) => (
              <span
                key={s.status}
                className="h-full"
                style={{ width: `${(s.cents / total) * 100}%`, background: s.fill }}
              />
            ))}
        </div>
        <dl className="grid grid-cols-3 gap-4">
          {rest.map((s) => (
            <div key={s.status}>
              <dt className="flex items-center gap-2 text-sm text-muted">
                <span className="size-2 rounded-full" style={{ background: s.fill }} aria-hidden="true" />
                {STATUS_LABEL[s.status]}
              </dt>
              <dd className="num mt-1 text-base font-medium">{formatMoney(s.cents, currency)}</dd>
              <dd className="text-xs text-muted">{plural(s.count, "invoice")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
