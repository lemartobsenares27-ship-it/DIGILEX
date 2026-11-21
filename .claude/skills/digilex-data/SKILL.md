---
name: digilex-data
description: Ingest, verify and reconcile owner-supplied Digilex files — J&T SOA statements, My Waybill parcel exports, POS order exports, E-RPOD return forms, Meta ad exports, and bank or credit-card statements. Use whenever the owner uploads one of these, asks to check a statement against POS or parcels, asks what to upload next, or asks for the J&T VIP dashboard to be updated with new data. Holds the verification each file must pass before anything is written, the known courier traps, and the seed files each one lands in.
---

# Digilex data intake and reconciliation

Read `CLAUDE.md` first — deploy branch, centavos, additive corrections, never
blend periods. This file is the per-file procedure.

**Nothing is written down until it reconciles.** Every seed in
`src/lib/jntvip/` was checked before being committed, and the comments in
those files record what was checked and how. Keep that going: a seed whose
provenance is unrecorded is worse than no seed, because the next session
trusts it.

## The one rule that matters most

Verify against an **independent source**, not against itself. A statement that
adds up internally proves nothing — it is the courier's own arithmetic on the
courier's own figures. It is only verified when a *second* source agrees:
the parcel export, the POS, or the bank credit.

Where no independent source exists, **say so in the code comment and in the
reply**. COD was unverifiable for weeks because J&T dropped a column; that was
stated plainly rather than papered over, and it is why the gap was found the
moment the column came back.

---

## File types

### J&T SOA statements (PDF)

Land in `src/lib/jntvip/soaSeed.ts` as `SEED_STATEMENTS`.

Fee rules (`soaCheck.ts`): COD commission **2.75% per parcel**, rounded to the
centavo then summed — *not* 2.75% of the grand total, which is off by a few
pesos. VAT is **12% of the commission**. Shipping is billed on **dispatch**.
RTS fee is **50% of the receivable freight**.

Check, in this order:
1. `net = cod − commission − vat − shipping − rtsFee` — internal arithmetic.
2. Shipping and RTS against the **parcel export** for the same period. These
   match to the centavo when both are present.
3. `cod` against the parcels' actual collected **`Cod`** column.
4. The net against a **bank credit** in UnionBank history, usually the next day.

Record `received`, `receivedOn` and `ref` for each. Two statements can share
one credit reference when J&T pays them combined.

Result as of 12 Nov 2026: 56 statements, every payment arrived, and 40 of the
43 statements the export can reach match collected COD **to the peso**. The
three that differ sit at the export's edge and J&T billed *more*, not less.

### My Waybill parcel export (xlsx/csv)

Lands in `src/data/jntParcels.json`, packed as positional arrays, loaded by
`parcelSeed.ts`.

**`Cod` vs `Item Value` is the whole game.** `Item Value` is what *should* have
been collected; `Cod` is what *was*. They agree on almost every parcel and
differ on exactly the ones where collection failed. An export without the `Cod`
column cannot audit a remittance — if it is missing, say so and ask J&T to
restore it.

**Parser trap, already fixed, do not regress:** `findColumn`'s substring
fallback matched "COD" inside **"Creator Code"**, which would have imported
every parcel at ₱0. `parseFile.ts` now matches whole words only. A file that
suddenly parses at ₱0, or at a suspiciously round total, is this class of bug —
check the column mapping before believing the number.

Also: the parser must not throw on an export lacking a `Cod` column, or every
new export becomes unimportable.

Statuses only ever move **forward** (`IN_TRANSIT → DELIVERING → FOR_RETURN →
DELIVERED | RETURNED`). `DELIVERED` and `RETURNED` are both terminal and
neither may be rewritten as the other.

### POS order export

Lands in `src/data/jntPosProducts.json` (waybill → product pins) via
`posProductSeed.ts`. This is what makes per-product profit possible — the J&T
export has no product column.

When matching POS against J&T, a waybill the POS does not mention is
**unknown**, not a contradiction. `returnsMatch.ts` uses a three-state
`PosState` (`RETURN` / `OTHER` / `UNKNOWN`) for exactly this reason; collapsing
it to two blames the POS for staying silent.

The same distinction runs through `returnsHome.ts`: `NOT_IN_EXPORT` (the
waybill is genuinely absent from the export) is not `STATUS_STALE` (it is
there, but its status has not caught up). Merging them reported 16 parcels
ahead of the export when only 8 truly were.

### E-RPOD return forms (photos)

Land in `src/data/jntErpod.json` via `erpod.ts`, surfaced on **Returns Home**.

A form carrying a signature means the parcels on it **reached the owner's
house**. That is the only proof of physical return; J&T's `RETURNED` status
only means it left the network. Match form → J&T status → POS, and report
anything returned in the system but never handed over.

### Meta ad exports (csv/xlsx) and card statements

Ad charges land in `src/data/jntAdCharges.json`; per-product ad splits in
`jntAdByProduct.json` (**multiple windows** — never collapse them, October's
measured split would be lost). Cards are registered in `adSpend.ts` as
`AD_CARDS`, each with its own `completeThrough` date.

`AD_COMPLETE_THROUGH` takes the **earliest** read-through across cards. Spend
after that date is an accrual tagged `UNKNOWN` until a statement covers it.

Traps:
- **UNLI 0% instalments are not advertising.** The original charge is reversed
  and reposted in parts. Counting both double-counts the spend.
- **FAILED charges are not spend.** Exclude them.
- More than one card can run ads **in parallel**. Finding the second card is
  what corrected the November figure. Always ask which cards were active.
- Ads Manager spend with no statement yet is "spent, not yet billed" — show it
  separately, never silently merged into billed spend.

### Bank and card statements (images)

Used to confirm J&T credits and to identify payees. GCash is a **payment rail,
not a pocket** — money through it is wages, labels or the owner's own
transfers, and must be classified, not counted as a loss.

Three delivered parcels collected ₱0 at the door and the customers paid the
owner directly by GCash (₱1,596 total). They live in `directPayments.ts`,
deliberately **not** written into the parcels: J&T's figures are right exactly
as they stand, and editing a parcel's COD would break the reconciliation that
proved the statements honest.

---

## Operating costs

`operatingCosts.ts`. Per person, never blended — one "support" rate was wrong
in both directions. **Two staff on different pay**; never quote a single
combined salary figure, the owner has asked for this specifically.

A rate change is a new row with `effectiveFrom` and the old row closed with
`effectiveTo`. Food is charged per head on each person's own rota where the
rotas differ, because a flat pair rate drops the sixth day in the flattering
direction.

If a cost exists, charge it even when small, and charge it from when it
started rather than from when it was mentioned.

## Before you report anything

1. `npx tsc --noEmit -p tsconfig.json` and `npm run build`.
2. Recompute the affected figures with a scratch `npx tsx` script against the
   real seed data, and quote those numbers — not remembered ones.
3. Render the page with Playwright (`/opt/pw-browsers/chromium`, `--no-sandbox`)
   and look at it. The build passing does not mean the page reads correctly.
4. Push to the feature branch **and** the deploy branch, and confirm the
   workflow run went green.
5. Tell the owner to hard refresh.

If a figure moved, say which direction and why. If something is still assumed
rather than measured, say that in the same breath — the owner acts on these
numbers.
