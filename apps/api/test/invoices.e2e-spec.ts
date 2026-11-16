import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Seed ids, in insertion order (see src/invoices/seed.service.ts).
const FERNHILL = 1; // approved
const NORTHWIND = 2; // rejected
const BLUE_HARBOR = 3; // needs_review
const SUMMIT = 4; // processing
const FERNHILL_DUPLICATE = 5; // duplicate of #1, forced to needs_review

async function startApp(dbPath: string): Promise<INestApplication<App>> {
  process.env.DB_PATH = dbPath;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configureApp(
    moduleRef.createNestApplication(),
  ) as INestApplication<App>;
  await app.init();
  return app;
}

describe('Invoices API', () => {
  let dir: string;
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'invoices-test-'));
    app = await startApp(join(dir, 'test.db'));
  });

  afterEach(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('GET /api/invoices', () => {
    it('lists the five seeded invoices', async () => {
      const res = await http().get('/api/invoices').expect(200);
      expect(res.body).toHaveLength(5);
      expect(res.body[0]).toMatchObject({
        id: expect.any(Number),
        vendor: expect.any(String),
        invoiceNumber: expect.any(String),
        amountCents: expect.any(Number),
        invoiceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        status: expect.any(String),
      });
    });

    it('filters by one status', async () => {
      const res = await http()
        .get('/api/invoices?status=needs_review')
        .expect(200);
      expect(res.body.map((i: { id: number }) => i.id).sort()).toEqual([
        BLUE_HARBOR,
        FERNHILL_DUPLICATE,
      ]);
    });

    it('filters by a comma list, which backs the Approved / Rejected tab', async () => {
      const res = await http()
        .get('/api/invoices?status=approved,rejected')
        .expect(200);
      expect(res.body.map((i: { id: number }) => i.id).sort()).toEqual([
        FERNHILL,
        NORTHWIND,
      ]);
    });

    it('rejects an unknown status filter with 400', async () => {
      await http().get('/api/invoices?status=paid').expect(400);
      await http().get('/api/invoices?status=approved,bogus').expect(400);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('returns the invoice with its allowed transitions', async () => {
      const res = await http().get(`/api/invoices/${BLUE_HARBOR}`).expect(200);
      expect(res.body).toMatchObject({
        id: BLUE_HARBOR,
        vendor: 'Blue Harbor Catering',
        status: 'needs_review',
        allowedTransitions: ['approved', 'rejected'],
        approvalBlockedReason: null,
        duplicateGroup: [],
      });
    });

    it('returns 404 for a missing invoice', async () => {
      await http().get('/api/invoices/999').expect(404);
    });

    it('returns 400 for a non-numeric id', async () => {
      await http().get('/api/invoices/abc').expect(400);
      await http().get('/api/invoices/0').expect(400);
    });
  });

  describe('PATCH /api/invoices/:id', () => {
    it('approves an invoice that needs review and stores it', async () => {
      const res = await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'approved' })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'approved',
        allowedTransitions: [],
      });

      const after = await http()
        .get(`/api/invoices/${BLUE_HARBOR}`)
        .expect(200);
      expect(after.body.status).toBe('approved');
    });

    it('rejects an invoice that needs review', async () => {
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'rejected' })
        .expect(200);
    });

    it('moves processing to needs_review', async () => {
      await http()
        .patch(`/api/invoices/${SUMMIT}`)
        .send({ status: 'needs_review' })
        .expect(200);
    });

    it('refuses to skip review (processing -> approved) with 409', async () => {
      const res = await http()
        .patch(`/api/invoices/${SUMMIT}`)
        .send({ status: 'approved' })
        .expect(409);
      expect(res.body).toMatchObject({
        code: 'INVALID_TRANSITION',
        from: 'processing',
        to: 'approved',
        allowed: ['needs_review'],
      });
    });

    it('refuses to leave a terminal status', async () => {
      for (const status of ['processing', 'needs_review', 'rejected']) {
        await http()
          .patch(`/api/invoices/${FERNHILL}`)
          .send({ status })
          .expect(409);
      }
      for (const status of ['processing', 'needs_review', 'approved']) {
        await http()
          .patch(`/api/invoices/${NORTHWIND}`)
          .send({ status })
          .expect(409);
      }
    });

    it('refuses setting the same status again', async () => {
      const res = await http()
        .patch(`/api/invoices/${FERNHILL}`)
        .send({ status: 'approved' })
        .expect(409);
      expect(res.body.code).toBe('STATUS_UNCHANGED');
    });

    it('rejects bad bodies with 400', async () => {
      await http().patch(`/api/invoices/${BLUE_HARBOR}`).send({}).expect(400);
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'paid' })
        .expect(400);
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'APPROVED' })
        .expect(400);
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'approved', amountCents: 1 })
        .expect(400);
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .set('Content-Type', 'application/json')
        .send('{not json')
        .expect(400);

      const after = await http()
        .get(`/api/invoices/${BLUE_HARBOR}`)
        .expect(200);
      expect(after.body.status).toBe('needs_review');
    });

    it('returns 404 when patching a missing invoice', async () => {
      await http()
        .patch('/api/invoices/999')
        .send({ status: 'approved' })
        .expect(404);
    });
  });

  describe('duplicate invoices', () => {
    it('links the duplicate to the original and sends it to review', async () => {
      const res = await http()
        .get(`/api/invoices/${FERNHILL_DUPLICATE}`)
        .expect(200);
      expect(res.body).toMatchObject({
        vendor: 'FERNHILL Office Supplies',
        invoiceNumber: 'INV 1042',
        status: 'needs_review',
        duplicateOfId: FERNHILL,
        allowedTransitions: ['rejected'],
        approvalBlockedReason: expect.stringContaining(`#${FERNHILL}`),
        duplicateGroup: [{ id: FERNHILL, status: 'approved' }],
      });

      const original = await http().get(`/api/invoices/${FERNHILL}`).expect(200);
      expect(original.body.duplicateGroup).toEqual([
        expect.objectContaining({ id: FERNHILL_DUPLICATE }),
      ]);
    });

    it('refuses to approve a duplicate of an approved invoice', async () => {
      const res = await http()
        .patch(`/api/invoices/${FERNHILL_DUPLICATE}`)
        .send({ status: 'approved' })
        .expect(409);
      expect(res.body).toMatchObject({
        code: 'DUPLICATE_ALREADY_APPROVED',
        approvedInvoiceId: FERNHILL,
      });
    });

    it('allows rejecting the duplicate', async () => {
      await http()
        .patch(`/api/invoices/${FERNHILL_DUPLICATE}`)
        .send({ status: 'rejected' })
        .expect(200);
    });
  });

  describe('persistence', () => {
    it('keeps a status change across a restart and does not re-seed', async () => {
      const dbPath = join(dir, 'test.db');
      await http()
        .patch(`/api/invoices/${BLUE_HARBOR}`)
        .send({ status: 'approved' })
        .expect(200);

      await app.close();
      app = await startApp(dbPath);

      const res = await http().get(`/api/invoices/${BLUE_HARBOR}`).expect(200);
      expect(res.body.status).toBe('approved');
      const all = await http().get('/api/invoices').expect(200);
      expect(all.body).toHaveLength(5);
    });
  });
});
