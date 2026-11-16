import Link from "next/link";
import { Suspense } from "react";
import { InvoiceTable } from "@/components/invoice-table";
import { listInvoices, type InvoiceStatus } from "@/lib/api";

const TABS = [
  {
    key: "processing",
    label: "Processing",
    statuses: ["processing"],
    empty: "Nothing is being processed.",
  },
  {
    key: "needs_review",
    label: "Needs review",
    statuses: ["needs_review"],
    empty: "Nothing waiting for review.",
  },
  {
    key: "done",
    label: "Approved / Rejected",
    statuses: ["approved", "rejected"],
    empty: "No decisions yet.",
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
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
      <p className="mt-1 text-sm text-slate-600">
        Open an invoice to approve or reject it.
      </p>
      <Suspense fallback={<TabsSkeleton />}>
        <InvoiceTabs searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InvoiceTabs({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { tab } = await searchParams;
  const active: Tab = TABS.find((t) => t.key === tab) ?? TABS[1];

  const [all, invoices] = await Promise.all([listInvoices(), listInvoices(active.statuses)]);
  const count = (t: Tab) =>
    all.filter((i) => (t.statuses as readonly InvoiceStatus[]).includes(i.status)).length;

  return (
    <>
      <nav aria-label="Invoice status" className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const selected = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={`/?tab=${t.key}`}
              aria-current={selected ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                selected
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-slate-100 px-2 text-xs tabular-nums text-slate-600">
                {count(t)}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4">
        <InvoiceTable invoices={invoices} empty={active.empty} />
      </div>
    </>
  );
}

function TabsSkeleton() {
  return (
    <div className="mt-6 animate-pulse" aria-busy="true" aria-label="Loading invoices">
      <div className="h-9 border-b border-slate-200" />
      <div className="mt-4 h-48 rounded-lg bg-slate-100" />
    </div>
  );
}
