# Invoice Approval Desk

A small web app where a team reviews invoices: a list split into **Processing**, **Needs review** and **Approved / Rejected**, and a detail page with **Approve** and **Reject**.

- **Web:** Next.js 16 (App Router, TypeScript, Tailwind), port **3000**
- **API:** NestJS 12 (TypeScript), port **3001**
- **Database:** SQLite through Node's built-in `node:sqlite`. The file is `apps/api/data/invoices.db`.
- **Tests:** Vitest + supertest against the real app and a real SQLite file

The schema, the status model, the duplicate rule and what was left out are in **[docs/DESIGN.md](docs/DESIGN.md)**.

Live demo: **https://invoices.aliasghar.me**

## The UI

**List screen**
- **First line:** the one fact that needs attention. For the sample data, that's the duplicate that would be paid twice, with a link to it.
- **Money by stage:** the amount waiting for review is the largest figure. A bar shows how all money received splits across the four statuses.
- **Tabs and counts:** the three tabs carry counts, and each view comes from the API's `?status=` filter.
- **Deciding in place:** Needs-review rows have Approve and Reject buttons, each with a confirmation step. A duplicate whose original is already approved has Approve disabled.

**Detail screen**
- **Decision panel:** the primary action is the one the invoice needs. For a blocked duplicate that is **Reject duplicate**, with Approve disabled and the reason shown.
- **Keyboard:** <kbd>A</kbd> approves, <kbd>R</kbd> rejects and <kbd>Esc</kbd> cancels.
- **After a decision:** a link to the next invoice waiting for review.
- **Status path:** a drawing of where the invoice is in the status flow.
- **Duplicate comparison:** for a flagged duplicate, a field-by-field table against the original, showing why it was flagged.

**Everywhere**
- Each change is confirmed by a toast, and the page re-reads from the API so it shows what was actually stored.
- There are loading, empty, not-found and error states.
- On a phone, the table becomes two-line rows.

## Run it

Requires **Node.js 24 or newer** (developed on Node 26). No Docker, no database server.

```bash
npm install
npm run dev
```

That one command starts both apps:

- Web: http://localhost:3000
- API: http://localhost:3001/api/invoices

On first start the API creates the database and seeds 5 invoices. It seeds only an empty table, so status changes survive restarts. To start over from the seed, run `npm run db:reset`.

### Other scripts

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm test`          | API unit tests (status machine) and e2e tests (HTTP + SQLite)  |
| `npm run typecheck` | `tsc --noEmit` for both apps                                   |
| `npm run build`     | Production build of both apps                                  |
| `npm start`         | Run the production builds (after `npm run build`)              |
| `npm run db:reset`  | Delete the SQLite file; the next start re-seeds                |

Environment variables (all optional):

| Variable              | Default                     | Used by    |
| --------------------- | --------------------------- | ---------- |
| `PORT`                | `3001`                      | API        |
| `DB_PATH`             | `apps/api/data/invoices.db` | API        |
| `WEB_ORIGIN`          | `http://localhost:3000`     | API (CORS) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001`     | Web        |

## Deploy (Docker Compose)

`docker-compose.yml` runs two containers:
- `web` is the Next.js standalone server.
- `api` is NestJS, with SQLite on the `invoices-data` volume.

A proxy layer on top serves HTTPS and routes `/api` to the API and everything else to the web app. The browser calls `/api` on the same origin, so no CORS is needed. Choose the proxy layer with `COMPOSE_FILE` in `.env`:

| Server | `COMPOSE_FILE` |
| ------ | -------------- |
| Fresh server (Caddy takes ports 80/443, Let's Encrypt) | `docker-compose.yml:docker-compose.caddy.yml` |
| Already runs Traefik (`websecure` entrypoint, `letsencrypt` resolver) | `docker-compose.yml:docker-compose.traefik.yml` |

Point the domain's A record at the server, then:

```bash
git clone https://github.com/aliasghar-me/invoice-approval-desk.git && cd invoice-approval-desk
printf 'DOMAIN=invoices.example.com\nCOMPOSE_FILE=docker-compose.yml:docker-compose.traefik.yml\n' > .env
docker compose up -d --build
```

To update to the latest code, run `git pull && docker compose up -d --build`. The database volume is kept.

## API

| Method  | Path                | Notes |
| ------- | ------------------- | ----- |
| `GET`   | `/api/invoices`     | All invoices. Optional `?status=needs_review`, or a comma list such as `?status=approved,rejected`. |
| `GET`   | `/api/invoices/:id` | One invoice, plus any invoices with the same vendor and invoice number (`duplicateGroup`). |
| `PATCH` | `/api/invoices/:id` | Body `{ "status": "approved" }`. Only allowed transitions succeed. |

Every invoice in a response carries `allowedTransitions` and `approvalBlockedReason`, so the UI never re-implements the rules.

| Status | When |
| ------ | ---- |
| `400`  | Unknown status, extra body fields, malformed JSON, bad id, bad `?status=` filter |
| `404`  | Invoice does not exist |
| `409`  | The change makes no sense: not an allowed transition, same status again, or approving a duplicate of an approved invoice. The body has a machine-readable `code`. |

```bash
curl localhost:3001/api/invoices?status=needs_review

curl -X PATCH localhost:3001/api/invoices/3 \
  -H 'Content-Type: application/json' -d '{"status":"approved"}'

# 409 DUPLICATE_ALREADY_APPROVED: #5 is a copy of the approved #1
curl -X PATCH localhost:3001/api/invoices/5 \
  -H 'Content-Type: application/json' -d '{"status":"approved"}'
```

## Seed data and the duplicate

| #  | Vendor               | Invoice #   | Amount    | Status                        |
| -- | -------------------- | ----------- | --------- | ----------------------------- |
| 1  | Fernhill Office Supplies | INV-1042    | $1,250.00 | approved                      |
| 2  | Northwind Logistics  | NW-88213    | $4,780.50 | rejected                      |
| 3  | Blue Harbor Catering | BH-2026-117 | $865.00   | needs_review                  |
| 4  | Summit Cloud Hosting | SCH-55019   | $2,399.99 | processing                    |
| 5  | FERNHILL Office Supplies | INV 1042    | $1,250.00 | needs_review, duplicate of #1 |

#5 is the same invoice as #1, typed differently. It came in after #1 was already approved. The app:

1. Detects the duplicate when the invoice is added. It compares vendor and invoice number after normalising case, spaces and punctuation.
2. Links #5 to #1 and sends it to **Needs review**, even though it arrived as `processing`.
3. Shows a "Possible duplicate of #1" badge in the list, and a banner on the detail page that links to #1.
4. Disables **Approve** with the reason shown. The API returns `409` if someone calls it anyway. **Reject** is allowed.

## Project layout

```
apps/api/src/
  db/database.service.ts                SQLite connection, schema, transaction helper
  invoices/status-machine.ts            the transition table (single source of truth)
  invoices/invoices.service.ts          queries, transition + duplicate rules, ingest
  invoices/invoices.controller.ts
  invoices/invoice.types.ts             zod request schemas and response types
  invoices/seed.service.ts              5 sample invoices, seeded on an empty table
apps/api/test/invoices.e2e-spec.ts
apps/web/
  app/page.tsx                          tabs + list
  app/invoices/[id]/page.tsx            detail
  app/invoices/[id]/review-actions.tsx  Approve / Reject (client component)
  lib/api.ts                            typed API client
```

## Notes

- **Vitest, not Jest:** NestJS 12 is ESM-only and its CLI scaffolds Vitest.
- **`node:sqlite`, not Prisma:** at the time of writing, Prisma's `latest` tag was a release candidate. The built-in driver needs no native build, no codegen and no extra service, which keeps "one command" true.
- **`npm audit`:** 0 findings in production dependencies. The remaining moderate findings are in dev-only lint tooling (`typescript-eslint` → `minimatch`).
