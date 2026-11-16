# Requirements: Mini Invoice Approval Desk

Take-home task for the Full Stack Engineer role. Time budget: about 4 to 5 hours.
Recorded: 2026-11-16.

## Goal

A small web app where a team reviews invoices. TypeScript on the API and the web UI. Use a real database (Postgres or SQLite).

## Stack (chosen)

| Part      | Choice                                | Port |
|-----------|---------------------------------------|------|
| Frontend  | Next.js (App Router, TypeScript)      | 3000 |
| Backend   | NestJS (TypeScript)                   | 3001 |
| Database  | SQLite (built-in `node:sqlite`), file | n/a  |
| API tests | Vitest + supertest                    | n/a  |

## Functional requirements

### Data and seed
- [x] Seed 5 sample invoices. Fields: vendor, invoice number, amount, date, status.
- [x] One of the 5 is a duplicate of another.
- [x] The app shows how it handles the duplicate (detection, flagging in the UI, and API rules).

### Statuses
- [x] Exactly four statuses: `processing`, `needs_review`, `approved`, `rejected`.

### UI
- [x] Invoice list with three tabs: "Processing", "Needs review", "Approved / Rejected".
- [x] Clicking an invoice opens a detail view.
- [x] The detail view has Approve and Reject buttons.
- [x] The UI talks to the REST API below (no direct DB access from the web app).

### Persistence and rules
- [x] A status change survives a restart (stored in the database).
- [x] The API refuses status changes that make no sense (invalid transitions, unknown statuses, bad input).

### REST API
- [x] `GET /api/invoices`, with optional `?status=` filter.
- [x] `GET /api/invoices/:id`
- [x] `PATCH /api/invoices/:id` with body `{ "status": "..." }`

### Running
- [x] One command starts everything: web on port 3000, API on port 3001.

### Tests
- [x] API tests.

## Deliverables

- [ ] GitHub repo link.
- [x] README (setup, the one command, ports, how to run tests).
- [x] Short write-up (`docs/DESIGN.md`) covering:
  - [x] Schema.
  - [x] Status model: which transitions are allowed, and why.
  - [x] What was left out.
- [ ] 1-minute audio recording of the passage below (spoken English check). Recorded by Ali, not part of the code.
- [ ] Reply to the outreach email with the repo link and the audio.

## Planned design decisions

These are not part of the brief. They are the choices made to meet it. The full rationale goes in `docs/DESIGN.md`.

- Allowed transitions: `processing` to `needs_review`; `needs_review` to `approved` or `rejected`. `approved` and `rejected` are terminal.
- Refused: skipping review (`processing` to `approved`/`rejected`), leaving a terminal state, setting the same status again.
- Error codes: 400 for an invalid body or unknown status, 404 for an unknown id, 409 for a disallowed transition.
- Duplicate rule: same vendor (trimmed, case-insensitive) and same invoice number. The later invoice links to the original, goes to `needs_review`, and shows a "Possible duplicate" badge. The API refuses to approve it if the original is already approved, so it cannot be paid twice. Rejecting it is allowed.
- Amounts are stored as integer cents.
- Seed runs only when the table is empty, so restarts never reset status changes.

## Reading passage (for the audio recording)

> Every building starts with a plan. Before a single wall goes up, a team decides what the building will look like and how it will be used. Workers measure the land, order materials, and set a schedule.
>
> Building something big takes many people working together. Carpenters frame the walls. Electricians run the wires. Plumbers connect the pipes. Each person depends on the others to finish their part on time.
>
> Good communication keeps a project moving. When someone changes a plan, everyone needs to know quickly. A small mistake on paper can become a big problem on the job site.
>
> Today, new tools help teams stay organized. Instead of searching through stacks of paper, workers can check a phone or tablet to see what needs to be done next.
>
> In the end, every finished building is proof of careful planning, hard work, and teamwork.
