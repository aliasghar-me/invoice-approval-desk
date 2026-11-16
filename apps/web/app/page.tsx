import Link from "next/link";
import { Suspense } from "react";
import { InvoiceTable } from "@/components/invoice-table";
import { StageSummary } from "@/components/stage-summary";
import { listInvoices, type Invoice, type InvoiceStatus } from "@/lib/api";
import { ageInDays, formatMoney, plural } from "@/lib/format";

const TABS = [
  {
    key: "processing",
    label: "Processing",
    statuses: ["processing"],
    empty: "Nothing is being processed. New invoices land here before review.",
  },
  {
    key: "needs_review",
    label: "Needs review",
    statuses: ["needs_review"],
    empty: "The review queue is clear.",
  },
  {
    key: "done",
    label: "Approved / Rejected",
    statuses: ["approved", "rejected"],
    empty: "No invoices have been decided yet.",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  statuses: readonly InvoiceStatus[];
  empty: string;
}[];

type Tab = (typeof TABS)[number];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
      <Suspense fallback={<ListSkeleton />}>
        <InvoiceDesk searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InvoiceDesk({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { tab } = await searchParams;
  const active: Tab = TABS.find((t) => t.key === tab) ?? TABS[1];

  // All invoices for the summary and tab counts; the active tab uses the API's own ?status= filter.
  const [all, invoices] = await Promise.all([listInvoices(), listInvoices(active.statuses)]);
  const count = (t: Tab) =>
    all.filter((i) => (t.statuses as readonly InvoiceStatus[]).includes(i.status)).length;

  return (
    <>
      <Finding invoices={all} />
      <StageSummary invoices={all} />

      <nav
        aria-label="Invoice status"
        className="mt-8 flex gap-4 overflow-x-auto border-b border-border text-[13px] sm:gap-6 sm:text-sm"
      >
        {TABS.map((t) => {
          const selected = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={`/?tab=${t.key}`}
              scroll={false}
              aria-current={selected ? "page" : undefined}
              className={`-mb-px flex h-10 flex-none items-center gap-1.5 border-b-2 transition-colors ${
                selected
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span className="num text-muted">{count(t)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <InvoiceTable invoices={invoices} showStatus={active.key === "done"} empty={active.empty} />
      </div>
    </>
  );
}

/** The one fact that most needs attention, read first under the title, next to its action. */
function Finding({ invoices }: { invoices: Invoice[] }) {
  const queue = invoices.filter((i) => i.status === "needs_review");
  const blocked = queue.find((i) => i.approvalBlockedReason);

  if (blocked) {
    return (
      <p className="mt-1 text-[15px] text-muted">
        Invoice #{blocked.id} from {blocked.vendor} repeats #{blocked.duplicateOfId}, which is
        already approved. Reject it so {formatMoney(blocked.amountCents, blocked.currency)} isn’t
        paid twice.{" "}
        <Link href={`/invoices/${blocked.id}`} className="font-medium text-ink underline underline-offset-4">
          Open #{blocked.id}
        </Link>
      </p>
    );
  }
  if (queue.length > 0) {
    const oldest = Math.max(...queue.map((i) => ageInDays(i.invoiceDate)));
    return (
      <p className="mt-1 text-[15px] text-muted">
        {plural(queue.length, "invoice")} waiting for review; the oldest is dated {oldest} days ago.
      </p>
    );
  }
  return <p className="mt-1 text-[15px] text-muted">Nothing is waiting for review.</p>;
}

/** The final layout with flat bars at the real sizes, so nothing moves when the data lands. */
function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading invoices">
      <div className="mt-2 h-5 w-2/3 rounded bg-raised" />
      <div className="mt-6 h-[118px] rounded-lg border border-border bg-surface" />
      <div className="mt-8 h-10 border-b border-border" />
      <div className="mt-4 h-64 rounded-lg border border-border bg-surface" />
    </div>
  );
}
