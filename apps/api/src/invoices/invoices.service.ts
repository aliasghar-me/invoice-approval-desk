import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type {
  Invoice,
  InvoiceDetail,
  InvoiceSummary,
  NewInvoice,
} from './invoice.types.js';
import {
  TRANSITIONS,
  canTransition,
  type InvoiceStatus,
} from './status-machine.js';

interface InvoiceRow {
  id: number;
  vendor: string;
  vendor_key: string;
  invoice_number: string;
  number_key: string;
  amount_cents: number;
  currency: string;
  invoice_date: string;
  status: InvoiceStatus;
  duplicate_of_id: number | null;
  created_at: string;
  updated_at: string;
  /** Another invoice in the same duplicate group that is already approved, if any. */
  approved_sibling_id: number | null;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

const SELECT_INVOICE = `
  SELECT i.*,
         (SELECT s.id FROM invoices s
           WHERE s.vendor_key = i.vendor_key AND s.number_key = i.number_key
             AND s.id <> i.id AND s.status = 'approved'
           ORDER BY s.id LIMIT 1) AS approved_sibling_id
    FROM invoices i`;

/** "ACME Office Supplies" and "Acme Office-Supplies" are the same vendor. */
export function vendorKeyOf(vendor: string): string {
  return vendor
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** "INV-1042", "inv 1042" and "INV1042" are the same invoice number. */
export function numberKeyOf(invoiceNumber: string): string {
  return invoiceNumber
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function conflict(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
    ...extra,
  });
}

function toInvoice(row: InvoiceRow): Invoice {
  const approvalBlocked = row.approved_sibling_id !== null;
  const canApprove = canTransition(row.status, 'approved');
  return {
    id: row.id,
    vendor: row.vendor,
    invoiceNumber: row.invoice_number,
    amountCents: row.amount_cents,
    currency: row.currency,
    invoiceDate: row.invoice_date,
    status: row.status,
    duplicateOfId: row.duplicate_of_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allowedTransitions: TRANSITIONS[row.status].filter(
      (to) => !(to === 'approved' && approvalBlocked),
    ),
    approvalBlockedReason:
      canApprove && approvalBlocked
        ? `Invoice #${row.approved_sibling_id} has the same vendor and invoice number and is already approved. Approving this one would pay it twice.`
        : null,
  };
}

@Injectable()
export class InvoicesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  list(statuses?: InvoiceStatus[]): Invoice[] {
    const filter = statuses?.length
      ? `WHERE i.status IN (${statuses.map(() => '?').join(', ')})`
      : '';
    const rows = this.db
      .prepare(
        `${SELECT_INVOICE} ${filter} ORDER BY i.invoice_date DESC, i.id DESC`,
      )
      .all(...(statuses ?? [])) as unknown as InvoiceRow[];
    return rows.map(toInvoice);
  }

  findOne(id: number): InvoiceDetail {
    const row = this.findRow(id);
    const group = this.db
      .prepare(
        `SELECT id, vendor, invoice_number, status FROM invoices
          WHERE vendor_key = ? AND number_key = ? AND id <> ?
          ORDER BY id`,
      )
      .all(row.vendor_key, row.number_key, id) as unknown as Pick<
      InvoiceRow,
      'id' | 'vendor' | 'invoice_number' | 'status'
    >[];

    return {
      ...toInvoice(row),
      duplicateGroup: group.map((g): InvoiceSummary => ({
        id: g.id,
        vendor: g.vendor,
        invoiceNumber: g.invoice_number,
        status: g.status,
      })),
    };
  }

  updateStatus(id: number, to: InvoiceStatus): InvoiceDetail {
    this.database.transaction(() => {
      const row = this.findRow(id);
      const from = row.status;

      if (from === to) {
        throw conflict('STATUS_UNCHANGED', `Invoice #${id} is already ${to}.`, {
          from,
          to,
        });
      }
      if (!canTransition(from, to)) {
        throw conflict(
          'INVALID_TRANSITION',
          `An invoice cannot move from ${from} to ${to}.`,
          {
            from,
            to,
            allowed: TRANSITIONS[from],
          },
        );
      }
      if (to === 'approved' && row.approved_sibling_id !== null) {
        throw conflict(
          'DUPLICATE_ALREADY_APPROVED',
          toInvoice(row).approvalBlockedReason!,
          {
            from,
            to,
            approvedInvoiceId: row.approved_sibling_id,
          },
        );
      }

      // The status guard makes this a compare-and-set: it only applies to the state we checked.
      const result = this.db
        .prepare(
          `UPDATE invoices SET status = ?, updated_at = ${NOW} WHERE id = ? AND status = ?`,
        )
        .run(to, id, from);
      if (result.changes !== 1) {
        throw conflict(
          'CONCURRENT_UPDATE',
          `Invoice #${id} changed while updating. Reload and try again.`,
        );
      }
    });
    return this.findOne(id);
  }

  /**
   * Adds an invoice the way an inbox/upload pipeline would. If the same vendor already
   * sent the same invoice number, it is linked to the oldest match and forced into
   * needs_review, so a person decides instead of it flowing through on its own.
   */
  ingest(input: NewInvoice): Invoice {
    const vendorKey = vendorKeyOf(input.vendor);
    const numberKey = numberKeyOf(input.invoiceNumber);

    const id = this.database.transaction(() => {
      const original = this.db
        .prepare(
          'SELECT id FROM invoices WHERE vendor_key = ? AND number_key = ? ORDER BY id LIMIT 1',
        )
        .get(vendorKey, numberKey) as { id: number } | undefined;

      const result = this.db
        .prepare(
          `INSERT INTO invoices
             (vendor, vendor_key, invoice_number, number_key, amount_cents, currency,
              invoice_date, status, duplicate_of_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.vendor.trim(),
          vendorKey,
          input.invoiceNumber.trim(),
          numberKey,
          input.amountCents,
          input.currency ?? 'USD',
          input.invoiceDate,
          original ? 'needs_review' : input.status,
          original?.id ?? null,
        );
      return Number(result.lastInsertRowid);
    });
    return toInvoice(this.findRow(id));
  }

  count(): number {
    const { n } = this.db
      .prepare('SELECT COUNT(*) AS n FROM invoices')
      .get() as { n: number };
    return n;
  }

  private findRow(id: number): InvoiceRow {
    const row = this.db.prepare(`${SELECT_INVOICE} WHERE i.id = ?`).get(id) as
      InvoiceRow | undefined;
    if (!row) throw new NotFoundException(`Invoice #${id} not found.`);
    return row;
  }
}
