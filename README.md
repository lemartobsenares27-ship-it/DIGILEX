# Digilex Financial Control Center

A web dashboard for the Digilex COD ecommerce business — income, expenses,
cash flow, P&L, Facebook Ads/ROAS, credit card reconciliation, and the full
order/SOA/POS audit trail, all in one editable app instead of a spreadsheet.

## What's here

- **Overview** — live KPIs (revenue, expenses, net profit, ROAS, delivery rate)
  with a month picker and trend charts.
- **Income Tracker / Expense Tracker** — editable, searchable, sortable
  transaction tables with running totals and category breakdowns.
- **Cash Flow / Monthly P&L / Monthly Bookkeeping** — the official bookkeeping
  views, computed from the same source data as Overview.
- **Facebook Ads Tracker / Credit Card Reconciliation** — ad account coverage,
  ROAS, and card-transaction matching.
- **Bills & Reminders** — card-style bill tracker with due-date badges.
- **Orders Database + audit trail** — Fulfillment SOA Reconciliation, SOA
  Breakdown & Verification, Fulfillment Verification, POS Order
  Reconciliation, Evidence (delivered-not-in-SOA), and the Digilex follow-up
  list.
- **Settings** — business info, product pricing, fee benchmarks, and an
  "Export full workbook (.xlsx)" button that regenerates an Excel copy of
  everything as it currently stands (including your edits).

## How data works

All data lives in the browser (IndexedDB via Dexie), seeded once from the
JSON files in `src/data/` (themselves generated from the original Excel
workbook by `scripts/extract_xlsx.py`). Every table is editable in place —
double-click a cell to edit, use "Add row" / the trash icon to insert or
remove rows. Nothing is sent to a server; export to Excel from Settings for
an off-browser backup.

To refresh from a newer version of the source workbook:

```
python3 scripts/extract_xlsx.py path/to/Updated_Workbook.xlsx
```

then use **Settings → Reset to original data** in the app (this clears any
in-browser edits and reseeds from the regenerated JSON).

## J&T VIP Reconciliation (independent module)

A separate fulfillment partner, **J&T VIP**, gets its own reconciliation
system under the "J&T VIP Reconciliation" nav group. It is deliberately
independent from everything above: separate Dexie tables (`jntVip*`,
introduced in DB schema version 5), separate pages, separate import
pipeline, its own audit log. Nothing here reads or writes any NPMCM table
(`orders`, `soaReconciliation`, `posReconciliation`, `fulfillmentVerification`,
`evidence`, `followUp`, etc.) — the two systems can be used, changed, or
reset without affecting each other.

**Why it's separate**: NPMCM is the existing fulfillment company (which
itself ships via J&T Express as courier — see `Courier`/`J&T Tracking
Number` columns on the NPMCM pages). J&T VIP is a distinct new partner with
its own POS-side orders and its own SOA, so it needed its own end-to-end
reconciliation rather than being bolted onto the NPMCM tables.

### Architecture

- **Raw + normalized, never overwritten in place.** Every imported POS row
  and SOA row is stored normalized (`jntVipPosOrders`, `jntVipShipments`)
  with the original parsed record preserved verbatim in a `raw` field. The
  comparison itself lives in a third table, `jntVipMatches` — one row per
  POS order, per shipment, or per matched pair. Nothing is merged or
  silently corrected; a mismatch stays a mismatch until a human resolves it.
- **Import pipeline**: Upload → confirm column mapping → Preview & Validate
  (counts of valid/duplicate/missing-identifier rows, shown before you
  commit) → Import → automatic reconciliation. Every import is a batch
  (`jntVipImportBatches`) and can be undone from the Import page, which
  removes everything it added and re-runs reconciliation.
- **PDF SOAs**: not parsed automatically (courier PDF layouts are too
  inconsistent to trust). Re-export the SOA as CSV/Excel first — the
  uploader gives a clear error rather than guessing at a PDF.
- **Matching engine** (`src/lib/jntvip/matching.ts`) — a 4-level confidence
  hierarchy, checked in order per POS order / shipment pair:
  1. **HIGH** — exact tracking/waybill number match
  2. **HIGH** — exact Order ID ↔ Order Reference match
  3. **MEDIUM** — a partial identifier match (shared tracking suffix)
     combined with a close COD amount
  4. **LOW** — fuzzy match on customer name + phone + COD amount + ship
     date proximity. A LOW-confidence match is **never** auto-confirmed —
     it always lands as "Needs Review" for a human to confirm or reject,
     regardless of whether the numbers happen to agree.
  Exact duplicate tracking/order numbers within POS or within the SOA are
  pulled out and flagged as `DUPLICATE` before matching runs, rather than
  competing for a pairing.
- **Reconciliation** (`src/lib/jntvip/reconcile.ts`) recomputes every match
  from scratch off the current POS orders + shipments any time an import
  runs, but **upserts by (POS order, shipment) key** rather than clearing
  the table — a manual review decision and its `id` (which the audit log
  references) survive a later re-run, e.g. a delayed SOA batch arriving
  weeks after the POS order shipped. A manual "Link to…" pairing is pinned
  so the automated engine can never silently re-route either side later.
- **Financial comparison**: COD mismatch and shipping mismatch are judged
  on the *collected* amounts (POS's expected COD/shipping vs J&T's
  collected COD/shipping charge), independent of the *net settlement*
  total, which naturally differs once J&T's COD fee / return fee /
  adjustments are netted out. Both are shown — a clean COD+shipping match
  with a nonzero "Total Difference" usually just means fees were deducted,
  and is not flagged as a discrepancy on its own.
- **Manual review** (`src/lib/jntvip/review.ts`): Confirm Match, Reject
  Match, Mark as Duplicate, Mark as Expected Difference, Ignore, Reopen,
  Add Note, and Link to POS order / Link to J&T transaction (for POS-only
  or J&T-only rows) — each writes a before/after snapshot to
  `jntVipAuditLog`. There's no server-side auth in this app (it's a
  single-user, browser-only tool, same as everything else here), so
  "Reviewed by" is just a free-text name remembered between reviews.

### Using it

1. **Import → Import POS Orders**: your Pancake POS export (or similar) —
   confirm the column mapping (defaults are pre-guessed from Pancake's real
   column names), preview, then post.
2. **Import → Import J&T VIP SOA**: the Statement of Account J&T VIP sends
   you, as CSV/Excel. Nothing about J&T VIP's column layout is assumed —
   map every column yourself the first time; the mapping is remembered for
   the next SOA.
3. **Dashboard** shows the headline counts (Matched / Needs Review /
   Mismatched / J&T Only / POS Only), total POS vs J&T value, and the
   biggest open discrepancies.
4. **Reconciliation Table** is the full row-level view — filter by status,
   confidence, or SOA batch, search by order ID/tracking/customer/phone,
   click any row to open the side-by-side detail and take a review action.
5. **Discrepancy Center** groups every open issue by type (COD mismatch,
   shipping mismatch, status mismatch, missing from J&T, missing from POS,
   duplicates) ranked by financial impact.
6. **SOA Batches** is the batch history — one row per imported SOA, with
   its own matched/issues/difference rollup.
7. **Audit Log** is the full trail of manual review actions.
8. **Exports** (Reconciliation Table page): Full reconciliation, Mismatches
   only, J&T-only, POS-only, and a financial Discrepancy Report — all
   `.xlsx`.

### Troubleshooting

- **"Could not find a recognizable header row"** on POS import — the file's
  header row isn't within the first 20 rows, or none of the expected column
  names were recognized. Check the export isn't missing its header row.
- **A lot of rows land in "Needs Review"** — this means the matching engine
  could only fuzzy-match them (Level 4: name + phone + amount + date). Check
  whether the POS export and the SOA are both carrying a tracking number —
  if one side's tracking number field is blank or malformed, exact matching
  (Level 1) can't run at all.
- **Everything shows as "POS Only" or "J&T Only"** — the two sides aren't
  sharing any usable identifier. Re-check the column mapping on both
  imports; a tracking number mapped to the wrong column will silently
  produce zero matches rather than wrong ones (nothing here guesses).
- **A reconciled batch shows a nonzero Total Difference** — check the
  Reconciliation Table for that batch: if there are no COD/shipping/status
  mismatch flags on the rows, the gap is coming from J&T's own fees /
  adjustments in the net settlement, not from a discrepancy.

## Development

```
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts,
and SheetJS.
