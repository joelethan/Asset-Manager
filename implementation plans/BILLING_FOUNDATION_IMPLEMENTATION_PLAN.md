# Fee & Billing Foundation Implementation Plan

## Objective
Build the first production-ready billing foundation so schools can define fee structures, generate invoices for students, record payments received, and see who owes what, without spreadsheets.

Billing is the next priority because it creates direct operational value for school administrators and is the base that payment gateways (MTN MoMo, Airtel Money, banks), receipts and parent self-service will build on.

### Guiding principles
1. **Financial records are never silently changed or deleted.** Corrections happen through cancellation, reversal or adjustment, and each one leaves a trace.
2. **Money is exact.** Use `Decimal` everywhere, never JavaScript `number` arithmetic. Serialize amounts as strings in the API.
3. **Derived values are computed, not stored**, unless they are cached inside the same transaction that changes their inputs.
4. **Generation is idempotent.** Running invoice generation twice must never bill a student twice.
5. **Ship the smallest dependable core.** Every phase must leave the system usable.

---

## Business goals
- Schools configure a fee catalogue by category.
- Fees are tied to academic years, terms and (optionally) classes.
- Invoices are generated in bulk from fee structures, with a preview before committing.
- Schools record payments (cash, bank, mobile money reference) against invoices, including partial payments.
- Schools can see collected, outstanding and overdue amounts per school, class and student.
- The data model can take gateway payments later without migration pain.

## Scope

### In scope (this plan)
- Fee categories and fee structures (class-wide and optional fees)
- Student fee assignments (for optional fees such as transport, boarding, uniform)
- Invoice generation (single student and bulk by class/school), with preview
- Invoice lifecycle: draft → issued → partially paid → paid, plus cancel
- Manual payment recording, payment reversal, receipt numbers
- Student fee statement (invoices + payments + balance)
- Billing dashboard figures and CSV export

### Out of scope (later phases)
- Payment gateway integration and automated MoMo/bank reconciliation
- Discounts, bursaries, scholarships and sibling discounts as rules (phase 1 covers only a manual per-assignment `waived_amount`)
- Credit notes, refunds and carrying overpayments forward as credit
- Automatic carry-forward of previous-term arrears (phase 1: add arrears manually as an opening-balance line item)
- Multi-currency (each school bills in its existing `School.currency`, default `UGX`)
- Parent portal checkout, SMS/email payment reminders
- Taxes (school fees are generally VAT-exempt, so there is no tax field for now)

---

## Fit with the existing codebase

These constraints come from the current backend (`atom-school-management`) and must be respected:

| Concern | Existing reality | Billing decision |
|---|---|---|
| ORM | Prisma, multi-schema (`user_mgt`, `student_mgt`, `results_mgt`, `payment_mgt`), snake_case columns | New models go in the existing **`payment_mgt`** schema, using the same naming conventions |
| Terms | There is **no `Term` model**. Terms are `TermTemplateItem` rows reached through `AcademicYear.term_template_id` | Reference terms with `term_template_item_id`, and validate that the item belongs to the academic year's template |
| Classes | `ClassroomDefinition`, with students linked via `StudentEnrollment` (per academic year, `status`, soft delete) | Class-wide fees target `classroom_definition_id`. Bulk generation selects students with an **active, non-deleted enrollment** for that year |
| Currency | `School.currency` (default `UGX`) | Copy the currency onto each invoice and payment when it is created |
| Payments | `Payment` and `PaymentTransaction` already exist, keyed by `user_id`, with no student or invoice link. Nothing uses them yet (see the TODOs in `students.service.ts` and `dashboard.service.ts`) | **Extend** `Payment` rather than create a parallel table (see the data model below) |
| Auth | `JwtAuthGuard` + `RolesGuard` + `@Roles('SCHOOL_ADMIN')`, tenant middleware, routes under `schools/:schoolId/...` | Same pattern for every billing controller. Every query is scoped by `school_id` |
| Roles | `SUPER_ADMIN`, `SCHOOL_ADMIN`, `PARENT`, `STUDENT`. There is no bursar or accountant role | Phase 1: only `SCHOOL_ADMIN` can write, and `SUPER_ADMIN` can read. A `BURSAR` role is a future decision |
| Existing stubs | `GET /students/:id/payments` and the dashboard's finance section are TODO stubs | Wire both to the new billing services in Phase 4 |

---

## Data model

All amounts use `Decimal @db.Decimal(14, 2)`. All tables have `school_id`, `created_at` and `updated_at`, and all writes record `created_by_user_id` where relevant.

### 1) `FeeCategory`
The general type of fee: Tuition, Boarding, Transport, Examination, Uniform, Development fund, Meals, Miscellaneous.

- `id`, `school_id`, `name`, `code`, `description?`, `is_active`, `sort_order`
- `@@unique([school_id, code])`, `@@unique([school_id, name])`
- Deactivate rather than delete once a category is referenced by any structure.

### 2) `FeeStructure`
A priced fee for a specific academic year, optionally for one term and/or one class.

- `id`, `school_id`, `academic_year_id`, `term_template_item_id?`, `classroom_definition_id?`, `fee_category_id`
- `name` (e.g. "P5 Tuition – Term 1 2026"), `amount`, `due_date?`
- `frequency`: enum `ONCE | PER_TERM | PER_YEAR`
- `is_mandatory`: `true` means it applies to every student in scope; `false` means it applies only to students with an assignment
- `is_active`, `metadata Json?`
- Rules:
  - `term_template_item_id` must belong to the academic year's term template.
  - `classroom_definition_id = null` means the fee applies school-wide.
  - Once any issued invoice line references the structure, `amount` cannot be edited. Create a new structure instead (the old invoices keep their snapshot either way).

### 3) `StudentFeeAssignment`
Links a student to an **optional** fee, or overrides a mandatory one for that student.

- `id`, `school_id`, `student_id`, `fee_structure_id`
- `amount_override?` (null means use the structure amount), `waived_amount` (default 0), `waiver_reason?`
- `status`: `ACTIVE | REMOVED`
- `@@unique([student_id, fee_structure_id])`
- A waiver requires a reason and records who granted it.

### 4) `Invoice`
- `id`, `school_id`, `student_id`, `academic_year_id`, `term_template_item_id?`
- `invoice_number` (see numbering), `currency`
- `issue_date?`, `due_date`
- `subtotal`, `waived_total`, `total_amount`, `amount_paid`. `amount_paid` is a cache, recalculated in the same transaction as every payment change.
- `status`: enum `DRAFT | ISSUED | PARTIALLY_PAID | PAID | CANCELLED`
- `cancelled_at?`, `cancelled_by_user_id?`, `cancellation_reason?`
- `generation_batch_id?` (links an invoice to the bulk run that created it)
- `@@unique([school_id, invoice_number])`
- **Idempotency:** `@@unique([student_id, academic_year_id, term_template_item_id, kind])`, where `kind` is enum `TERM | ADHOC`. Only `TERM` invoices are generated in bulk, so there is one per student per term. `ADHOC` invoices (e.g. a lost-textbook charge) are exempt from the unique rule (enforce it with a partial unique index in a raw SQL migration).

**Derived, not stored:**
- `balance = total_amount − amount_paid`
- `is_overdue = status ∈ {ISSUED, PARTIALLY_PAID} AND due_date < today` (school time zone). Overdue is a computed flag, not a status, so no cron job is needed and status never drifts.

### 5) `InvoiceLineItem`
A **snapshot** of each fee at generation time. Editing a fee structure later never changes an existing invoice.

- `id`, `invoice_id`, `fee_structure_id?`, `fee_category_id`, `description`
- `quantity` (default 1), `unit_amount`, `waived_amount`, `line_total`
- `fee_structure_id = null` is allowed for manual lines (opening balance or arrears, ad-hoc charges).

### 6) Payments: extend the existing `Payment` model
Changes to `payment_mgt.Payment`:
- Add `student_id?`, `invoice_id?`, `payer_name?`, `payer_phone?`, `receipt_number?` (unique per school), `received_at`, `recorded_by_user_id`
- Make `user_id` nullable (or rename it to `payer_user_id`). The payer is usually a guardian without a user account.
- Make `payment_method` an enum: `CASH | BANK_DEPOSIT | MOBILE_MONEY | CHEQUE | OTHER`
- Standardize `status` as an enum: `PENDING | COMPLETED | FAILED | REVERSED`. Manual payments are created as `COMPLETED`. `PENDING` and `FAILED` are reserved for gateways.
- `reference` is already unique. For manual entries, store the bank or MoMo reference and generate one when none is given.
- Reversals: set `status = REVERSED`, plus `reversed_at`, `reversed_by_user_id`, `reversal_reason`. Never delete.
- Keep `PaymentTransaction` for gateway events in the future gateway phase.

> Phase 1 applies each payment to exactly **one** invoice. If a family pays for several invoices at once, record several payments. Splitting one payment across invoices (a `PaymentAllocation` table) is deferred until a real need appears.

### 7) `NumberSequence`
- `school_id`, `kind` (`INVOICE | RECEIPT`), `year`, `next_value`, with `@@id([school_id, kind, year])`
- Numbers are allocated inside the same transaction using `UPDATE ... RETURNING` (a row lock), which keeps them gap-free under concurrency.
- Format: `{SCHOOL.code}-INV-{YYYY}-{000001}` and `{SCHOOL.code}-RCT-{YYYY}-{000001}`.
- Draft invoices get a number only when issued. Until then, show "Draft #<short id>".

### 8) `InvoiceGenerationBatch`
- `id`, `school_id`, `academic_year_id`, `term_template_item_id?`, `classroom_definition_id?`, `requested_by_user_id`
- `created_count`, `skipped_count`, `skipped_details Json`, `status`
- This table is the audit trail of bulk runs, and it lets a whole batch of **drafts** be discarded.

---

## Business rules

### Invoice state machine
| From | Action | To | Notes |
|---|---|---|---|
| — | generate | `DRAFT` | Lines can be edited, added or removed |
| `DRAFT` | issue | `ISSUED` | Assigns the invoice number and `issue_date`, locks the lines |
| `DRAFT` | delete | (gone) | Only drafts can be hard-deleted |
| `ISSUED` | payment recorded (partial) | `PARTIALLY_PAID` | |
| `ISSUED` / `PARTIALLY_PAID` | payment recorded (full) | `PAID` | |
| `PARTIALLY_PAID` / `PAID` | payment reversed | recalculated | Back to `ISSUED` or `PARTIALLY_PAID` |
| `ISSUED` | cancel | `CANCELLED` | Requires a reason. Blocked while there are any `COMPLETED` payments (reverse them first) |

Payment-driven statuses (`PARTIALLY_PAID`, `PAID`) are **never** set by hand. There is no generic `PATCH /status` endpoint.

### Generation rules
For a student, academic year and term, the invoice includes:
1. every **active mandatory** structure for that year where the term matches (or `PER_YEAR`/`ONCE` structures for which the student has never been billed) **and** the class is null or matches the student's active enrollment class;
2. every structure the student holds an **active assignment** for, in the same year and term;
3. any `amount_override` and `waived_amount` from the assignment.

A student is **skipped** (and reported in the batch summary) when:
- a `TERM` invoice already exists for that student, year and term (idempotency);
- the student has no active enrollment for the year;
- the resulting total is 0.

`due_date` is the earliest line due date, falling back to the term's `start_date` + the school's default (e.g. 14 days), then to the term start date itself.

### Payment rules
- Payments can be recorded only on `ISSUED` or `PARTIALLY_PAID` invoices.
- The amount must be greater than 0 and **at most the outstanding balance**. Overpayment is rejected in phase 1 (credit balances come later).
- The payment insert, the `amount_paid` recalculation, the status change and the receipt number all happen in **one Prisma transaction**.
- To guard against double submission, the client sends an `Idempotency-Key` header, or the API treats a repeated `(school_id, reference)` as the same payment.
- `received_at` can be back-dated (e.g. when entering bank slips) but not set in the future.

### Concurrency
- Bulk generation runs in chunks (e.g. 100 students per transaction). The unique constraint is the final guard against races, so treat unique-violation errors as "skipped", not as failures.
- Payment recording locks the invoice row (`SELECT ... FOR UPDATE` via `$queryRaw`) before checking the balance.

---

## Backend implementation

### Module layout
Create `src/billing/` (one Nest module, `BillingModule`):
```
src/billing/
  billing.module.ts
  fee-categories.controller.ts   fee-categories.service.ts
  fee-structures.controller.ts   fee-structures.service.ts
  fee-assignments.controller.ts  fee-assignments.service.ts
  invoices.controller.ts         invoices.service.ts
  invoice-generation.service.ts  # pure calculation, plus the batch runner
  payments.controller.ts         payments.service.ts
  billing-reports.service.ts     # dashboard figures, statements, exports
  numbering.service.ts
  dto/  (class-validator DTOs; amounts as @IsDecimal strings)
  billing.*.spec.ts
```
Keep **calculation** (`invoice-generation.service`, totals, state transitions) as pure functions with no Prisma dependency, so they are easy to unit test. Invoice logic and payment logic stay in separate services. `PaymentsService` calls `InvoicesService.recalculate(invoiceId, tx)`.

### API endpoints
All routes sit under `/schools/:schoolId`, use `JwtAuthGuard, RolesGuard` and `@Roles('SCHOOL_ADMIN')` for writes, and are scoped by tenant.

**Fee categories**
- `GET /fee-categories` · `POST /fee-categories` · `PATCH /fee-categories/:id` · `POST /fee-categories/:id/deactivate`
- `POST /fee-categories/seed-defaults`: idempotent, creates the standard category set

**Fee structures**
- `GET /fee-structures?academicYearId&termId&classroomId&categoryId&active`
- `POST /fee-structures` · `GET /fee-structures/:id` · `PATCH /fee-structures/:id` (blocked fields once invoiced)
- `POST /fee-structures/:id/deactivate`
- `POST /fee-structures/copy`: copies one year or term's structures to another (the main time saver every new term)

**Fee assignments**
- `GET /students/:studentId/fee-assignments`
- `POST /fee-assignments` (single or bulk: `{ feeStructureId, studentIds[] }`)
- `PATCH /fee-assignments/:id` (override or waiver) · `POST /fee-assignments/:id/remove`

**Invoices**
- `POST /invoices/generate/preview`: body `{ academicYearId, termId, classroomId? , studentIds? }`. Returns the would-create and would-skip lists with totals. **Writes nothing.**
- `POST /invoices/generate`: same body. Creates `DRAFT` invoices plus a batch record, and returns the batch summary.
- `POST /invoices/batches/:batchId/issue` · `DELETE /invoices/batches/:batchId` (removes the batch's drafts only)
- `POST /invoices` (ad-hoc invoice) · `GET /invoices?status&overdue&studentId&classroomId&academicYearId&termId&search&page&pageSize`
- `GET /invoices/:id` (with lines and payments)
- `PATCH /invoices/:id` (draft only: lines, due date, notes)
- `POST /invoices/:id/issue` · `POST /invoices/:id/cancel` (with a reason) · `DELETE /invoices/:id` (draft only)

**Payments**
- `POST /invoices/:id/payments` · `GET /invoices/:id/payments`
- `GET /payments?from&to&method&studentId` (the collections log)
- `POST /payments/:id/reverse` (with a reason)
- `GET /payments/:id/receipt` (receipt data; PDF rendering reuses the report-card printing approach)

**Reporting**
- `GET /billing/summary?academicYearId&termId`: billed, collected, outstanding, overdue count and amount, collection rate
- `GET /billing/by-class?academicYearId&termId`
- `GET /students/:studentId/statement?academicYearId`: chronological invoices and payments with a running balance
- `GET /billing/export/invoices.csv` · `GET /billing/export/payments.csv`

### Validation and error responses
- Use the existing `http-exception.filter` and `prisma-exception.filter`. Map unique violations to `409 Conflict` with a readable message ("An invoice already exists for this student and term").
- Return `422` for broken business rules (overpayment, editing an issued invoice, cancelling with payments) with a stable `code` field (e.g. `INVOICE_NOT_EDITABLE`, `PAYMENT_EXCEEDS_BALANCE`) so the client can show specific messages.

### Audit
- Every financial action records the acting user (`created_by`, `recorded_by`, `cancelled_by`, `reversed_by`) and, where applicable, a reason.
- Nothing financial is hard-deleted except `DRAFT` invoices.

---

## Frontend implementation (Asset-Manager client)

Follow the existing patterns: wouter routes in `App.tsx` (inside the `hasMemberships` block), nav entries in `AppLayout.tsx`, react-query with keys like `["billing", schoolId, ...]`, API wrappers in `lib/api.ts`, zod schemas in `lib/schemas.ts`, and money formatted with `Intl.NumberFormat` using the school's currency. **Never `parseFloat` for arithmetic.**

### Navigation
Add a **"Fees & Billing"** sidebar group: Overview · Invoices · Payments · Fee Setup.

### Pages
1. **Fee Setup** (`/billing/setup`): tabs for Categories and Structures. Structures are filterable by year, term and class, with a "Copy from previous term" action.
2. **Generate Invoices** wizard: pick year/term/class → **preview table** (will create / will skip, with reasons) → confirm → batch summary → "Issue all".
3. **Invoices** (`/billing/invoices`): filter by status, overdue, class, term, search by student name or number. Shows a status badge plus a separate "Overdue" badge, with pagination.
4. **Invoice detail** (`/billing/invoices/:id`): line items, payment history, balance, and actions (Issue, Record payment, Cancel, Print).
5. **Record Payment** dialog: amount (defaults to the balance, capped), method, reference, date received, payer. On success, shows the receipt number with a print option.
6. **Payments log** (`/billing/payments`): date range and method filters, reversal action, CSV export.
7. **Student statement**: a new "Fees" tab on the existing student profile.
8. **Billing overview** (`/billing`) and dashboard cards: billed, collected, outstanding and collection rate for the term, overdue count, and a by-class table.

### UX requirements
- Every list has empty, loading and error states that match the rest of the app.
- Destructive or irreversible actions (issue batch, cancel, reverse) use a confirmation dialog that states the consequence.
- Disable the submit button while a request is in flight, and send an `Idempotency-Key` on payment submission.
- After any payment or invoice change, invalidate the relevant invoice, summary and statement queries.

---

## Delivery plan

Each milestone ends in a demoable, merged state.

### M1: Schema and fee catalogue (3–4 days)
- Prisma models, enums, migration (including the `Payment` changes and the partial unique index), `NumberSequence`
- Category and structure services, controllers and DTOs, plus `seed-defaults` and `copy`
- Fee Setup page
- **Done when:** an admin can set up categories and structures for a year, term and class in the UI, and the migration applies cleanly to a copy of production data.

### M2: Invoice generation (4–5 days)
- Assignments API and UI (on the student profile and in bulk)
- Pure generation logic with unit tests, preview, batch generate, issue, discard drafts
- Invoices list and detail pages, ad-hoc invoices, cancel
- **Done when:** generating twice for the same class and term creates zero duplicates, the preview matches what gets committed, and an issued invoice cannot be edited.

### M3: Payments and receipts (3–4 days)
- Record payment (transactional, with locking), reversal, receipt numbering, receipt print view
- Payments log
- **Done when:** partial, full and reversed payments drive invoice status correctly, overpayment is rejected, and concurrent double submission creates only one payment.

### M4: Reporting and integration (2–3 days)
- Summary, by-class, statement and CSV exports
- Wire `dashboard.service.ts` finance figures and `GET /students/:id/payments` to the billing services
- Billing overview page and dashboard cards
- **Done when:** report totals reconcile exactly with the sum of invoices and payments in the seed dataset.

### M5: Hardening (2 days)
- e2e tests for the full flow, tenant-isolation tests, a performance check on bulk generation (target: 1,000 students in under 30 seconds)
- UAT with one real school's fee schedule

**Total: about 14–18 working days.**

---

## Testing strategy
- **Unit (pure logic):** line selection per student, override and waiver math, totals, due-date fallback, state machine transitions (every allowed and every forbidden one), and Decimal rounding.
- **Integration (Prisma, test database):** idempotent generation, unique-violation handling, payment transactions and recalculation, gap-free numbering under parallel requests, reversal.
- **Security:** every endpoint rejects a `schoolId` the user is not an admin of, and records from school A are never visible through school B's routes.
- **e2e:** set up fees → generate → issue → partial payment → full payment → statement shows a 0 balance.
- **Reconciliation check** (a test that can also run as a script): `SUM(invoice.total_amount) − SUM(completed payments) = SUM(balance)`, per school and term.

---

## Acceptance criteria
- A school admin can create categories and structures (class-wide and optional) for a year and term, and can copy them to a new term.
- Bulk generation previews accurately, creates one draft invoice per eligible student, reports the skipped students with reasons, and never duplicates when re-run.
- Issued invoices are immutable and numbered without gaps. Corrections go through cancellation.
- Payments update `amount_paid`, balance and status atomically. Overpayments are rejected, and reversals restore the previous state.
- Overdue invoices appear correctly with no scheduled job.
- Billing summary, by-class and student statement totals reconcile exactly with the underlying records.
- All amounts display in the school's currency with correct formatting, and no float arithmetic is used anywhere.
- All billing data is isolated per school, and every financial action records who did it.

---

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| The fee model doesn't match how real schools charge (day vs boarding, new vs continuing students) | Optional structures plus assignments cover these cases without new schema. Validate against 2 real fee schedules before M2 |
| Duplicate billing from re-runs or double clicks | DB unique constraint, preview step, idempotency keys |
| Money drift from float math | Decimal end to end, string serialization, the reconciliation test |
| Editing structures corrupts past invoices | Line items are snapshots, and amounts are locked once invoiced |
| Extending `Payment` breaks existing code | Nothing reads it today (only TODO stubs). Confirm with a grep before migrating |
| Students with no enrollment get missed silently | They appear in the skipped report with a reason |
| Scope creep into discounts and gateways | Explicitly deferred. The data model keeps room for them (waived_amount, payment status enum, PaymentTransaction) |

## Decisions (recommended defaults, confirm before M1)
| Question | Recommended default |
|---|---|
| Student-based or class-based billing? | **Both:** class-wide mandatory structures plus per-student assignments for optional fees. Invoices are always per student |
| Term-level or year-level first? | **Term-level.** Year-level fees (`PER_YEAR`) are billed on the first term invoice of the year |
| One invoice per student per term? | **Yes**, for generated (`TERM`) invoices, plus unlimited `ADHOC` invoices |
| Payment status handling | One central `PaymentsService`. Future gateways are adapters that create `PENDING` payments and complete them through the same service |
| Who can record payments? | `SCHOOL_ADMIN` only in phase 1. Decide whether a `BURSAR` role is needed before the parent portal work |
| Overpayment | Reject in phase 1. Credit balances come with credit notes |
| Arrears from before the system existed | Manual "Opening balance" line on the first invoice |
