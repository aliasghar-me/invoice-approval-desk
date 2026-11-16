import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-border bg-surface px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-1 text-[15px] text-muted">There is no page at this address.</p>
      <Link href="/" className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-black">
        Back to invoices
      </Link>
    </div>
  );
}
