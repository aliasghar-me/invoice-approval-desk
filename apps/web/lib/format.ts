import type { InvoiceStatus } from "./api";

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Invoice dates are calendar dates (YYYY-MM-DD); format in UTC so they never shift a day. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Whole days from a calendar date to now, for "how old is this invoice". */
export function ageInDays(date: string, now = new Date()): number {
  const start = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - start) / 86_400_000));
}

export function formatAge(date: string, now = new Date()): string {
  const days = ageInDays(date, now);
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  processing: "Processing",
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
};
