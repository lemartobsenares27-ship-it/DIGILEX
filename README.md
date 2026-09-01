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

## J&T VIP Reconciliation (separate application)

J&T VIP is a different fulfillment partner, so it gets a **separate app**,
not a section of this one. This repo builds two independent front-ends:

| App | Entry | URL | Database |
| --- | --- | --- | --- |
| Digilex Financial Control Center | `index.html` | `/` | `digilex-financial-control-center` |
| J&T VIP Reconciliation | `jnt-vip/index.html` | `/jnt-vip/` | `jnt-vip-reconciliation` |

They share React components and parsing utilities at build time and **nothing
at runtime** — separate IndexedDB databases, separate schema versions,
separate nav, separate branding. Resetting or breaking one cannot affect the
other. The J&T VIP database starts empty; it has no seed step, because all of
its data comes from the POS and SOA files you import.

(The Digilex database briefly carried `jntVip*` tables in schema v5. v6 drops
them. The v5 declaration is kept so browsers that already upgraded migrate
forward instead of finding their stored schema newer than the code.)

### Architecture

- **Raw + normalized, never overwritten.** Every imported POS row and SOA row
  is stored normalized with the original parsed record preserved verbatim in
  a `raw` field. The comparison lives in a third table, `matches` — one row
  per POS order, per shipment, or per matched pair. Nothing is merged or
  silently corrected.
- **Import pipeline**: Upload → confirm column mapping → Preview & Validate
  (valid / duplicate / missing-identifier counts, before you commit) →
  Import → automatic reconciliation. Every import is an undoable batch.
- **Matching engine** (`src/lib/jntvip/matching.ts`) — four levels, in order:
  1. **HIGH** — exact tracking/waybill (AWB) match
  2. **HIGH** — exact Order ID ↔ Order Reference match
  3. **MEDIUM** — partial identifier + close COD amount
  4. **LOW** — fuzzy on name + phone + amount + ship date. A LOW match is
     **never** auto-confirmed; it always lands in Needs Review.
  Duplicate AWBs/order numbers are pulled out and flagged before matching.
- **Reconciliation** recomputes from scratch on every import but upserts by
  `(posOrderId, shipmentId)`, so manual review decisions and the row `id` the
  audit log references survive later runs. Manual links are pinned so the
  engine cannot silently re-route them.
- **Financial comparison**: COD and shipping mismatches are judged on the
  *collected* amounts, separately from *net settlement* — which legitimately
  differs once J&T's collection fee, VAT and RTS fees are netted out. A clean
  COD match with a nonzero total difference usually just means fees.

### What a real J&T VIP SOA looks like

Confirmed against an actual SOA (`MNL-V7973`, SOA `VIP-979278`, Mar 4–7 2023):

- **Page 1 is a summary**: COD transaction total, less collection fee (2.75%),
  VAT (12%), creditable withholding tax, shipping fee, RTS fee, then
  adjustments, then `NET REMITTANCE`.
- **Pages 2+ are the parcel detail**, with columns:
  `AWB No. | Shipping Date | Pick Up DP | Delivery DP | POD Time | Weight (In KG) | COD`
- **There is no consignee name, phone, or merchant order number** in the
  detail table. The AWB is the only link to POS data, so exact AWB matching
  carries the reconciliation and the fuzzy level effectively never fires.
- **Only delivered (POD) parcels are listed.** There is no per-row status and
  no per-row fee; fees exist only as summary totals. A POS order absent from
  the SOA is therefore un-remitted, RTS, or still in transit.

### Using it

1. **Import → Import POS Orders**: your Pancake POS export. Confirm the
   column mapping (pre-guessed from Pancake's real column names).
2. **Import → Import J&T VIP SOA**: the SOA from J&T.
3. **Dashboard** for headline counts and the biggest open discrepancies;
   **Reconciliation Table** for the row-level view with filters, search and
   the side-by-side review drawer; **Discrepancy Center** for issues grouped
   by type; **SOA Batches** for per-SOA rollups; **Audit Log** for the trail.
4. **Exports** (Reconciliation Table): full, mismatches, J&T-only, POS-only,
   and a financial discrepancy report — all `.xlsx`.

### Troubleshooting

- **Everything lands in "POS Only" / "J&T Only"** — the two sides share no
  usable identifier. Re-check the column mapping; a tracking number mapped to
  the wrong column yields zero matches rather than wrong ones.
- **Lots of "Needs Review"** — only fuzzy matching succeeded. Check that both
  sides actually carry the AWB/tracking number.
- **A batch shows a nonzero total difference with no row-level flags** — the
  gap is J&T's fees and adjustments in net settlement, not a discrepancy.

## Development

```
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts,
and SheetJS.
