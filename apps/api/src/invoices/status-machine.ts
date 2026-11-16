export const STATUSES = [
  'processing',
  'needs_review',
  'approved',
  'rejected',
] as const;
export type InvoiceStatus = (typeof STATUSES)[number];

/**
 * The only legal moves. Anything not listed is refused by the API with 409.
 *
 * processing   -> needs_review        capture/extraction finished, a person must look at it
 * needs_review -> approved | rejected the one human decision point
 * approved, rejected                  terminal: an approved invoice may already be paid,
 *                                     so there is no reopen or undo
 */
export const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  processing: ['needs_review'],
  needs_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

export function isStatus(value: string): value is InvoiceStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
