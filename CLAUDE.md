# Digilex Online Shop — working rules

Philippine COD e-commerce selling supplements, fulfilled directly through
**J&T VIP** (seller VITAL ESSENTIALS, client code MNL-V11913). The owner left
NPMCM; that era is history, not the current business.

Read `.claude/skills/digilex-data/SKILL.md` before importing, reconciling or
seeding any owner-supplied file. It holds the per-file procedure and the
verification each one has to pass.

---

## 1. Deploying — get this wrong and nothing you do reaches the owner

Three apps are built from this one repo. GitHub Pages deploys from
**`claude/digilex-financial-dashboard-slmz3o`** and `main` only
(`.github/workflows/deploy-pages.yml`).

Development happens on a feature branch. **A commit that is not also on the
deploy branch does not exist as far as the owner is concerned.** Twenty-four
commits once sat on a feature branch for nine days while the owner was told
repeatedly that things were fixed; they were looking at a nine-week-old site.

So: push to the feature branch, then fast-forward the deploy branch, then
confirm the workflow run actually went green, then tell the owner. Never
report work as done on the strength of a local build.

The owner must **hard refresh** (Ctrl/Cmd+Shift+R) — the browser caches the
JS bundle, and a plain reload serves the old one.

## 2. Three apps, three databases — never cross them

| Path | App | Scope |
|---|---|---|
| `index.html`, `src/App.tsx` | Digilex Financial Control Center | NPMCM era, historical |
| `jnt-vip/`, `src/jntvip/` | **J&T VIP — the live business** | current |
| `warehouse/`, `src/warehouse/` | Warehouse | inventory |

Separate IndexedDB databases. They share components at build time and nothing
else. "Update my financial dashboard" means **J&T VIP** unless the owner says
otherwise. Do not modify, rebuild or break the NPMCM dashboard.

## 3. Money

Integer **centavos** everywhere in the model. `formatCurrency` takes **pesos** —
divide by 100 at the boundary and nowhere else. A figure that is out by exactly
100x is this mistake.

## 4. Data safety — corrections are additive, never destructive

- Never delete inventory records, overwrite historical movements, or rewrite a
  closed transaction. A correction creates an **adjustment or reversal**.
- Never silently change, merge or drop data, and never hide a discrepancy.
  Surface it; the owner decides.
- Preserve original imported data. Seeds that repair stored rows must guard on
  provenance — in `parcelSeed.ts` the guard is `raw`: a row the owner imported
  from a file carries that file's record and is never touched, so a hand import
  always beats the seed.
- A cost rate that changes is a **new row with `effectiveFrom`**, and the old
  row is **closed with `effectiveTo`**, never edited. Editing it restates months
  that already closed at a rate nobody was paid.

## 5. Never blend periods

The single most expensive analytical mistake in this repo, walked into three
times. Averaging rates across months that traded differently produces a month
that never happened.

The blended 77-day total reads −5.3% and "losing money". It averages a
September that lost ₱120,380 with an October that made ₱55,866 and describes
neither. Someone could shut a working business over that number.

So: always compute per month **and** per week (`profitByPeriod`), put the
periods **above** the total, and quote the latest period — never the blend —
when stating how the business is doing.

## 6. Measure dispatch cohorts, not delivery dates

Shipping is billed on **dispatch**; COD arrives on **delivery**. Mixing the two
makes a growing week look unprofitable and a shrinking one look fine.

## 7. Tone with the owner

Direct, concrete, no flattery. Report what is verified and what is assumed,
separately. When you get something wrong, say so plainly in one line and move
on. The owner is running a real business on these numbers and has been misled
by a courier before — unexplained figures are worse than missing ones.
