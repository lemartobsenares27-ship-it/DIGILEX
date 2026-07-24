# Module 4 — Pancake Integration

*Source: consolidated from the Pancake-specific procedures embedded in the E-commerce module's official manuals — Pages & Store (Apr 12, 2024, Steps 4–13), Sales Tracker: Download Sales from 3P Apps (Apr 15, 2024), Update Tracking Number [Pancake] (Apr 15, 2024), and User ID (Apr 16, 2024); and the Pancake API-key page-restriction feature documented in Logistics & Inventory's Unit Codes manual (Apr 16, 2024). This module exists in the LHIKE ERP course curriculum as its own numbered module ("Tracking Numbers for Pancake Orders"); this chapter gathers the mechanics that the source manuals document module-by-module inside E-commerce and Logistics & Inventory screens, into one place.*

## 4.1 Learning Objectives

After completing this module, the reader will be able to:

- Explain what Pancake POS is and how LHIKE ERP integrates with it.
- Connect a Page/Store to a Pancake shop using Shop ID, API Key, and (for combined shops) Page ID.
- Pull confirmed Pancake orders into the Sales Tracker, and understand the difference between the automatic Download flow and a manual Excel upload.
- Push tracking numbers back to Pancake so couriers and customers see accurate status on the Pancake side.
- Link a LHIKE ERP user account to a Pancake Facebook ID for correct order/CSR attribution.
- Restrict a Unit Code (Module 7) to specific Pancake-connected pages.

## 4.2 Business Purpose

**Why this module exists.** Pancake is the point-of-sale/order-management platform many Philippine COD e-commerce sellers already run their storefront and courier bookings through. Rather than requiring staff to re-key every order into LHIKE ERP by hand, this integration lets LHIKE ERP **pull** confirmed orders from Pancake automatically or in bulk, and **push** tracking numbers back — keeping both systems in sync without duplicate data entry.

**How it helps the business.** Eliminates the double-entry and drift risk of maintaining order status in two systems; lets warehouse and finance work entirely inside LHIKE ERP while Pancake continues to handle the customer-facing storefront/chat/courier-booking experience.

**Who uses it.** E-commerce/marketing staff (initial Page connection), warehouse/logistics staff (tracking-number sync), system administrators (API key management).

**Departments involved.** E-commerce, Warehouse/Logistics, IT/System Administration.

**Dependencies.** Requires a Page already registered in **E-commerce > Pages & Store** (Module 3) and, for tracking-number sync, requires Fulfillment/Shipped Out data already recorded in **Logistics & Inventory** (Module 7).

## 4.3 Concepts

**Pancake Shop ID.** A numeric identifier unique to a Pancake shop, visible in the shop's own dashboard URL (`pos.pancake.ph/shop/<Shop ID>/overview`).

**API Key (Webhook).** A secret key generated inside Pancake (**Configuration > Advance > Webhook – API**) that authorizes LHIKE ERP to read/write data for that shop. If none exists yet, Pancake's own **Add** button generates one.

**Combined Shop.** Pancake supports linking multiple individual Facebook Pages/Instagram accounts under one "COMBINE" shop view. Each individual page still gets its own **Pancake Page ID for combine shop** value (found under Pancake's **Configuration > Sales channels > Social network**), entered separately in LHIKE ERP for each linked page.

**Sender Name / Intern Name.** Optional fields on the Pages & Store Pancake panel identifying which staff member's name/intern label should be associated with orders synced from that page.

**Download vs. Upload.** Two distinct ways orders enter the Sales Tracker from Pancake-adjacent sources:
- **Download Sales from 3P Apps** — an automated pull directly from Pancake POS for a date/time range, filtered by order status and (optionally) specific pages.
- **Upload Sales Monitoring** — a manual bulk Excel upload, used for Facebook/Shopify, TikTok, Lazada, or Shopee order exports that aren't coming through Pancake's own confirmed-order feed (documented in Module 3, Section 3.8.1).

**Update Tracking Number [Pancake].** A one-way push from LHIKE ERP back to Pancake: once a parcel is fulfilled/shipped in LHIKE ERP (Module 7), this feature writes the tracking number onto the corresponding order in Pancake, which is what lets customers and couriers see accurate status on the Pancake side.

**User ID / Facebook ID linking.** Pancake attributes conversations and orders to a Facebook-connected agent identity. Mapping each LHIKE ERP user account to their Pancake-side Facebook ID (via **Sales Tracker > Tools > USER ID**) is what allows CSR/agent-level reporting to line up correctly between the two systems.

## 4.4 Navigation

There is no single dedicated "Pancake" sidebar entry — Pancake integration surfaces are distributed across:
- **E-commerce > Pages & Store** (Add/Edit Page — Pancake Set Up panel)
- **E-commerce > Sales Tracker > Tools** (Download Sales from 3P Apps, Update Tracking Number [Pancake], USER ID)
- **Logistics & Inventory > Inventory > Unit Codes** (Pages with Pancake API Key restriction)

## 4.5 Step-by-Step SOP

### SOP 4-1: Connect a Page to a Pancake Shop

**Purpose.** Link a newly created (or existing) Page/Store to its Pancake POS shop so orders can sync.

**Prerequisites.** The Page already exists in Pages & Store (Module 3, SOP 3-1); admin access to the corresponding Pancake POS account.

**Steps.**
1. Open the Page in LHIKE ERP (**Add Page/Store** or **Edit Page/Store**) and expand **Show Settings** under **Pancake Set Up**.
2. In Pancake POS, open the shop and copy the **Shop ID** from the dashboard URL (`pos.pancake.ph/shop/<numbers>/overview`).
3. Paste it into LHIKE ERP's **Pancake Shop ID** field.
4. In Pancake, go to **Configuration > Advance > Webhook – API**; copy an existing **API Key**, or click **Add** to generate one if none exists.
5. Paste it into LHIKE ERP's **API Key** field.
6. Fill **Sender Name** / **Intern Name** if applicable.
7. Click **Submit.**

**Expected Result.** The Page now shows Pancake Shop ID and API Key populated; orders confirmed in that Pancake shop become eligible for Download Sales from 3P Apps (SOP 4-3).

**Verification.** Confirm the Shop ID matches exactly what appears in the Pancake dashboard URL — a mismatched or truncated ID is the most common cause of sync failure.

**Common Mistakes.** ⚠ Copying only part of the Shop ID or API Key (trailing characters cut off during copy-paste). ⚠ Regenerating the API Key in Pancake without updating it in LHIKE ERP afterward, silently breaking the sync.

### SOP 4-2: Connect a Combined (Multi-Page) Shop

**Purpose.** Handle a Pancake "COMBINE" shop that serves multiple Facebook Pages/Instagram accounts under one Pancake shop.

**Steps.**
1. In Pancake POS Dashboard, open the **COMBINE** shop tile.
2. Go to **Configuration > Sales channels > Social network** and copy the **Page ID** listed for the specific linked page you're configuring (each linked page has its own ID in this list).
3. In LHIKE ERP, add or edit the Page/Store entry for that specific linked page (e.g., "Lance the Dog Shop"), and paste the copied value into **Pancake Page ID for combine shop**.
4. The **Pancake Shop ID** and **API Key** fields are the same for every page under one combined shop — fill them identically across each linked page's entry.
5. Repeat steps 2–4 for every individual page linked under the combine shop, then **Submit** each.

**Verification.** Each individual linked page (e.g., "Twiceyy," "Lance the Dog") should have its own distinct Pancake Page ID, while sharing one Shop ID/API Key pair.

### SOP 4-3: Download Confirmed Orders from Pancake POS

**Purpose.** Pull confirmed orders from Pancake into the Sales Tracker without manual re-entry.

**Prerequisites.** Page already connected per SOP 4-1/4-2; orders exist in Pancake with status **Confirmed**.

**Steps.**
1. **E-commerce > Sales Tracker > Tools > Download Sales from 3P Apps.**
2. Set **Pancake Order Date From** / **Pancake Order Date To** (the confirmed-order window in Pancake) and **Order Date Set** (the date these orders should be dated as in LHIKE ERP).
3. Set **Status** (Canceled, Confirmed, Delivered, Partial Return, Printed) to match what you're pulling — this manual specifically covers pulling **Confirmed** orders.
4. Set **App** to **Pancake-POS**.
5. **Pages** — select which page(s) should receive these orders. ⚠ **If no page is selected, all pages in the ERP will receive the order** — this is the single most consequential field on this screen.
6. Optionally set **CSR** and **Order Status** filters.
7. Click **Update.**

**Expected Result.** A success message reports how many new orders were added, how many were skipped (already existing), and how many "unconfirmed pages" were found; the orders then appear in the Sales Tracker table.

**Verification.** ✅ Per the on-screen reminder: *"ALWAYS REMEMBER to check the total entries and the total amount of your data both ERP & POS"* — reconcile the Sales Tracker's new row count and total amount against Pancake's own order list for the same window before considering the sync complete.

**Common Mistakes.** ⚠ Leaving **Pages** blank when only one specific page's orders should sync — this floods every page with the same batch of orders. ⚠ Running this repeatedly for overlapping date windows without checking the "skipped" count, risking confusion about whether duplicates were created (they are not, per the dedupe logic, but the skipped count should still be reviewed).

### SOP 4-4: Push Tracking Numbers Back to Pancake

**Purpose.** Once orders are fulfilled/shipped in LHIKE ERP (Module 7), write the resulting tracking numbers back onto the corresponding Pancake orders.

**Prerequisites.** Orders already fulfilled and carrying tracking numbers in LHIKE ERP (Module 7, Sections 7.11–7.12).

**Steps.**
1. **Sales Tracker > Tools > Update Tracking Number [Pancake].**
2. Set **Order Date** and **Pages** (up to 4 pages per run).
3. Click **Submit.**

**Expected Result.** A success message states how many tracking numbers were successfully updated to Pancake; on the Pancake side, the corresponding orders show a checkmark/updated tracking number against the courier.

**Verification.** Spot-check one updated order directly in the Pancake Orders screen to confirm the tracking number and courier now display correctly there.

**Common Mistakes.** ⚠ Attempting to select more than 4 pages in one run — the field is capped at 4; run it again for additional pages.

### SOP 4-5: Link a User's Facebook ID for Attribution

*(See Module 3, Section 3.8.2 for the full step-by-step — summarized here as it is core Pancake plumbing.)*

1. **Sales Tracker > Tools > USER ID**, locate the LHIKE ERP user account.
2. Copy that person's **Facebook ID** from their own Pancake **Account Information** screen.
3. Paste it into LHIKE ERP's **Update FB Id** overlay for that user and **Submit.**

### SOP 4-6: Restrict a Unit Code to Specific Pancake Pages

*(See Module 7, Section 7.8 for the full Unit Code procedure — summarized here as it is Pancake-facing configuration.)*

When adding a Unit Code, use **Pages with Pancake API Key** to select which connected pages can sell that bundled code. Leaving it blank makes the code available on **every** connected page by default — treat this as the default-open behavior to watch for.

## 4.6 Workflow Diagram — Order Lifecycle Across Pancake and LHIKE ERP

```
Customer places order on Facebook/Instagram/Page
              ↓
      Order confirmed in Pancake POS
              ↓
  Download Sales from 3P Apps (SOP 4-3)  ──or──  Upload Sales Monitoring (Module 3, 3.8.1)
              ↓
      Order appears in Sales Tracker (LHIKE ERP)
              ↓
   Fulfillment → Shipped Out (Barcode)  (Module 7)
              ↓
  Update Tracking Number [Pancake] (SOP 4-4)
              ↓
   Pancake order shows tracking number/courier status
              ↓
   Customer/courier see accurate status on Pancake side
```

## 4.7 Decision Tree — Orders Not Syncing from Pancake

```
Expected Pancake orders missing from Sales Tracker?
        ↓
       YES
        ↓
Is the Page's Pancake Shop ID / API Key populated and correct?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Re-run      Are the orders actually
SOP 4-1/    marked "Confirmed" in
4-2         Pancake for the date
            range queried?
                 ↓
            ┌────┴────┐
            NO         YES
            ↓           ↓
        Confirm     Check whether "Pages"
        the order   was left blank (routed
        in Pancake  elsewhere) or a narrower
        first       page list excluded it —
                     re-run SOP 4-3 with the
                     correct Pages selection
```

## 4.8 Common Mistakes

⚠ **Regenerating a Pancake API Key without updating LHIKE ERP** — silently breaks all sync for that page until corrected.
⚠ **Leaving "Pages" blank on Download Sales from 3P Apps** when only one page's orders were intended to sync.
⚠ **Forgetting to link a new hire's Facebook ID** (SOP 4-5) — their CSR attribution will be blank or misattributed until this is done.
⚠ **Not reconciling total entries/amount between ERP and POS** after every Download run, per the on-screen reminder in SOP 4-3.

## 4.9 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| Download Sales from 3P Apps returns 0 new orders | Wrong date/time range, or orders not yet Confirmed in Pancake | Check the order's status directly in Pancake | Adjust range or wait for confirmation, then re-run | E-commerce data owner |
| All pages received orders meant for one page | "Pages" field left blank on Download screen | Re-check SOP 4-3 Step 5 | Manually reassign/clean up misrouted orders; re-run with Pages specified | E-commerce data owner |
| Tracking number push fails/reports 0 updated | Order not yet fulfilled in LHIKE ERP, or wrong page selected | Confirm the order has a tracking number from Module 7 | Complete fulfillment first, then retry SOP 4-4 | Logistics & Inventory data owner |
| A CSR's orders show no name/attribution in Pancake reporting | Facebook ID not linked (SOP 4-5) | Check Sales Tracker > Tools > USER ID for that user | Link the Facebook ID | System administrator |
| A Unit Code unexpectedly sells on a page it shouldn't | "Pages with Pancake API Key" left blank at creation | Check the Unit Code's page restriction (Module 7, 7.8) | Edit the Unit Code to restrict to the intended pages | Logistics & Inventory data owner |

## 4.10 Security

🔒 The Pancake **API Key** is a credential that grants read/write access to a shop's order data — treat it with the same care as a password. Do not share it outside the small set of staff/administrators responsible for Page setup, and rotate it in Pancake (then update LHIKE ERP immediately, per the common-mistake above) if it is ever exposed.

## 4.11 Suggested Screenshots

📷 **Pages & Store — Pancake Set Up panel expanded** — caption: "Shop ID, API Key, and combine-shop Page ID — the three fields that connect a Page to Pancake."
📷 **Download Sales from 3P Apps — Pages field** — caption: "Leave blank and every page receives the order; select specific pages to route precisely."
📷 **Update Tracking Number [Pancake] success message** — caption: "Tracking numbers pushed back to Pancake, visible to couriers and customers."
📷 **USER ID table with FB Id (Pancake) column** — caption: "Mapping LHIKE ERP accounts to their Pancake Facebook ID for correct attribution."

## 4.12 Administrator Notes

- Maintain a secure record of which Shop ID/API Key pairs belong to which combined shop, since multiple linked pages share the same pair (SOP 4-2).
- Audit the USER ID table periodically for staff whose FB Id (Pancake) field is still blank.

## 4.13 Manager Notes

- Confirm the weekly reconciliation habit from SOP 4-3's on-screen reminder is actually being followed by whoever runs Download Sales from 3P Apps — this is the single biggest safeguard against ERP/Pancake data drift.

## 4.14 Employee Notes

**Daily responsibilities:** run Download Sales from 3P Apps for the relevant date window each shift; run Update Tracking Number [Pancake] after completing Fulfillment/Shipped Out batches; reconcile totals per SOP 4-3.

**Do's:** ✅ Always double-check the **Pages** selection before clicking Update/Submit on either Download Sales or Update Tracking Number.
**Don'ts:** ⚠ Don't run Download Sales from 3P Apps for a page whose Pancake connection you haven't personally verified is correct.

---

*Next: Module 6 — Finance*
