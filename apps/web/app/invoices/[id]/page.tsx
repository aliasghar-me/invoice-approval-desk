import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DuplicateCompare } from "@/components/duplicate-compare";
import { StatusPath } from "@/components/status-path";
import { StatusPill } from "@/components/status-pill";
import {
  ApiError,
  getInvoice,
  listInvoices,
  type InvoiceDetail,
  type InvoiceStatus,
} from "@/lib/api";
import { formatAge, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { ReviewActions } from "./review-actions";

const TAB_OF: Record<InvoiceStatus, string> = {
  processing: "processing",
  needs_review: "needs_review",
  approved: "done",
  rejected: "done",
};

export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InvoiceDetailView params={params} />
    </Suspense>
  );
}

async function InvoiceDetailView({ params }: Pick<PageProps<"/invoices/[id]">, "params">) {
  const { id } = await params;
  let invoice: InvoiceDetail;
  try {
    invoice = await getInvoice(id);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }

  const [others, queue] = await Promise.all([
    Promise.all(invoice.duplicateGroup.map((g) => getInvoice(g.id))),
    listInvoices(["needs_review"]),
  ]);
  const nextInQueue = queue.find((i) => i.id !== invoice.id);

  return (
    <article>
      <Link
        href={`/?tab=${TAB_OF[invoice.status]}`}
        className="text-sm text-muted hover:text-ink"
      >
        ← Invoices
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{invoice.vendor}</h1>
        <StatusPill status={invoice.status} />
      </header>
      <p className="mt-1 text-[15px] text-muted">
        Invoice <span className="font-mono text-[14px] text-ink">{invoice.invoiceNumber}</span> · #
        {invoice.id} in this desk
      </p>

      <div className="mt-6 grid grid-flow-row-dense grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section
          aria-labelledby="details-heading"
          className="rounded-lg border border-border bg-surface p-5 lg:col-start-1"
        >
          <h2 id="details-heading" className="text-sm text-muted">
            Amount due
          </h2>
          <p className="num mt-1 text-[30px] font-bold leading-9 tracking-tight">
            {formatMoney(invoice.amountCents, invoice.currency)}
            <span className="ml-2 text-sm font-normal text-muted">{invoice.currency}</span>
          </p>
          <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
            <Row label="Vendor">{invoice.vendor}</Row>
            <Row label="Invoice no.">
              <span className="font-mono text-[13px]">{invoice.invoiceNumber}</span>
            </Row>
            <Row label="Invoice date">
              <span className="num">{formatDate(invoice.invoiceDate)}</span>
              <span className="ml-2 text-muted">{formatAge(invoice.invoiceDate)}</span>
            </Row>
            <Row label="Received">
              <span className="num">{formatDateTime(invoice.createdAt)}</span>
            </Row>
            <Row label="Last status change">
              <span className="num">{formatDateTime(invoice.updatedAt)}</span>
            </Row>
            <Row label="Times shown in">UTC</Row>
          </dl>
        </section>

        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <ReviewActions
            key={invoice.status} // a new status resets any open confirmation
            invoice={invoice}
            next={nextInQueue ? { id: nextInQueue.id, vendor: nextInQueue.vendor } : null}
          />
        </div>

        <div className="lg:col-start-1">
          <StatusPath status={invoice.status} />
        </div>

        {others.length > 0 && (
          <div className="lg:col-start-1">
            <DuplicateCompare invoice={invoice} others={others} />
          </div>
        )}
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-rule py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading invoice">
      <div className="h-5 w-24 rounded bg-raised" />
      <div className="mt-3 h-8 w-72 rounded bg-raised" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-72 rounded-lg border border-border bg-surface" />
        <div className="h-48 rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
