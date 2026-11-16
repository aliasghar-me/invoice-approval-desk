"use client"; // Error boundaries must be Client Components

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900" role="alert">
      <p className="font-medium">Could not load invoices.</p>
      <p className="mt-1">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 rounded-md bg-rose-700 px-3 py-1.5 font-medium text-white hover:bg-rose-800"
      >
        Try again
      </button>
    </div>
  );
}
