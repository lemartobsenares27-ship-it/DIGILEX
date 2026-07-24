# Module 7 — Logistics & Inventory

*Source: Valenin IT Services user manuals — Purchase Order (Apr 8, 2024), Supplier (Mar 14, 2024), Product Items (Apr 8, 2024), Unit Codes (Apr 16, 2024), Stocks (Mar 22, 2024), Inventory – Transaction History (Apr 5, 2024), Fulfillment (Mar 21, 2024), Shipped Out (Barcode) (Mar 21, 2024), PPW (Barcode) (Mar 21, 2024), RTS Items (Mar 27, 2024).*

## 7.1 Learning Objectives

After completing this module, the reader will be able to:

- Create, track, and approve a Purchase Order from request through delivery.
- Maintain the Supplier directory and understand its relationship to Purchase Orders.
- Manage Product Items, Unit Codes, and Stocks, and explain how each affects Pancake POS and the Sales Tracker.
- Read Inventory Transaction History to audit stock movement.
- Operate Fulfillment, Shipped Out (Barcode), and PPW (Barcode) to move a parcel from packed to shipped.
- Process RTS (Return to Sender) items through claim upload, scan-and-receive, and scan-and-check.
- Explain how this module's data flows into the Sales Warehouse Logistics dashboard (Module 2) and the Finance module (Module 6).

## 7.2 Business Purpose

**Why this module exists.** This is the operational core of the "L" and "I" in LHIKE: Logistics and Inventory. It is where physical goods are ordered from suppliers, tracked as stock, picked and packed against sales orders, and shipped or returned. Every parcel-status figure shown on the Dashboard (Module 2) and every COG figure shown in Finance (Module 6) originates here.

**How it helps the business.** Replaces manual stock cards, paper purchase requests, and spreadsheet-based courier handoff logs with one auditable system that ties a purchase, to a stock unit, to a shipped parcel, to a bookkeeping entry.

**Who uses it.** Warehouse staff, logistics coordinators, procurement/purchasing staff, and their managers.

**Departments involved.** Warehouse, Logistics, Procurement, Finance (COG figures), Customer Service (RTS/claims).

**Dependencies.** Purchase Orders reference Suppliers. Product Items and Unit Codes are the foundation for Stocks, Fulfillment, and the Sales Tracker's item-coding rules (Module 3). RTS and Fulfillment status feed the Sales Warehouse Logistics dashboard (Module 2) and the Finance module's Warehouse Inventory figure (Module 6).

## 7.3 Concepts

**Purchase Order (PO) lifecycle.** A PO moves through a defined status sequence: **For Approval → Approved → To Pay → Paid → Purchased → Delivered**. Each transition is logged in the PO's History panel (who changed it, when, and any remarks), giving a full audit trail from request to receipt.

**SKU Code vs. Item Code vs. Unit Code.** Three distinct identifiers exist for the same underlying product, each serving a different purpose:
- **SKU Code (Stock Keeping Unit)** — a unique identifier assigned to each product for tracking and management.
- **Item Code** — a unique identifier for a specific product/item within the inventory system, used for tracking, organization, and retrieval.
- **Unit Code** — a standardized identifier representing a specific measurement or bundle of quantity (e.g., a bundled combination of items and quantities sold as one SKU on Pancake POS), facilitating consistent communication of quantity data between LHIKE ERP and Pancake.

**Unit Codes are Pancake-facing bundles.** A Unit Code can combine multiple items and quantities (e.g., "2 x ITEMCODE1, 1 x ITEMCODE2") into a single sellable code, optionally restricted to specific Pancake-connected pages via "Pages with Pancake API Key." If no page is selected, the unit code is available on **all** pages by default.

**Parcel-status funnel (Warehouse side).** A parcel moves: **Fulfillment (picked/packed) → Shipped Out (Barcode) → [In-Transit/On-Delivery, tracked by courier] → Delivered**, or diverts to **PPW (pending printed waybill) → RTS Items (returned)**. This is the same funnel introduced in Module 2, now shown from the warehouse operator's side of the system.

**PPW (Pending Printed Waybill).** A parcel whose waybill has not yet been printed/processed by the courier — a holding state between Fulfillment and confirmed Shipped Out.

**RTS (Return to Sender).** A parcel returned instead of delivered (incorrect address, recipient refusal, etc.). RTS items pass through three stages in this module: **Upload Claims** (register a returned tracking number as a claim against the courier/company), **Scan & Receive** (confirm physical receipt at the warehouse), and **Scan & Check** (verify and update condition/status).

## 7.4 Navigation

- **Sidebar:** LOGISTIC & INVENTORY > **Purchase Order**, **Supplier**, **Inventory** (Product Items, Unit Codes, Stocks, Transaction History), **Warehouse** (Fulfillment, Shipped Out (Barcode), PPW (Barcode)), **RTS Items**, **Settings**.
- Every list screen in this module follows the same pattern: a filterable/searchable table, a **Tools** or button cluster (top right) for bulk actions (Add New, Upload, Export, Archives), and a row-level **Actions** column (View/magnifying glass, Edit/pencil, Delete/cross, Archive/folder, Copy).

## 7.5 Purchase Order

### Feature Breakdown

1. **Sidebar menu** — navigates to the Purchase Order list.
2. **Table** — every PO with Issue Date, Delivery No., Cust. PO No., Control No., and Status (e.g., "For Approval – Delivery balance," "Delivered," "Delivered – Cog balance").
3. **Create PO / Stock-Out Items / Settings** buttons (top right).
4. **Row actions** — View (magnifying glass), Edit (pencil), Delete (cross), Copy Order (double-square), Copy Link (chain/share icon).

### Step-by-Step SOP

**SOP 7-1: Create a Purchase Order**
1. Sidebar: **Logistic & Inventory > Purchase Order**.
2. Click **Create PO**.
3. Fill in Issue Date, Delivery No., Customer PO No., Control No., Industry to, Delivery Address.
4. Under **Order**, select Supplier, Qty, and Item (repeatable — click **+** to add more line items).
5. Fill Delivery Fee, **Assigned to** (up to 4 employees), and Picked-up Date.
6. Click **Submit**. The system creates the order and shows an **Export / Edit PO / Return to List** screen with a **History** panel (Created by, Created Date).

**Expected Result.** A new PO record with status ready to move through approval.

**SOP 7-2: Approve, Pay, and Deliver a PO**
1. Open the PO. Click the status dropdown (top right, e.g., **For Approval ▾**) and select **Approve**.
2. Fill Remarks and **Assigned to**, click **OK**. Status becomes **Approved**; History logs the change.
3. Repeat the same status-dropdown action to progress the PO through **To Pay → Paid → Purchased → Delivered**, each time via Steps 3–5 of SOP 7-1's pattern (remarks + assign + OK).

**Verification.** The History panel should show one logged entry per status transition, each with a name and timestamp — if a transition is missing, the PO's audit trail is incomplete and should be corrected before proceeding.

**Common Mistakes.** ⚠ Editing a PO that has already passed **Paid** status — the system manual notes items beyond Paid status cannot be edited; corrections after that point require a new PO or a manual adjustment elsewhere (e.g., Bookkeeping).

**Best Practices.** ✅ Use **Export** (produces a signed Purchase Request Form — Requested by / Reviewed by / Reviewed by, e.g., Purchaser / Warehouse Manager / Finance OIC) as the paper-trail artifact for offline approval records, even though the ERP itself already tracks status electronically.

**Other PO actions:**
- **Stock-Out Items** — shows items that are stocked out or unavailable (Unit Code, Item Name, Remaining, New Order columns) so purchasing staff know what needs re-ordering.
- **Settings > Edit PO Settings** — assigns the **Delivery Fee Account** and **COG Fee Account**, each to a specific **Bank**, so PO-related payments post to the correct Finance account (see Module 6, Settings – Accounts).
- **Copy Order** — duplicates an existing PO's line items into a new Copy Order screen, useful for recurring restocks.
- **Copy Link** — copies a shareable order URL that opens the order directly when pasted into a browser.

## 7.6 Supplier

### Feature Breakdown

1. **Sidebar > Supplier**.
2. **Table** — Supplier Store Name, Supplier Name, Supplier Contact, Supplier Address, Province, City, Brgy, Contact Person, Person Contact No., Status.
3. **Tools** (Add New) and **Archives** buttons.
4. **Row actions** — Search/View (magnifying glass), Edit (pencil), Delete (cross), Archive (folder).

### Step-by-Step SOP

**SOP 7-3: Add a Supplier**
1. **Logistic & Inventory > Supplier > Tools > Add New**.
2. Fill Supplier Store Name, Supplier Name, Supplier Contact No., Contact Person, Contact No. of Person, Supplier URL, Address, Province/City/Brgy, Item, Remarks, and Active/Inactive status.
3. Click **Submit**.

**Verification.** The new supplier appears in the table and is immediately selectable in the Purchase Order's Supplier field.

**Other actions:** View (read-only detail with Created By/Created Date), Edit, Delete (with confirmation prompt), and Archive/Unarchive (moves a supplier out of the active list without deleting it — use this for suppliers no longer active rather than deleting their history).

## 7.7 Inventory > Product Items

### Feature Breakdown

1. **Inventory > Product Items.**
2. **Table** — SKU Code, Name, COG, Color, Size, Type, Status, Goods, Damage, Loss, Remaining, Supplier Store Name, Total Value, Picture.
3. **Tools** — Add New, Upload Item, Export to Excel, View All Deleted Items.
4. **Archives** button (top right) toggles to the archived-items list.
5. **Row actions** — Search, Edit (toggles inline edit mode), Delete, Archive (folder icon).

### Step-by-Step SOP

**SOP 7-4: Add a Product Item**
1. **Tools > Add New.**
2. Fill Name, SKU Code, Description, Cost of Goods (COG), Color, Size, Type, Quantity, Supplier Store Name, Upload Item Picture, and **Is Active?** checkbox.
3. Click **Submit** — the item appears at the top of the Product Items table.

**SOP 7-5: Bulk-Upload Product Items**
1. **Tools > Upload Item > Click to Download Sample File.**
2. Fill columns: Item Code, Name, Description, COG, Color, Size, Type, Qty, Damage.
3. Save, then **Select File > Upload**.

**Other actions:** **Export to Excel** (downloads the full table with No./SKU Code/Name/COG/Color/Size/Type/Status/Goods/Damage/Loss/Remaining/Total Value), **View All Deleted Items** (soft-deleted items list, distinct from Archive), and **Archive** (moves an item to a separate Archive Items List without deleting — reversible via the **List** button).

## 7.8 Inventory > Unit Codes

### Feature Breakdown

🔒 **Administrator Notice (verbatim from the source manual):** *"The ability to delete unit codes that have been utilized in the sales tracker will be disabled due to the inventory deduction process now automated through the shipped-out scanning system. However, you can still hide your unit codes in the archives. Note that reusing CODES is no longer an option. Note that Deleted and archive items that added on Pancake will still be available in Pancake."*

1. **Inventory > Unit Codes.**
2. **Table** — Date Created, Code, Items, Remaining, Total Amount.
3. **Tools** — Add New, Upload Unit Codes, Export to Excel, Export PDF.
4. **Archives** button.
5. **Row actions** — Search, Edit, Archive, Copy.

### Step-by-Step SOP

**SOP 7-6: Add a Unit Code**
1. **Tools > Add New.**
2. Fill **Unit Code**, one or more **Item + Qty** pairs (click **+** to add more), **Selling Price** (Total COG Amount auto-computes), the **Add POR code for Upload Item** checkbox if applicable, and **Pages with Pancake API Key** (select which Pancake-connected pages can sell this code — leave blank to make it available on all pages).
3. Click **Submit**.

**Verification.** Confirm the new unit code appears both in the LHIKE ERP Unit Codes table **and** as a product on the connected Pancake shop (Products list) — this two-system check is the standard verification step per the source manual.

**Common Mistakes.** ⚠ Leaving "Pages with Pancake API Key" blank when a code was intended to be page-restricted — this silently makes the code sellable on every connected page. ⚠ Assuming a deleted/archived unit code can be reused — codes are permanently retired from reuse even after deletion/archiving, per the administrator notice above.

**SOP 7-7: Bulk-Upload Unit Codes**
1. **Tools > Upload Unit Codes > Click to Download Sample File.**
2. Follow the on-screen **Conditions**: Unit Codes must not already exist under Logistic & Inventory > Inventory > Unit Codes; Item Codes must exist under Product Items; quantity/item pairs must use semicolon (`;`) between item entries and pipe (`|`) as the comma separator — e.g., `1 X ITEMCODE1 ; 2 X ITEMCODE2` (correct) vs. `1 X ITEMCODE1 , 2 X ITEMCODE2` (wrong).
3. Fill Unit Code, Item and Qty, Selling Price columns, save, then **Select File > Upload**.

**Best Practices.** ✅ Follow the exact semicolon/pipe convention in the bulk template — the source manual explicitly warns this is a common upload-failure cause.

## 7.9 Inventory > Stocks

### Feature Breakdown

1. **Inventory > Stocks.**
2. Search by one category at a time: **SKU Code**, **Item Code**, **Unit Code**, or **Item Name**.
3. Result table shows Item Code, Item Name, Quantity Required, Available Qty, **Release Qty** (editable), Remaining Qty (auto-computed).

### Step-by-Step SOP

**SOP 7-8: Release Stock**
1. **Inventory > Stocks.** Choose **one** search category (e.g., Item Name) and select the item, then click **Search**.
2. In the result row, enter the **Release Qty**.
3. Click **Submit** — a success prompt confirms "Inventory has been added successfully," and the item's **Remaining** quantity on the Product Items table decreases by the released amount (e.g., 100 → 80 after releasing 20).

**Verification.** Cross-check the updated Remaining figure on **Inventory > Product Items** against what you released here — they must reconcile exactly.

## 7.10 Inventory > Transaction History

### Feature Breakdown

1. **Inventory > Transaction History.**
2. Legend: **red = Unit code (Not in ERP)**, **blue = Product Item**.
3. Search fields: Transaction Date (range), Items keyword, **Type** (All/IN/OUT).
4. Table: No., Transaction Date, Transact By, Items, Type (IN/OUT badge), In/Out qty, Remaining Qty.

### Step-by-Step SOP

**SOP 7-9: Audit Stock Movement for an Item**
1. **Inventory > Transaction History.**
2. Enter a date range and/or item name; set Type to **IN** (received) or **OUT** (released/shipped) as needed; click **Search**.
3. Review each row's Remaining Qty column to trace how the item's stock level changed over time.

**Best Practices.** ✅ Use this screen — not memory or a side spreadsheet — to answer "why did our stock count change" questions; every IN/OUT movement is logged here with who performed it (Transact By) and when.

## 7.11 Warehouse > Fulfillment

Fulfillment is "the complete process of receiving, processing, and delivering customer orders efficiently... It encompasses tasks such as picking, packing, and shipping items to fulfill customer requests."

### Feature Breakdown

1. **Warehouse > Fulfillment.**
2. **Toggle columns** — a row of togglable column chips (Order Date, CSR, Verifier Name, Page, Address, Contact, Order, Price, RTS Tracking Number, Assigned Packer, Parcel Status, Encoded Date, Packed Date, Shipped Out Date, Weight, Hide Added, Order Status).
3. **Export to API ▾** — sends fulfillment data directly to a connected courier's system: **Flash Express PH, J&T Philippines, Lalamove, LBC, Ninja Van, Shopee Express**, plus an **Export Pick List** option.
4. **Export ▾** — generic export.
5. **Update Tracking Details** — opens a form (Courier, Item Type, Weight (kg), Length/Width/Height, L&C Note, ACTWT) to record physical shipment specs for a selected order.
6. **Tools ▾** — a further menu: **Update Tracking Number**, **Update parcel status**, **View COG Sold**, **Parcel Status**, **Upload Ninjavan ODZ**.
7. **Row actions** — search icon (item info), person icon (assign a packer to the package/item).

### Step-by-Step SOP

**SOP 7-10: Assign a Packer and Update Shipment Details**
1. **Warehouse > Fulfillment.** Locate the order row.
2. Click the person icon to assign a packer.
3. Click **Update Tracking Details**, fill Courier/Item Type/Weight/Dimensions/Label Note/ACTWT, and **Submit**.

**SOP 7-11: Update Tracking Number in Bulk**
1. **Tools > Update Tracking Number.**
2. Set Date, Courier, Status, then **Select File** (download the sample template first) and **Upload**.

**SOP 7-12: Update Parcel Status**
1. **Tools > Update parcel status.**
2. In the overlay, set **Status** (e.g., "OUT OF DEL, WERY ZONE"), **Courier**, and **Remarks**.
3. Click **Submit**. ⚠ **Warning** shown on-screen: *"Updating parcel status will remove Shipped-out Date and Tracking number."* — treat this as destructive to those two fields specifically.

**SOP 7-13: View COG Sold**
1. **Tools > View COG Sold** — opens a searchable table (Order Date, Orders, Product Items, Delivery Status, Cost) for reviewing the cost-of-goods value of sold/cancelled/returned orders. Searchable by Order Date, Order, Product Items, Delivery Status.

**SOP 7-14: Upload Ninjavan ODZ (Out-of-Delivery-Zone) List**
1. **Tools > Upload Ninjavan ODZ.**
2. **Select File** (region/rate/state/city/barangay list with a "can do door-to-door delivery" flag column) and **Upload**.
3. ⚠ **Notice shown on-screen:** *"uploading this file will overwrite all existing data (ODZ) for Ninjavan"* — confirm **Yes** only when the replacement file is complete and current.
4. Use **View Ninjavan ODZ** to inspect the current list at any time.

**Common Mistakes.** ⚠ Uploading a partial Ninjavan ODZ file, which — per the overwrite warning — erases previously known ODZ barangays not included in the new file. ⚠ Using **Update parcel status** without realizing it clears the existing Shipped-out Date/Tracking Number.

## 7.12 Warehouse > Shipped Out (Barcode)

"Shipped Out" refers to scanning shipped items/packages to track delivery status — standard in logistics, shipping, and e-commerce.

### Feature Breakdown

1. **Warehouse > Shipped Out (Barcode).**
2. **Tracking No.** text box + **Submit/Cancel** — scan or type a tracking number to mark it shipped out.
3. **Upload Shipped Outs** — bulk upload via Excel (columns: Shipped out Date [YYYY-MM-DD], Tracking Number).
4. **Shipped Out Report** — filter by Parcel Date type, Date From/To; table of Order Date, Tracking Number, Encoded Date, Shipped-out Date, Pick-up Date, with a note: *"NOT INCLUDED: New, Incomplete, Out of Delivery Zone."*
5. Right panel — running totals by courier (Flash, J&T, Ninjavan) and **Total Received**.

**SOP 7-15: Scan/Record a Shipped-Out Parcel**
1. Scan or type the tracking number into the **Tracking No.** box.
2. Click **Submit** — the parcel is marked Shipped Out and counted in the right-panel totals.

**SOP 7-16: Bulk Shipped-Out Upload**
1. **Upload Shipped Outs > Click to Download Sample File.**
2. Fill Shipped out Date and Tracking Number columns, save, **Select File > Upload**.

## 7.13 Warehouse > PPW (Barcode)

*"Pending printed waybill" indicates a delay or problem with the printer* (the source manual specifically frames this as a printer/label-production hold, not a courier delay).

### Feature Breakdown

1. **Warehouse > PPW (Barcode).**
2. **Tracking No.** entry + Submit/Cancel; **Upload PPW** (bulk Excel: Tracking Number column only); table of PPW items and total received.

**SOP 7-17: Record/Resolve a PPW Parcel**
1. Scan/type the tracking number and **Submit**, or use **Upload PPW** for a batch (download sample, fill Tracking Number rows, save, **Select File > Upload**).
2. Once the waybill is printed and the parcel physically ships, it should be re-processed through **Shipped Out (Barcode)** (Section 7.12) to leave the PPW holding state.

## 7.14 RTS Items

### Feature Breakdown

1. **RTS Items dashboard** — table sortable by Order Date, CSR, Customer Name, Address, Contact, Order, Total Qty, Price, Page, Tracking Number, Courier, Received, Status; running totals for Total Price, Total Shipping Fee, Total Unreceived, Total Received, Total Claimed.
2. **Upload Claims** — register RTS claims in bulk via Excel (Tracking Number, Date of Claim).
3. **Scan & Receive** — scan/enter a tracking number to mark an RTS parcel physically received at the warehouse; shows a running Total Received.
4. **Scan & Check** — scan/enter a tracking number to verify and update its checked status.

### Step-by-Step SOP

**SOP 7-18: Upload RTS Claims**
1. **RTS Items > Upload Claims > Click to Download Sample File.**
2. Fill Tracking Number and Date of Claim (YYYY-MM-DD), save, **Select File > Upload**.

**SOP 7-19: Scan & Receive an RTS Parcel**
1. **RTS Items > Scan & Receive.**
2. Enter the tracking number, **Submit** — the parcel is added to the RTS Receive table and the Total Received count increments.

**SOP 7-20: Scan & Check an RTS Parcel**
1. **RTS Items > Scan & Check.**
2. Enter the tracking number, **Submit** — logged to the RTS Checked & Update table.

**Real Business Scenario.** A parcel shipped last week comes back marked "Recipient refused delivery" by the courier. Warehouse staff first log it via **Upload Claims** (or receive it via **Scan & Receive** if it has physically arrived), then **Scan & Check** once inspected for damage. Its status becomes visible as part of the **Total RTS** figure on the Sales Warehouse Logistics dashboard (Module 2), and its COG is visible via Fulfillment's **View COG Sold** tool (Section 7.11).

## 7.15 Workflow Diagram — Purchase to Delivery

```
Supplier (7.6)
     ↓
Purchase Order created (For Approval) (7.5)
     ↓
Approved → To Pay → Paid → Purchased → Delivered
     ↓
Stock received → Product Items / Unit Codes updated (7.7–7.8)
     ↓
Stocks released against a sales order (7.9) — Transaction History logs OUT (7.10)
     ↓
Fulfillment: packer assigned, tracking details set (7.11)
     ↓
Shipped Out (Barcode) (7.12) ──→ PPW (Barcode) if waybill pending (7.13)
     ↓
Courier transit (Update Tracking Number / Parcel Status)
     ↓
   ┌──────────┴──────────┐
   ↓                      ↓
Delivered            RTS: Claims → Scan & Receive → Scan & Check (7.14)
   ↓                      ↓
Sales Warehouse Logistics dashboard (Module 2) reflects both outcomes
```

## 7.16 Decision Tree — A Parcel's Tracking Number Won't Scan

```
Tracking number rejected on Shipped Out (Barcode) or PPW (Barcode)?
        ↓
       YES
        ↓
Was the order first processed through Fulfillment?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Assign a    Check Transaction History (7.10) for
packer &    the item — was stock ever released (OUT)?
update           ↓
tracking     ┌───┴───┐
details      NO       YES
(7.11)       ↓         ↓
          Release   Check RTS Items —
          stock     was this tracking
          (7.9)     number already
                     claimed/returned?
                          ↓
                    Escalate to Logistics
                    & Inventory data owner
```

## 7.17 Common Mistakes

⚠ **Deleting a Unit Code expecting to reuse the code later** — per the Administrator Notice in Section 7.8, codes cannot be reused once retired.
⚠ **Uploading a partial Ninjavan ODZ file** — this overwrites, not merges, the existing ODZ list (Section 7.11).
⚠ **Using Update Parcel Status when only the courier's status changed** — it clears Shipped-out Date and Tracking Number, which may not be the intended effect if the tracking number itself is still valid.
⚠ **Editing a Purchase Order after it has reached Paid status** — not supported; corrections need a new PO or a Bookkeeping-level adjustment.
⚠ **Bulk-uploading Unit Codes with commas instead of the required semicolon/pipe convention** — a documented, common cause of upload failure (Section 7.8).

## 7.18 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| New Unit Code upload fails | Wrong semicolon/pipe syntax, or unit code/item code already exists | Re-check the Conditions panel on the Upload Unit Codes screen | Correct syntax; if code already exists, choose a new code (codes cannot be reused) | Logistics & Inventory data owner |
| Product Item's Remaining qty doesn't match a physical count | A Stocks release wasn't matched by an actual pick, or a Transaction History OUT wasn't reconciled | Cross-check Transaction History (7.10) against the physical pick list | Perform a stock adjustment via a new Stocks release/receive entry | Warehouse supervisor |
| Parcel stuck in PPW indefinitely | Waybill never printed/label issue | Check with the courier/printer queue | Re-process through Shipped Out (Barcode) once printed | Warehouse supervisor |
| RTS parcel shows as claimed but never received | Upload Claims entry made before physical return arrived | Check RTS Items dashboard's Received column | Perform Scan & Receive once the parcel physically arrives | Logistics & Inventory data owner |
| Fulfillment export to courier API fails | Courier account/API not connected, or order missing required fields (weight/dimensions) | Check Update Tracking Details for missing fields | Complete tracking details, retry Export to API | Courier account administrator |

## 7.19 Security

🔒 Role-based permissions in this module are granted per the fine-grained checkbox matrix documented in Module 9 (User Management) — e.g., separate checkboxes exist for viewing owned vs. all Purchase Orders, editing vs. deleting Product Items, and RTS Approver rights. Administrators should grant only the checkboxes a given role actually needs (least privilege), particularly for **Delete** and **Bank Settings** rights on Purchase Orders.

## 7.20 Suggested Screenshots

📷 **Purchase Order list with status column** — caption: "Every PO's lifecycle status, from For Approval through Delivered."
📷 **Add Unit Code form showing Pages with Pancake API Key** — caption: "Restricting a bundled SKU to specific Pancake-connected pages."
📷 **Fulfillment dashboard with toggled columns** — caption: "Customizing the Fulfillment view to the columns that matter for today's shift."
📷 **RTS Items dashboard with running totals** — caption: "Total Price, Shipping Fee, Unreceived, Received, and Claimed at a glance."

## 7.21 Administrator Notes

- Unit Code deletion is intentionally disabled once a code has been used in the Sales Tracker; use Archive instead, and communicate to staff that codes are never reused.
- Confirm PO Settings (Delivery Fee Account / COG Fee Account + Bank) are configured before the first PO is created, so payments post to correct Finance accounts from day one.
- Periodically reconcile Product Items' Total COG Amount against the Finance module's Warehouse Inventory figure (Module 6).

## 7.22 Manager Notes

- **KPIs:** PO cycle time (For Approval → Delivered), Stock-Out Items count, PPW aging, RTS claim-to-receive turnaround.
- Review the Fulfillment **View COG Sold** report periodically alongside cancelled/returned order volume to catch COG leakage.

## 7.23 Employee Notes

**Daily responsibilities (warehouse):** process Fulfillment assignments, scan Shipped Out parcels, clear any PPW items once waybills print, action new RTS claims.

**Do's:** ✅ Always verify a new Unit Code on both LHIKE ERP and the connected Pancake shop.
**Don'ts:** ⚠ Don't upload a Ninjavan ODZ file unless it's the complete, current list — partial files erase existing entries.

## 7.24 Templates

**Purchase Order Checklist**
```
[ ] Supplier selected / verified active
[ ] Line items + quantities correct
[ ] Delivery Fee, Assigned to, Picked-up Date filled
[ ] Submitted — status: For Approval
[ ] Approved by: ______________
[ ] Paid — proof attached
[ ] Delivered — quantities verified against PO
```

**Inventory Count Sheet**
```
Date: ______________   Counted by: ______________
SKU Code | Item Name | System Qty (Product Items) | Physical Count | Variance | Notes
```

**Fulfillment / Shipping Checklist**
```
[ ] Order assigned to packer
[ ] Tracking details (weight/dimensions) recorded
[ ] Parcel scanned via Shipped Out (Barcode)
[ ] Courier API export confirmed (if applicable)
[ ] Exceptions (PPW/RTS) flagged and routed
```

---

*Next: Module 8 — Human Resources (pending source material)*
