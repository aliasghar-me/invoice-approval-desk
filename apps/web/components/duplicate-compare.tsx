import Link from "next/link";
import type { InvoiceDetail } from "@/lib/api";
import { STATUS_LABEL, formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "./status-pill";

// The same normalisation the API uses to detect duplicates (apps/api/src/invoices/invoices.service.ts).
const key = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

type Verdict = "same" | "same-spelled-differently" | "differs";

function compare(a: string, b: string): Verdict {
  if (a === b) return "same";
  return key(a) === key(b) ? "same-spelled-differently" : "differs";
}

const VERDICT: Record<Verdict, { text: string; className: string }> = {
  same: { text: "Same", className: "text-ink" },
  "same-spelled-differently": { text: "Same, written differently", className: "text-ink" },
  differs: { text: "Differs", className: "text-warn-ink font-medium" },
};

/** This invoice beside the one it repeats, field by field, so the reviewer can see why it was flagged. */
export function DuplicateCompare({
  invoice,
  others,
}: {
  invoice: InvoiceDetail;
  others: InvoiceDetail[];
}) {
  const [other, ...rest] = others;
  if (!other) return null;
  const isCopy = invoice.duplicateOfId !== null;

  const rows: { label: string; mine: React.ReactNode; theirs: React.ReactNode; verdict: Verdict }[] = [
    {
      label: "Vendor",
      mine: invoice.vendor,
      theirs: other.vendor,
      verdict: compare(invoice.vendor, other.vendor),
    },
    {
      label: "Invoice no.",
      mine: <span className="font-mono text-[13px]">{invoice.invoiceNumber}</span>,
      theirs: <span className="font-mono text-[13px]">{other.invoiceNumber}</span>,
      verdict: compare(invoice.invoiceNumber, other.invoiceNumber),
    },
    {
      label: "Amount",
      mine: <span className="num">{formatMoney(invoice.amountCents, invoice.currency)}</span>,
      theirs: <span className="num">{formatMoney(other.amountCents, other.currency)}</span>,
      verdict: invoice.amountCents === other.amountCents && invoice.currency === other.currency ? "same" : "differs",
    },
    {
      label: "Invoice date",
      mine: <span className="num">{formatDate(invoice.invoiceDate)}</span>,
      theirs: <span className="num">{formatDate(other.invoiceDate)}</span>,
      verdict: invoice.invoiceDate === other.invoiceDate ? "same" : "differs",
    },
  ];

  return (
    <section
      aria-labelledby="dup-heading"
      className="rounded-lg border border-warn-edge bg-surface"
    >
      <div className="border-b border-warn-edge bg-warn-bg px-5 py-4 text-warn-ink">
        <h2 id="dup-heading" className="font-medium">
          {isCopy ? `Possible duplicate of #${other.id}` : `Invoice #${other.id} repeats this one`}
        </h2>
        <p className="mt-1 text-sm">
          Same vendor and invoice number, compared after ignoring case, spaces and punctuation.
          Only one of them can be approved.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-border">
              <th className="h-10 px-5 font-normal">
                <span className="sr-only">Field</span>
              </th>
              <th className="h-10 px-3 font-normal">This invoice, #{invoice.id}</th>
              <th className="h-10 px-3 font-normal">
                <Link href={`/invoices/${other.id}`} className="text-ink underline underline-offset-4">
                  Invoice #{other.id}
                </Link>
              </th>
              <th className="h-10 px-5 font-normal">Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-rule">
                <th scope="row" className="px-5 py-2.5 font-normal text-muted">
                  {row.label}
                </th>
                <td className="px-3 py-2.5">{row.mine}</td>
                <td className="px-3 py-2.5">{row.theirs}</td>
                <td className={`px-5 py-2.5 ${VERDICT[row.verdict].className}`}>{VERDICT[row.verdict].text}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-2.5 font-normal text-muted">
                Status
              </th>
              <td className="px-3 py-2.5">
                <StatusPill status={invoice.status} />
              </td>
              <td className="px-3 py-2.5">
                <StatusPill status={other.status} />
              </td>
              <td className="px-5 py-2.5 text-muted">
                {other.status === "approved" ? "Already approved" : STATUS_LABEL[other.status]}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {rest.length > 0 && (
        <p className="border-t border-rule px-5 py-3 text-sm text-muted">
          Also matches{" "}
          {rest.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ", "}
              <Link href={`/invoices/${r.id}`} className="text-ink underline underline-offset-4">
                #{r.id}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}
