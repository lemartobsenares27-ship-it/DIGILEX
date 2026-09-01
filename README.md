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
not a section of this one. This repo builds three independent front-ends,
with tabs in each sidebar to switch between them:

| App | Entry | URL | Database |
| --- | --- | --- | --- |
| Digilex Financial Control Center | `index.html` | `/` | `digilex-financial-control-center` |
| J&T VIP Reconciliation | `jnt-vip/index.html` | `/jnt-vip/` | `jnt-vip-reconciliation` |
| Warehouse & Inventory Control | `warehouse/index.html` | `/warehouse/` | `warehouse-inventory-control` |

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

## Warehouse & Inventory Control (separate application)

The third independent system. Same pattern as J&T VIP: its own entry point,
its own database (`warehouse-inventory-control`), its own nav. Vigilex, the
J&T VIP reconciliation and the POS import are untouched by it.

### The core rule: balances are never stored

There is no `quantity` column anywhere. Every number — available, reserved,
with fulfillment, damaged, missing — is derived by summing an append-only
movement ledger, where each movement records
`from (location, state) → to (location, state)`.

That is what lets the system answer *why* you have 823 units instead of just
asserting 823. Open any SKU and its movement history is the derivation.
(Vigilex has a `products.quantityOnHand` field that the POS and purchase-order
imports increment and decrement — that is the single-number approach this
system deliberately does not use, and it is left alone.)

### Inventory states

`AVAILABLE`, `RESERVED`, `IN_FULFILLMENT`, `IN_TRANSIT`, `RTS`,
`FOR_INSPECTION`, `DAMAGED`, `DEFECTIVE`, `MISSING`, `LOST`, `QUARANTINE`,
`EXPIRED`, `DISPOSED`.

A unit is in exactly one state at one location. Changing state is a movement,
so "this RTS turned out to be damaged" is an auditable event, not a silent edit.

- **Sellable** = available − reserved. Reserved units are physically present
  but already promised, so they are never offered twice.
- **Physical** = everything you own, wherever it sits (excludes write-offs).
- **Incoming** = outstanding quantity on open POs — explicitly *not* stock.

### Operations, each atomic

| Operation | Ledger effect |
| --- | --- |
| Receive | → AVAILABLE, with damaged units split off to DAMAGED and any shortfall against expected flagged |
| Send to fulfillment | warehouse AVAILABLE → partner IN_FULFILLMENT |
| RTS received | partner IN_FULFILLMENT → warehouse FOR_INSPECTION (never straight to sellable) |
| Inspection | FOR_INSPECTION → AVAILABLE / DAMAGED / DEFECTIVE / QUARANTINE / DISPOSED |
| Transfer sent | source AVAILABLE → destination IN_TRANSIT |
| Transfer received | IN_TRANSIT → AVAILABLE, shortfall → MISSING |
| Stock count | difference posted as an ADJUSTMENT with a reason; short counts land in MISSING |

Outbound movements are refused if they would drive a bucket negative, and a
multi-leg operation is checked as a whole before any leg is written — so a
transfer can never deduct from one place without arriving at the other.

### Verified end to end

A browser test drives the full lifecycle and asserts the derived balances:
receive 98-of-100 with 1 damaged (→ 97 available, 1 damaged, −2 discrepancy
flagged); oversend blocked; 40 to fulfillment; 10 RTS (available unchanged,
inspection 10, fulfillment 30); inspected damaged (→ damaged 11, available
still 57); counted 50 vs ledger 57 (→ adjusted, 7 missing); PO for 500
(→ incoming 500, available still 50).

### Production / bill of materials

Products carry a `kind`: COMPONENT (consumed to build something), FINISHED
(assembled from components), SIMPLE (bought and sold as-is) or CONSUMABLE
(used by the operation, not part of any one unit — packing tape). A finished
product's recipe lives in the `bom` table as component + quantity-per-unit.

This exists because stock level is the wrong question for an assembled
product. With 100 bottles, 300 foam seals and no labels, you have **zero**
sellable units — output is capped by the scarcest component. The Production
page shows buildable quantity, names the limiting component, and gives the
component cost of one finished unit.

Building consumes every component and creates the finished units in one
atomic movement group. A component shortfall is refused by the same
negative-stock check that guards every other operation, so a build can never
half-consume a recipe.

Products also carry `unitsPerPack`, because suppliers sell packs (20 bottles,
50 foam seals) while the ledger counts pieces.

### Not built yet

Barcode scanning, FEFO/FIFO allocation, expiry alerting, order reservation
from POS, bulk import, and PDF reports are designed for but not implemented —
the schema carries `batchNo`, `expiryDate` and the `RESERVED` state so they
can be added without reshaping the ledger. Multi-level BOMs (a component
that is itself assembled) are not supported; recipes are one level deep.

## Development

```
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts,
and SheetJS.
