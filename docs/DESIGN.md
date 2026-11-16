# Design notes

## Schema

One table, `invoices` (SQLite):

| Column            | Type    | Notes |
| ----------------- | ------- | ----- |
| `id`              | INTEGER | Primary key, autoincrement |
| `vendor`          | TEXT    | As received, trimmed |
| `vendor_key`      | TEXT    | Normalised vendor for duplicate matching: lower case, letters and digits only |
| `invoice_number`  | TEXT    | As received, trimmed |
| `number_key`      | TEXT    | Normalised number: upper case, letters and digits only |
| `amount_cents`    | INTEGER | Money as integer minor units, never floats. `CHECK (>= 0)` |
| `currency`        | TEXT    | ISO code, default `USD` |
| `invoice_date`    | TEXT    | `YYYY-MM-DD`. A calendar date, so no time zone |
| `status`          | TEXT    | `CHECK` limits it to the four statuses |
| `duplicate_of_id` | INTEGER | FK to `invoices.id`. Set when the invoice repeats an earlier one |
| `created_at`, `updated_at` | TEXT | ISO-8601 UTC. `updated_at` moves on every status change |

Indexes: `(vendor_key, number_key)` for duplicate lookups, and `(status)` for the tab filters.

`(vendor_key, number_key)` is deliberately **not unique**. A real inbox does receive the same invoice twice, and the brief asks the app to show how it handles that. Refusing to store the copy would hide the problem from the reviewer. Storing it, linking it and blocking a second payment makes it visible.

The schema is applied with `CREATE TABLE IF NOT EXISTS` on boot. A real system would use versioned migrations; see "Left out".

## Status model

```
processing ──▶ needs_review ──▶ approved
                     │
                     └────────▶ rejected
```

| From           | Allowed to             | Why |
| -------------- | ---------------------- | --- |
| `processing`   | `needs_review`         | Capture/extraction is finished and a person needs to look at it. |
| `needs_review` | `approved`, `rejected` | This is the one human decision point. |
| `approved`     | nothing (terminal)     | An approved invoice may already be scheduled for payment. Reopening it silently would be unsafe. |
| `rejected`     | nothing (terminal)     | The vendor has been told no. A corrected invoice should come in as a new invoice. |

Refused with `409`:

- **Skipping review:** `processing` → `approved`/`rejected`. Nobody has looked at it yet.
- **Leaving a terminal state:** anything out of `approved` or `rejected`.
- **No-op:** setting the status it already has. A repeated click should not look like a second decision.
- **Paying twice:** approving an invoice when another invoice with the same vendor and number is already approved (code `DUPLICATE_ALREADY_APPROVED`).

Refused with `400`: a status that is not one of the four, extra fields in the body, or malformed JSON.

The table lives in one place, `apps/api/src/invoices/status-machine.ts`. The service enforces it. The API returns `allowedTransitions` for each invoice, and the UI only enables the buttons it lists, so the rules are not duplicated in the frontend.

**Concurrency:** the check and the write run inside `BEGIN IMMEDIATE`. The update is a compare-and-set (`... WHERE id = ? AND status = ?`). If two reviewers click at the same moment, one wins and the other gets `409`, not a silent overwrite.

## Duplicates

- **Match rule:** same `vendor_key` and same `number_key`. "FERNHILL Office Supplies / INV 1042" matches "Fernhill Office Supplies / INV-1042".
- **On ingest:** the new invoice gets `duplicate_of_id` set to the oldest match, and is forced into `needs_review` no matter what status it arrived with.
- **On approve:** refused if any other invoice in the same group is already approved. The rule is symmetric: if the copy is approved first, the original can no longer be approved either. Rejecting is always allowed.
- **In the UI:** a badge in the list, a banner on the detail page that links to the other invoice(s), and a disabled Approve button with the reason.

Amount and date are not part of the match on purpose. A vendor re-sending INV-1042 with a corrected amount is still the same invoice number, and a person should decide.

## Left out

These were left out on purpose, to keep the task inside its time box:

- **Auth and roles:** anyone can approve. A real desk needs sign-in, and probably an approver separate from the submitter.
- **Audit trail:** only `updated_at` is stored. A `status_events` table (who, from, to, when, note) would be next.
- **Reject reason / notes:** Reject takes no comment.
- **Reopen / undo:** terminal states are final by design. A real system might allow an admin-only, audited reopen of a rejected invoice.
- **Creating or uploading invoices:** there is no POST endpoint. `InvoicesService.ingest` is the hook a real upload or inbox pipeline would call.
- **Fuzzy duplicate detection:** for example the same amount and date but a different number. The match is exact on normalised keys only.
- **Pagination, search and sorting options** on the list.
- **Line items, tax and multi-currency totals.**
- **Versioned migrations and Postgres:** SQLite and an idempotent schema keep setup to one command. Moving to Postgres would mean a migration tool and a connection pool.
- **Web UI tests:** the API carries the tests, as the brief asks. A Playwright smoke test of approve/reject would be the next addition.
