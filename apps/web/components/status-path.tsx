import type { InvoiceStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";

/** The status machine drawn for one invoice: where it is, what came before, what can come next. */
export function StatusPath({ status }: { status: InvoiceStatus }) {
  const decided = status === "approved" || status === "rejected";
  const steps = [
    { label: "Processing", note: "Captured and read", state: stepState(0) },
    { label: "Needs review", note: "A person checks it", state: stepState(1) },
    {
      label: decided ? STATUS_LABEL[status] : "Approved or rejected",
      note: decided ? "Final, cannot be reopened" : "Final decision",
      state: stepState(2),
    },
  ];

  function stepState(index: number): "done" | "current" | "next" {
    const at = status === "processing" ? 0 : status === "needs_review" ? 1 : 2;
    return index < at ? "done" : index === at ? "current" : "next";
  }

  return (
    <section aria-labelledby="path-heading" className="rounded-lg border border-border bg-surface p-5">
      <h2 id="path-heading" className="font-medium">
        Status path
      </h2>
      <ol className="mt-4 grid grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`grid size-5 flex-none place-items-center rounded-full ${
                  step.state === "done"
                    ? "bg-primary text-white"
                    : step.state === "current"
                      ? "bg-hue text-white"
                      : "border border-control bg-surface"
                }`}
              >
                {step.state === "done" && (
                  <svg viewBox="0 0 12 12" className="size-3">
                    <path d="M2.5 6.2l2.2 2.2 4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {step.state === "current" && <span className="size-1.5 rounded-full bg-white" />}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 ${step.state === "done" ? "bg-primary" : "bg-control"}`}
                />
              )}
            </div>
            <p className={`mt-2 text-sm ${step.state === "next" ? "text-muted" : "font-medium text-ink"}`}>
              {step.label}
            </p>
            <p className="text-xs text-muted">{step.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
