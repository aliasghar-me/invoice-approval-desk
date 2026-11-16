import Link from "next/link";
import type { Invoice } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { DuplicateBadge, StatusPill } from "./status-pill";

export function InvoiceTable({ invoices, empty }: { invoices: Invoice[]; empty: string }) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Vendor</th>
            <th className="px-4 py-3 font-medium">Invoice #</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="group relative hover:bg-slate-50">
              <td className="px-4 py-3">
                {/* The link's overlay makes the whole row clickable while keeping one tab stop. */}
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="font-medium text-slate-900 after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline"
                >
                  {invoice.vendor}
                </Link>
                {invoice.duplicateOfId !== null && (
                  <div className="mt-1">
                    <DuplicateBadge ofId={invoice.duplicateOfId} />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-slate-700">{invoice.invoiceNumber}</td>
              <td className="px-4 py-3 text-slate-700">{formatDate(invoice.invoiceDate)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                {formatMoney(invoice.amountCents, invoice.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
