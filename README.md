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

## Development

```
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

Built with React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts,
and SheetJS.
