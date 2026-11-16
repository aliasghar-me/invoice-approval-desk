import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DuplicateBadge, StatusPill } from "@/components/status-pill";
import { ApiError, getInvoice, type InvoiceDetail } from "@/lib/api";
import { STATUS_LABEL, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { ReviewActions } from "./review-actions";

export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <>
      <Link href="/?tab=needs_review" className="text-sm text-slate-600 hover:text-slate-900">
        ← All invoices
      </Link>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-lg bg-slate-100" />}>
        <InvoiceDetailView params={params} />
      </Suspense>
    </>
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

  return (
    <article className="mt-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Invoice #{invoice.id}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{invoice.vendor}</h1>
        </div>
        <StatusPill status={invoice.status} />
      </header>

      {invoice.duplicateGroup.length > 0 && <DuplicateNotice invoice={invoice} />}

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Invoice number">
          <span className="font-mono">{invoice.invoiceNumber}</span>
        </Field>
        <Field label="Amount">
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(invoice.amountCents, invoice.currency)}
          </span>
        </Field>
        <Field label="Invoice date">{formatDate(invoice.invoiceDate)}</Field>
        <Field label="Last status change">{formatDateTime(invoice.updatedAt)}</Field>
      </dl>

      <ReviewActions
        id={invoice.id}
        status={invoice.status}
        allowedTransitions={invoice.allowedTransitions}
        approvalBlockedReason={invoice.approvalBlockedReason}
      />
    </article>
  );
}

function DuplicateNotice({ invoice }: { invoice: InvoiceDetail }) {
  const isLaterCopy = invoice.duplicateOfId !== null;
  return (
    <section className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950">
      <div className="flex flex-wrap items-center gap-2">
        {isLaterCopy ? (
          <DuplicateBadge ofId={invoice.duplicateOfId!} />
        ) : (
          <span className="font-medium">This invoice has a later copy.</span>
        )}
      </div>
      <p className="mt-2">
        Same vendor and invoice number as:{" "}
        {invoice.duplicateGroup.map((other, i) => (
          <span key={other.id}>
            {i > 0 && ", "}
            <Link href={`/invoices/${other.id}`} className="font-medium underline">
              #{other.id} {other.invoiceNumber}
            </Link>{" "}
            ({STATUS_LABEL[other.status].toLowerCase()})
          </span>
        ))}
        . Only one of them can be approved.
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}
