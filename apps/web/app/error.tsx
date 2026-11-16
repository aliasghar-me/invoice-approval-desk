"use client"; // Error boundaries must be Client Components

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="rounded-lg border border-border bg-surface px-6 py-10" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">Invoices didn’t load</h1>
      <p className="mt-1 flex items-center gap-2 text-[15px] text-muted">
        <span className="size-2 flex-none rounded-full bg-negative" aria-hidden="true" />
        {message}
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-black"
      >
        Try again
      </button>
    </div>
  );
}
