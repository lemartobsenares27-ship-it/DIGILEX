# Module 2 — Dashboard

*Source: User Manual – LHIKE ERP: Sales Warehouse Logistics (Valenin IT Services, updated 5:32 PM, March 13, 2024); User Manual – LHIKE ERP: Finance (Valenin IT Services, updated 2:13 PM, March 21, 2024).*

The Dashboard module is a sidebar group containing two overview screens: **Sales Warehouse Logistics** and **Finance**. Both are read-first, at-a-glance monitoring screens: they summarize figures computed elsewhere in the system (Logistics & Inventory, Finance module, E-commerce) rather than being where those figures are originally entered.

---

# 2.A Sales Warehouse Logistics

## 2.A.1 Learning Objectives

After completing this section, the reader will be able to:

- Explain the purpose of the Sales Warehouse Logistics dashboard and what business question each of its cards answers.
- Read and interpret every summary card, including the full parcel-status funnel from Unfulfilled through Delivered/Returned.
- Use the date-range and status-date sorting controls to monitor a specific day, week, or custom period.
- Open and interpret the detail tables behind the Total Sales, Fulfilled Parcel, and Unfulfilled Parcel cards.
- Recognize the difference between order-date-based and shipped-out-date-based parcel views, and choose the correct one for a given question.

## 2.A.2 Business Purpose

**Why this screen exists.** Sales Warehouse Logistics is "a crucial aspect of modern supply chain management that focuses on the efficient movement and storage of goods within a warehouse facility. It encompasses various activities including inventory management, order fulfillment, and shipping coordination" — all aimed at ensuring timely and accurate delivery of products to customers. The dashboard exists so that anyone responsible for that chain can see, in one screen, where every parcel currently stands.

**How it helps the business.** Without this screen, answering "how many parcels shipped today are still in transit?" would require manually cross-referencing courier tracking pages against an order list. The dashboard answers it in one glance, and lets the user click through to the underlying detail when a summary number needs explaining.

**Who uses it.** Warehouse supervisors, logistics coordinators, and management (for a daily operational pulse-check).

**Departments involved.** Warehouse, Logistics, Customer Service (for parcel-status inquiries), Management.

**Dependencies.** Depends on order and parcel data maintained in the Logistics & Inventory module (Module 7) and order/sales data originating in the E-commerce and Pancake Integration modules (Modules 3–4). This dashboard is a *read* surface; corrections to the underlying data are made in those source modules, not here.

## 2.A.3 Concepts

**Parcel status funnel.** Every order's parcel passes through a defined sequence of statuses from the moment it is placed to its final outcome:

```
   Sales Order Placed
          ↓
      UNFULFILLED  (sub-statuses: New · Encoded · ODZ/INC · PPW)
          ↓
      FULFILLED / SHIPPED OUT   (Dispatched / Pick-up)
          ↓
      IN-TRANSIT   (Detained · In-Transit · Problematic)
          ↓
      ON-DELIVERY  (On-Delivery · Delivering)
          ↓
   ┌──────┴──────┐
   ↓             ↓
DELIVERED    FOR RETURN (For Return · Returning)
                  ↓
              RETURNED  →  TOTAL RTS
```

**RTS** (Return to Sender/Shipper) is the terminal status for a parcel that could not be delivered and has been returned; "Total RTS" is shown both as a count/amount and as a percentage of relevant parcels, giving a return-rate KPI at a glance.

**Order-date basis vs. shipped-out-date basis.** The dashboard's detail views distinguish two ways of grouping the same parcels: by the date the *order* was placed, or by the date the parcel was *shipped out*. These will show different parcels for the same calendar date, because a parcel shipped out today may have been ordered days earlier. Section 2.A.6 explains when to use each.

**Reservation vs. cancellation in Total Sales.** The Total Sales figure specifically **excludes reserved (not-yet-confirmed) sales** but **includes cancelled sales** in its computation — an important distinction when reconciling this number against other reports.

## 2.A.4 Navigation

- **Sidebar:** DASHBOARD > **Sales Warehouse Logistics** (highlighted when active).
- **Breadcrumb:** "Sales Warehouse Logistics ›"
- **Date-range selector:** top right of the content area, showing the active range (e.g., "MARCH 01, 2024 – MARCH 13, 2024"), opening the standard calendar picker (Today / Yesterday / Last 7 Days / Last 30 Days / This Month / Last Month / Custom).
- **Status-date sort buttons:** a row of three buttons — **Parcel Status Date**, **Shipped Out Date**, **Sales Order Date** — controlling which date field the lower funnel cards are computed against.

## 2.A.5 Feature Breakdown

Numbered to match the source manual's figure callouts.

1. **Sidebar menu button** — navigates to the Sales Warehouse Logistics dashboard from anywhere in the system.
2. **Date sort button** (top right) — opens the calendar date-range picker described in Section 1.4; drives every figure on the page.
3. **Today's Sales card** — a dark, full-width card at the top of the page showing the running total of sales recorded *today* specifically, independent of whatever custom range is selected below it — a quick "how's today going" figure that doesn't require changing the date filter.
4. **Clickable summary cards — Total Sales / Fulfilled / Unfulfilled:**
   - **Total Sales** (blue) — total sales amount for the selected range; click to open the detail table (see 4.1 below).
   - **Fulfilled** (teal/green) — count/amount of parcels that have been fulfilled (shipped) in the range; click to open the detail table (4.2).
   - **Unfulfilled** (yellow) — count/amount of parcels not yet fulfilled; click to open the detail table (4.3).
5. **Parcel-status funnel cards** — a colored grid of cards showing the amount held at each stage of the parcel funnel:
   - **Shipped Out** *(Dispatched/Pick-up)* — teal
   - **ODZ / Incomplete** — orange (ODZ = Out-of-Delivery-Zone or a similarly incomplete/undeliverable-address condition)
   - **Unfulfilled / Last Month** — purple, a carry-over figure for orders from the prior month still unfulfilled
   - **In-Transit** *(Detained, In-Transit, Problematic)* — cyan/teal
   - **On-Delivery** *(On-Delivery, Delivering)* — orange
   - **Delivered** — navy, shown with a delivery-rate percentage
   - **For Return** *(For Return, Returning)* — red/coral
   - **Returned** — red
   - **Total RTS** — red, shown with an RTS-rate percentage
6. **Status-date sort buttons** for the funnel cards in item 5: **Parcel Status Date**, **Shipped Out Date**, **Sales Order Date** — re-bases the funnel cards to whichever date dimension is selected.

### Detail Tables (Modal Pop-ups)

**4.1 — Total Sales detail.** Opens a modal titled "TOTAL SALES" with the note *"Reserved are excluded, while cancellations are included."* Table columns: **Date, Label, Parcel, Amount**. Use this to see the exact orders composing the headline Total Sales figure for the selected range.

**4.2 — Fulfilled Parcel detail.** Opens a modal titled "Fulfilled Parcel" explaining two possible bases:
- *Order Date based Parcel* — shipped/moving parcels based on a specific **order date**.
- *Shipped Out Date based Parcel* — shipped/moving parcels based on a specific **shipped out date**, including various order dates falling within the specified shipped-out window.

Table columns: **Date, Label, Parcel, Amount**.

**4.3 — Unfulfilled Parcel detail.** Opens a modal titled "Unfulfilled Parcel" with the note *"based on your daily sales. The returning values are as of today."* Breaks unfulfilled parcels down by sub-status: **New, Encoded, ODZ/INC, PPW**. Table columns: **Date, Label, Parcel, Amount**.

All three modals close via the **Close** button.

## 2.A.6 Step-by-Step SOP

### SOP 2.A-1: Daily Warehouse/Logistics Status Check

**Purpose.** Give a warehouse or logistics lead a repeatable, once-per-shift check of parcel health.

**Prerequisites.** An LHIKE ERP account with access to the Dashboard module.

**Steps.**
1. Navigate to **Dashboard > Sales Warehouse Logistics**.
2. Confirm the date-range selector is set to the intended period (typically **Today** for a shift-start check).
3. Read the **Today's Sales** card for the day's running total.
4. Scan the funnel cards (Shipped Out → In-Transit → On-Delivery → Delivered / For Return → Returned → Total RTS) left to right, top to bottom, to spot any stage with an unexpectedly high count.
5. If a stage looks abnormal, click the related summary card (Total Sales / Fulfilled / Unfulfilled) to open its detail table and identify the specific parcels involved.
6. If the concern is about return rate specifically, note the **Total RTS** percentage and compare it against your organization's normal range (define this threshold locally; this manual does not assert a universal "acceptable" RTS rate).

**Expected Result.** A clear read on today's sales, fulfillment status, and any stuck or at-risk parcels, in under five minutes.

**Verification.** The Today's Sales card total plus per-status funnel totals should be internally consistent — every parcel counted in Total Sales should appear in exactly one funnel stage at any given time.

**Common Mistakes.** ⚠ Comparing a "Parcel Status Date" view against a "Shipped Out Date" view and treating a discrepancy as an error — these are two different lenses on the same data, not two independent counts.

**Recovery.** If a figure looks wrong, open the relevant detail table (4.1–4.3) before assuming a system fault — most apparent discrepancies resolve once the underlying order/parcel list is inspected directly.

**Best Practices.** ✅ Perform this check at both shift-start and shift-end. ✅ Use the **Shipped Out Date** basis when auditing "what did we ship today," and the **Sales Order Date** basis when auditing "what did we sell today," since these answer different questions.

### SOP 2.A-2: Investigating a Total Sales Discrepancy

**Purpose.** Explain a Total Sales figure that does not match an external report (e.g., a courier's own sales count).

**Prerequisites.** Access to the Sales Warehouse Logistics dashboard.

**Steps.**
1. Click the **Total Sales** card to open its detail modal.
2. Remember the modal's stated rule: reserved sales are excluded, cancelled sales are included.
3. Compare the **Date, Label, Parcel, Amount** rows against the external report line by line.
4. Identify whether the discrepancy is explained by a reserved order (excluded here but perhaps included in the external report) or a cancelled order (included here but perhaps excluded elsewhere).

**Expected Result.** The gap between LHIKE ERP's Total Sales and the external figure is fully attributable to the reserved/cancelled treatment rule, or is isolated to a specific, identifiable set of orders for escalation.

**Verification.** Sum of the detail table's Amount column equals the headline Total Sales card figure.

**Common Mistakes.** ⚠ Assuming Total Sales and Gross Revenue (Finance dashboard) are the same figure — they are computed from different rules and are not expected to match without adjustment.

**Recovery.** If rows appear to be missing or duplicated in the detail table, escalate to the Logistics & Inventory module data owner rather than editing figures from this read-only dashboard.

**Best Practices.** ✅ Run this SOP as part of month-end close, before the Finance module's Income Statement is finalized (Module 6).

## 2.A.7 Decision Tree — Parcel Stuck in a Status

```
Parcel appears stuck (no status change for an unusual length of time)?
       ↓
      YES
       ↓
Which stage is it stuck in?
       ↓
   ┌─────────────┬─────────────────┬───────────────────┐
   ↓             ↓                 ↓                    ↓
UNFULFILLED   SHIPPED OUT/     IN-TRANSIT/          FOR RETURN
(New/Encoded/  IN-TRANSIT       ON-DELIVERY          / RETURNED
 ODZ-INC/PPW)      ↓                 ↓                    ↓
   ↓          Check courier    Check courier         Confirm return
Check order    tracking via     tracking; escalate     received at
 details in    Logistics &      to courier if          warehouse
 Logistics &   Inventory        stalled beyond           ↓
 Inventory      module           normal transit time   Process RTS
 module            ↓                 ↓                 per Module 7 SOP
   ↓          Update status    Update status               ↓
Resolve         once courier    once resolved          Close incident
address/       confirms
encoding issue
```

## 2.A.8 Real Business Scenario

A customer places an order through the company's Facebook page. The order is captured by the E-commerce/Pancake Integration flow (Modules 3–4) and appears in LHIKE ERP as a new sales order, initially in **Unfulfilled** status (sub-status **New**). Warehouse staff pick and pack the item; once handed to the courier, the parcel status advances to **Shipped Out (Dispatched/Pick-up)**, then **In-Transit**, then **On-Delivery**. The Sales Warehouse Logistics dashboard reflects each transition in real time, so a manager reviewing the dashboard mid-afternoon can see the order has left In-Transit and is now On-Delivery without contacting the warehouse directly. When the courier confirms delivery, the parcel moves to **Delivered**, and — because the Finance module reads from the same underlying data — the corresponding revenue becomes part of the Finance dashboard's Gross Revenue and Operating Revenue figures (see Section 2.B) without any separate manual entry.

```
Customer Order (Facebook)
        ↓
   ERP Sales Order (Unfulfilled → New)
        ↓
   Warehouse Pick & Pack
        ↓
   Shipped Out (Dispatched/Pick-up)
        ↓
   In-Transit
        ↓
   On-Delivery
        ↓
   Delivered  ──────────────►  Finance Dashboard (Gross/Operating Revenue)
```

## 2.A.9 Common Mistakes

⚠ **Reading the funnel cards against the wrong date basis.** Comparing a "Shipped Out Date" figure to a "Sales Order Date" figure and treating the difference as an error.
⚠ **Confusing Unfulfilled/Last Month (a carry-over figure) with new Unfulfilled orders from the current period.** These are shown as separate cards specifically to avoid this confusion — read the card labels carefully.
⚠ **Treating Total RTS percentage as a same-day metric** without checking whether the underlying parcels span multiple order dates.

## 2.A.10 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| Today's Sales shows ₱0 unexpectedly | Date range/timezone mismatch, or no orders yet recorded today | Check the date-range selector; confirm with Logistics & Inventory whether orders have been entered | Correct the date range, or wait for order entry to catch up | Logistics & Inventory data owner |
| Total Sales detail table doesn't sum to the card figure | A reserved or cancelled order is being miscounted | Re-check the "reserved excluded / cancelled included" rule against each row | Re-open the modal after confirming date range; recount manually if needed | System administrator if the rule appears violated |
| Funnel card counts don't add up to Total Sales | Parcels currently mid-transition between statuses, or filtered by a different date basis than Total Sales | Check which date basis (Parcel Status/Shipped Out/Sales Order) is active | Switch all views to the same date basis before comparing | Logistics & Inventory data owner |
| A specific parcel is missing from all dashboard views | Order not yet synced from source (e.g., Pancake Integration) | Check Module 4 (Pancake Integration) sync status | Trigger/verify sync per Module 4 SOP | Pancake Integration administrator |

## 2.A.11 Security

🔒 This dashboard is a read-only monitoring surface; it does not itself expose data-editing controls. Access to the Sales Warehouse Logistics dashboard should be granted per role via the User Management module (Module 9) — typically warehouse, logistics, customer service, and management roles.

## 2.A.12 Suggested Screenshots

📷 **Full Sales Warehouse Logistics dashboard, populated with real data** — caption: "The parcel-status funnel at a glance, from Unfulfilled through Delivered/RTS."
📷 **Date-range calendar picker, expanded** — caption: "Quick-select date ranges: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Custom."
📷 **Total Sales detail modal** — caption: "Total Sales detail: reserved excluded, cancellations included."
📷 **Fulfilled Parcel detail modal** — caption: "Fulfilled parcels by order date vs. shipped-out date."
📷 **Unfulfilled Parcel detail modal** — caption: "Unfulfilled parcels broken down by New, Encoded, ODZ/INC, and PPW."

## 2.A.13 Administrator Notes

- Confirm the parcel status taxonomy (New, Encoded, ODZ/INC, PPW, Shipped Out, In-Transit, On-Delivery, Delivered, For Return, Returned, RTS) is consistently used by whichever integration feeds order/parcel data (Pancake Integration, manual entry) — inconsistent status naming at the source will corrupt this dashboard's accuracy.
- Periodically verify that dashboard totals reconcile against the Logistics & Inventory module's underlying records (see Module 7 once documented).

## 2.A.14 Manager Notes

- **KPIs to monitor daily:** Today's Sales, Unfulfilled count, Total RTS %.
- **KPIs to monitor weekly:** trend of In-Transit/On-Delivery aging (parcels sitting too long in one stage), Delivered rate.
- Use the **Shipped Out Date** basis for operational (warehouse throughput) reviews, and the **Sales Order Date** basis for sales-performance reviews.

## 2.A.15 Employee Notes

**Daily responsibilities:** review Unfulfilled and In-Transit/On-Delivery cards at shift start; flag any parcel that appears stuck per the Decision Tree in Section 2.A.7.

**Do's:** ✅ Use the detail tables to verify a figure before reporting it up the chain.
**Don'ts:** ⚠ Don't manually recalculate figures in a side spreadsheet instead of using the built-in detail tables — they exist precisely to avoid that.

---

# 2.B Finance (Dashboard Overview)

*Note: this is the Dashboard-group "Finance" overview screen. The deeper Finance module (Income Statement, Book Keeping, Reimbursement, Utility Expense, Settings) is documented separately in Module 6 once its source manual is supplied.*

## 2.B.1 Learning Objectives

After completing this section, the reader will be able to:

- Explain what each of the seven headline cards on the Finance dashboard represents.
- Use the date-range selector to review the company's financial position for a specific period.
- Read the Bookkeeping Summary card to see per-bank running balances and expense totals.
- Understand why "Actual Company Fund" is shown as a restricted/secured figure.

## 2.B.2 Business Purpose

**Why this screen exists.** "Finance refers to the management of money, investments, and financial activities within an individual, organization, or economy. It encompasses a broad range of activities, including the creation, allocation, and utilization of financial resources." The Finance dashboard exists to give a single-screen answer to "what is our financial position right now," pulling from revenue, expense, ad-spend, and banking data that would otherwise require consulting several separate reports.

**How it helps the business.** Management and finance staff get one screen to check gross revenue, total operating expenses, and cash position without opening the Income Statement or Book Keeping screens individually.

**Who uses it.** Finance/bookkeeping staff, management, business owners.

**Departments involved.** Finance, Management.

**Dependencies.** Pulls from underlying figures recorded via the deeper Finance module (Module 6), E-commerce ad-spend tracking (Module 3), and Logistics & Inventory purchase/shipping data (Module 7).

## 2.B.3 Concepts

**Gross Revenue vs. Operating Revenue.** Gross Revenue is the top-line sales figure before deductions; Operating Revenue reflects revenue after operating-related deductions are applied. The dashboard shows both side by side specifically so a viewer does not mistake one for the other.

**Opex + Revolving Fund.** The dashboard tracks "Total Opex + Revolving Fund" as a combined figure, alongside "Revolving Fund" shown separately — the revolving fund being a working-capital pool used to fund ongoing operating expenses (e.g., COG purchases, ad spend, shipping) between revenue cycles.

**Bookkeeping Summary (per bank).** The dashboard's bookkeeping summary is organized **by bank account**, each with its own running balance — reflecting that a company may hold funds across multiple bank accounts, and that "cash position" is meaningfully different from "revenue" or "profit."

**Actual Company Fund.** Shown as a distinct, visually secured card (padlock icon in the source screenshot) — signaling that this figure is treated as sensitive and its visibility may be restricted by role, unlike the other summary cards.

## 2.B.4 Navigation

- **Sidebar:** DASHBOARD > **Finance** (distinct from the deeper FINANCE module group further down the sidebar, which contains Income Statement, Book Keeping, Reimbursement, Utility Expense, and Settings — see Module 6).
- **Breadcrumb:** "Finance ›"
- **Date-range selector:** top right, identical control to the one described in Section 2.A.4 (Today / Yesterday / Last 7 Days / Last 30 Days / This Month / Last Month / Custom).

## 2.B.5 Feature Breakdown

Numbered to match the source manual's figure callouts.

1. **Sidebar option menu for Finance** — navigates to this dashboard.
2. **Date sort button** — opens the same calendar range picker as the Sales Warehouse Logistics dashboard (see 2.B.6, Figure 2).
3. **Headline dashboard cards** — company fund and expense overview:
   - **Gross Revenue** (teal)
   - **Total Opex + Revolving Fund** (purple)
   - **Operating Revenue** (blue, shown to two decimal places, e.g. "₱0.00")
   - **COG Purchase** (yellow/gold) — Cost of Goods purchased
   - **Adspent** (red/pink) — advertising spend
   - **Revolving Fund** (orange)
   - **Shipping Fee** (orange)
4. **Bookkeeping Summary (Banks)** — a per-bank panel (e.g., shown as "BPI" in the source screenshot) with a **Running Balance** figure; expandable/detailed to show a table (see 4.1 below).
5. **Actual Company Fund** — a dark, padlock-icon card showing the company's actual current fund position, visually distinguished from the other (unrestricted) summary cards.

### Detail View

**4.1 — Bookkeeping Summary detail.** For the selected bank and date range, shows a table with **Type of Expense** rows and **Debit** / **Credit** columns, culminating in a **TOTAL** row summing both columns for the period. This lets a finance user see, per bank, exactly how much moved in and out and under what expense classification, rather than only a net running balance.

## 2.B.6 Step-by-Step SOP

### SOP 2.B-1: Daily/Weekly Financial Pulse Check

**Purpose.** Give finance staff or management a fast, repeatable check of the company's financial position.

**Prerequisites.** LHIKE ERP account with access to the Dashboard > Finance screen.

**Steps.**
1. Navigate to **Dashboard > Finance**.
2. Set the date-range selector to the period under review (e.g., **This Month** for a monthly pulse check).
3. Read **Gross Revenue** and **Operating Revenue** together to understand top-line vs. post-deduction revenue for the period.
4. Read **Total Opex + Revolving Fund**, **COG Purchase**, **Adspent**, and **Shipping Fee** to understand where money is being spent.
5. Open the **Bookkeeping Summary** panel for each bank to check running balances and the Debit/Credit breakdown (4.1).
6. Note the **Actual Company Fund** figure as the period-end cash position (subject to your role's permission to view it).

**Expected Result.** A complete, same-day picture of revenue, expense composition, and cash position for the selected period.

**Verification.** Operating Revenue should be consistent with Gross Revenue minus the deductions your organization applies (confirm the exact deduction rule with the Finance module's Income Statement documentation once Module 6 is available).

**Common Mistakes.** ⚠ Treating Gross Revenue and Operating Revenue as interchangeable when reporting upward — they answer different questions and should be reported together, not substituted for each other.

**Recovery.** If a figure looks incorrect, drill into the Bookkeeping Summary detail (4.1) for the specific bank/period before assuming the dashboard itself is wrong.

**Best Practices.** ✅ Perform this check at the same cadence every week (e.g., every Monday morning for the prior week) so trend comparisons are meaningful. ✅ Cross-check this dashboard against the Sales Warehouse Logistics dashboard's Total Sales for the same period as a sanity check before month-end close.

## 2.B.7 Real Business Scenario

At the end of a delivery cycle (see Section 2.A.8), a parcel is marked **Delivered**. The Finance dashboard's **Gross Revenue** for the period increases to reflect the completed sale, while **Adspent**, **COG Purchase**, and **Shipping Fee** cards reflect the costs already incurred to acquire, produce, and ship that order — giving management a same-period view of whether that class of order was actually profitable, instead of waiting for a manual month-end reconciliation.

```
Delivered Parcel (from Sales Warehouse Logistics)
              ↓
     Recognized in Gross Revenue
              ↓
   Netted against Adspend + COG Purchase + Shipping Fee
              ↓
        Operating Revenue (Finance Dashboard)
              ↓
   Bookkeeping Summary (per bank) reflects cash movement
              ↓
        Actual Company Fund (period-end cash position)
```

## 2.B.8 Decision Tree — Cash Position Looks Wrong

```
Actual Company Fund figure looks incorrect?
        ↓
       YES
        ↓
Check Bookkeeping Summary (per bank) Running Balance
        ↓
   Does it match your own bank statement?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Check for   The discrepancy is upstream —
missing/    check Gross Revenue / Adspent /
duplicate   COG Purchase / Shipping Fee figures
entries     for the period instead
   ↓           ↓
Escalate to   Escalate to whoever owns
Bookkeeping   the relevant source module
data owner    (E-commerce Ads, Logistics
(Module 6)    & Inventory)
```

## 2.B.9 Common Mistakes

⚠ **Confusing Gross Revenue with Operating Revenue** when communicating results to stakeholders.
⚠ **Reading the Bookkeeping Summary for one bank as if it represented the company's total cash position** — the **Actual Company Fund** card, not a single bank's running balance, is the company-wide figure.
⚠ **Not adjusting the date range before reviewing** — since every headline card is period-bound, an outdated range silently produces a misleading snapshot.

## 2.B.10 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| Operating Revenue shows ₱0.00 despite sales activity | Date range excludes the activity, or deductions have not yet been posted | Check date-range selector; check whether Adspend/COG/Shipping figures are also ₱0 for the same range | Correct date range; confirm expense posting is up to date | Finance module data owner |
| Bookkeeping Summary running balance doesn't match the bank's own statement | Unposted transactions, timing difference, or a data-entry error in Book Keeping (Module 6) | Open the 4.1 detail table and compare Debit/Credit rows against the bank statement line by line | Correct the entry in the Book Keeping screen (Module 6) | Finance module data owner |
| Actual Company Fund is not visible to a user who needs it | Role/permission restriction | Confirm the user's role in User Management (Module 9) | Request a role/permission update from the system administrator | System administrator |

## 2.B.11 Security

🔒 The **Actual Company Fund** card is visually distinguished with a lock icon in the source material, indicating it is treated as a restricted figure. Administrators should confirm, via the User Management module (Module 9, once documented), exactly which roles can view this card, and should not assume every user who can reach the Finance dashboard can see it.

## 2.B.12 Suggested Screenshots

📷 **Full Finance dashboard, populated with real data** — caption: "Company-wide financial overview: revenue, expenses, and cash position in one screen."
📷 **Bookkeeping Summary detail table (Debit/Credit by expense type)** — caption: "Per-bank bookkeeping detail behind the Running Balance figure."
📷 **Actual Company Fund card, close-up showing the lock icon** — caption: "A restricted figure — visibility is role-dependent."

## 2.B.13 Administrator Notes

- Confirm which roles can see the **Actual Company Fund** card as part of the standard User Management access review (see Module 9 and the Security chapter once complete).
- Ensure bank accounts represented in the Bookkeeping Summary panel are kept in sync with the banks actually configured in Finance module settings (Module 6, Settings – Banks).

## 2.B.14 Manager Notes

- **KPIs to monitor:** Gross Revenue vs. Operating Revenue trend, Adspend as a percentage of Gross Revenue (a proxy for ROAS health — cross-check against Module 3's dedicated ROAS tracking once documented), Actual Company Fund trend period over period.
- Use this dashboard as the standing agenda item for weekly finance/ops review meetings.

## 2.B.15 Employee Notes

**Daily responsibilities (finance staff):** confirm the Bookkeeping Summary for each active bank reconciles to expectation before end of day.

**Do's:** ✅ Report Gross Revenue and Operating Revenue together, never one without the other, to avoid misleading stakeholders.
**Don'ts:** ⚠ Don't treat a single bank's Running Balance as the company's total cash position.

---

## 2.C Templates

**Daily Operations Checklist (Dashboard review)**

```
[ ] Reviewed Sales Warehouse Logistics — Today's Sales
[ ] Reviewed Unfulfilled count and sub-statuses (New/Encoded/ODZ-INC/PPW)
[ ] Reviewed In-Transit / On-Delivery for stuck parcels
[ ] Reviewed Delivered rate and Total RTS %
[ ] Reviewed Finance dashboard — Gross Revenue vs. Operating Revenue
[ ] Reviewed Bookkeeping Summary running balances per bank
[ ] Flagged any anomaly to the relevant module owner
[ ] Signed off by: ______________  Date/Time: ______________
```

---

*Next: Module 3 — E-commerce (pending source material)*
