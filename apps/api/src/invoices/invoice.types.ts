import { z } from 'zod';
import { STATUSES, isStatus, type InvoiceStatus } from './status-machine.js';

export const updateStatusSchema = z.strictObject({ status: z.enum(STATUSES) });
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;

export const idParamSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/, 'id must be a positive integer')
  .transform(Number);

/** `?status=needs_review` or a comma list such as `?status=approved,rejected`. */
export const listQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (raw === undefined) return undefined;
      const parts = [...new Set(raw.split(',').map((s) => s.trim()))];
      const bad = parts.filter((s) => !isStatus(s));
      if (parts.length === 0 || bad.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown status "${bad.join(', ') || raw}"; expected one of ${STATUSES.join(', ')}`,
        });
        return z.NEVER;
      }
      return parts as InvoiceStatus[];
    }),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export interface NewInvoice {
  vendor: string;
  invoiceNumber: string;
  amountCents: number;
  currency?: string;
  invoiceDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
}

export interface InvoiceSummary {
  id: number;
  vendor: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}

export interface Invoice extends InvoiceSummary {
  amountCents: number;
  currency: string;
  invoiceDate: string;
  duplicateOfId: number | null;
  createdAt: string;
  updatedAt: string;
  /** Statuses the API will accept right now, after the duplicate rule. */
  allowedTransitions: InvoiceStatus[];
  /** Why approval is refused even though the status machine would allow it. */
  approvalBlockedReason: string | null;
}

export interface InvoiceDetail extends Invoice {
  /** Other invoices with the same vendor + invoice number, oldest first. */
  duplicateGroup: InvoiceSummary[];
}
