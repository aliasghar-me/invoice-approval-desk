import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { NewInvoice } from './invoice.types.js';
import { InvoicesService } from './invoices.service.js';

/**
 * Five sample invoices. The last one is the same Fernhill invoice as the first, typed
 * differently ("FERNHILL", "INV 1042"), and arrives after the first was already approved.
 * Ingest links it to #1 and sends it to needs_review, and the API refuses to approve it.
 */
export const SEED_INVOICES: NewInvoice[] = [
  {
    vendor: 'Fernhill Office Supplies',
    invoiceNumber: 'INV-1042',
    amountCents: 125_000,
    invoiceDate: '2026-10-02',
    status: 'approved',
  },
  {
    vendor: 'Northwind Logistics',
    invoiceNumber: 'NW-88213',
    amountCents: 478_050,
    invoiceDate: '2026-10-15',
    status: 'rejected',
  },
  {
    vendor: 'Blue Harbor Catering',
    invoiceNumber: 'BH-2026-117',
    amountCents: 86_500,
    invoiceDate: '2026-11-03',
    status: 'needs_review',
  },
  {
    vendor: 'Summit Cloud Hosting',
    invoiceNumber: 'SCH-55019',
    amountCents: 239_999,
    invoiceDate: '2026-11-10',
    status: 'processing',
  },
  {
    vendor: 'FERNHILL Office Supplies',
    invoiceNumber: 'INV 1042',
    amountCents: 125_000,
    invoiceDate: '2026-10-02',
    status: 'processing',
  },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly invoices: InvoicesService) {}

  // Seeds only an empty table, so a restart never undoes a status change.
  onModuleInit() {
    if (process.env.SEED === 'false' || this.invoices.count() > 0) return;
    for (const invoice of SEED_INVOICES) this.invoices.ingest(invoice);
    this.logger.log(`Seeded ${SEED_INVOICES.length} invoices`);
  }
}
