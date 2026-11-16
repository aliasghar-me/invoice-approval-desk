"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/toaster";
import { ApiError, updateInvoiceStatus, type InvoiceStatus } from "./api";
import { STATUS_LABEL } from "./format";

/** PATCHes one invoice's status, announces the result, and re-reads the page from the API. */
export function useDecision() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(id: number, to: InvoiceStatus, what: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateInvoiceStatus(id, to);
        toast(`${STATUS_LABEL[to]}: ${what}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
        setError(message);
        toast(message, "error");
      }
      // Either way, show what the API now has stored.
      router.refresh();
    });
  }

  return { decide, pending, error };
}
