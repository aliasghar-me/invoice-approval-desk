import Link from "next/link";
import type { Invoice } from "@/lib/api";
import { formatAge, formatDateTime, formatMoney } from "@/lib/format";
import { RowActions } from "./row-actions";
import { DuplicateTag, StatusPill } from "./status-pill";

interface Props {
  invoices: Invoice[];
  /** Status column only where the view mixes statuses (Approved / Rejected). */
  showStatus: boolean;
  empty: string;
}

/**
 * Desktop: a table of rules and alignment. Phone: two-line rows, identity and amount on line 1,
 * the other fields on line 2, the action under them. The whole row opens the invoice.
 */
export function InvoiceTable({ invoices, showStatus, empty }: Props) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-control px-6 py-10 text-center text-muted">
        {empty}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <table className="hidden w-full text-left md:table">
        <thead className="text-xs text-muted">
          <tr className="border-b border-border">
            <th className="h-10 px-5 font-normal">Vendor</th>
            <th className="h-10 px-3 font-normal">Invoice no.</th>
            <th className="h-10 px-3 text-right font-normal">Invoice date</th>
            <th className="h-10 px-3 text-right font-normal">Amount</th>
            {showStatus && <th className="h-10 px-3 font-normal">Status</th>}
            <th className="h-10 px-5 text-right font-normal">
              <span className="sr-only">Actions</span>
              {showStatus ? "Decided" : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="relative border-b border-rule last:border-0 hover:bg-ground/60 has-[a:focus-visible]:bg-ground/60"
            >
              <td className="px-5 py-3">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="font-medium text-ink outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {invoice.vendor}
                </Link>
                {invoice.duplicateOfId !== null && invoice.status === "needs_review" && (
                  <div className="mt-1">
                    <DuplicateTag ofId={invoice.duplicateOfId} />
                  </div>
                )}
              </td>
              <td className="px-3 py-3 font-mono text-[13px] text-muted">{invoice.invoiceNumber}</td>
              <td className="num px-3 py-3 text-right">
                <div>{invoice.invoiceDate}</div>
                <div className="text-xs text-muted">{formatAge(invoice.invoiceDate)}</div>
              </td>
              <td className="num px-3 py-3 text-right font-medium">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </td>
              {showStatus && (
                <td className="px-3 py-3">
                  <StatusPill status={invoice.status} />
                </td>
              )}
              <td className="px-5 py-3 text-right">
                {showStatus ? (
                  <span className="num text-muted">{formatDateTime(invoice.updatedAt)}</span>
                ) : (
                  <RowActions invoice={invoice} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-rule md:hidden">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="relative px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={`/invoices/${invoice.id}`}
                className="truncate font-medium text-ink after:absolute after:inset-0 after:content-['']"
              >
                {invoice.vendor}
              </Link>
              <span className="num flex-none font-medium">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              <span className="font-mono">{invoice.invoiceNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="num">{invoice.invoiceDate}</span>
              {showStatus && <StatusPill status={invoice.status} />}
              {invoice.duplicateOfId !== null && invoice.status === "needs_review" && (
                <DuplicateTag ofId={invoice.duplicateOfId} />
              )}
            </div>
            {!showStatus && (
              <div className="mt-2 flex justify-start">
                <RowActions invoice={invoice} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
