# Module 3 — E-commerce

*Source: Valenin IT Services user manuals — Pages & Store (Apr 12, 2024), Page ROAS Tracker (Mar 21, 2024), Adspend ROAS Summary (Mar 13, 2024), Sales Tracker: Download Sales from 3P Apps (Apr 15, 2024), Upload Sales Monitoring (Mar 19, 2024), Update Tracking Number [Pancake] (Apr 15, 2024), User ID (Apr 16, 2024), Export to Excel (Apr 15, 2024), Product Testing (Mar 26, 2024), BM & Ad Account (Mar 15, 2024), Profitability Formula (user-supplied lesson text); plus a screenshot of E-Commerce General Settings.*

## 3.1 Learning Objectives

After completing this module, the reader will be able to:

- Register a store/page in LHIKE ERP and connect it to Pancake POS.
- Read and act on Page ROAS Tracker and Adspend ROAS Summary figures.
- Operate the Sales Tracker: add orders, download/upload sales from third-party platforms, sync tracking numbers with Pancake, and link a user account to a Pancake Facebook ID.
- Run a new product through the Product Testing approval workflow.
- Maintain the BM & Ad Account directory.
- Use the Profitability Formula tool to project margin, RTS/ODZ-adjusted revenue, and net profit for a SKU.

## 3.2 Business Purpose

**Why this module exists.** The "E" in LHIKE — this module is where marketing/e-commerce staff manage the storefronts (Pages), the advertising spend behind them (ROAS tracking), the orders those ads generate (Sales Tracker), and the profitability math that ties ad spend, COD collection risk (RTS/ODZ), and cost of goods together into a single go/no-go decision per product (Profitability Formula, Product Testing).

**How it helps the business.** Without this module, a marketing team would maintain ROAS in one spreadsheet, order status in another, and product-launch decisions in a third — each drifting out of sync. Here, all three read from the same order/parcel data the warehouse is updating in Module 7.

**Who uses it.** Marketing/ad-buying staff, e-commerce managers, product/merchandising staff, customer service (via Sales Tracker CSR fields).

**Departments involved.** Marketing, E-commerce, Customer Service, Finance (profitability figures feed Finance's Adspent/COG figures — Modules 2 and 6).

**Dependencies.** Every screen in this module that shows ROAS, orders, or parcel status ultimately depends on Pancake Integration (Module 4) for order/tracking synchronization, and on Logistics & Inventory (Module 7) for item codes and unit codes referenced during sales-monitoring uploads.

## 3.3 Concepts

**ROAS (Return on Ad Spend).** "An important key performance indicator (KPI) for online and mobile marketing... the amount of money generated for all the money invested in a campaign," based on the ROI principle, measurable at both a high level (Adspend ROAS Summary) and a granular, per-page level (Page ROAS Tracker).

**Page.** A storefront/social page (Facebook, Instagram, TikTok, Shopee, Lazada, Snapchat) registered under **Pages & Store**, each independently connectable to a Pancake POS shop.

**CPP.** Shown as a togglable column option on the Page ROAS Tracker (alongside Shipped Out/In Transit/On Delivery/Returned/Delivered) — a per-page cost metric tracked alongside ROAS.

**RDP Control Number.** An automatically generated control number assigned to each Product Testing item request, used to trace a product idea through its approval levels.

**COG Percent vs. SRP.** In Product Testing, **COG** (Cost of Goods) and **SRP** (Suggested Retail Price for 1 piece) are entered, and **Get Percentage** computes COG as a percentage of SRP — a first-pass profitability filter before a product is approved for sale.

**Two-level approval.** Product Testing items require sequential sign-off at **Level 1** and **Level 2**, each independently trackable (Approver, Status: Pending/Approve, Date, Remarks) — a control designed so no single approver can unilaterally greenlight a new product.

**BM (Business Manager).** "A centralized tool provided by platforms such as Facebook to help businesses manage their advertising assets, such as ad accounts, Pages, and Instagram profiles," tracked in LHIKE ERP via the **BM & Ad Account** screen, distinct from a Page itself.

**Profitability Formula.** A calculator that converts a SKU's raw inputs (ROAS, price, COG, ad spend, expected RTS %, expected ODZ/INC %, shipping, COD fee %) into projected revolving funds and net profit — modeling the effect of returns and undeliverable-zone losses on a COD business's actual take-home profit, not just its gross sales.

## 3.4 Navigation

- **Sidebar:** E-COMMERCE > **Pages & Store**, **Page ROAS Tracker**, **Adspent ROAS Summary**, **Sales Tracker**, **Product Testing**, **BM & Ad Account**, **Profitability Formula**, **Settings**.

## 3.5 Pages & Store

### Feature Breakdown

1. **Sidebar > Pages & Store** — table of Date Created, Name, Owner, Status, Platform; **Tools** (Add New, Upload Pages/Store, Platform) and **Archives** buttons; row actions (View, Edit, Delete, Archive).
2. **Add Page/Store form** — Name, Description, Owner, Platform (dropdown: Facebook ECOM, Instagram, TikTok, Shopee, Lazada, etc.), Page URL, plus a **Pancake Set Up** panel (see Section 3.5.1 and Module 4).
3. **Status values** — Active, Inactive, In-review, Restricted, Permanently Disabled.

### 3.5.1 Pancake Set Up (cross-reference: Module 4)

Every Page/Store carries an optional Pancake integration panel: **Pancake Shop ID**, **API Key**, **Pancake Page ID for combine shop**, **Sender Name**, **Intern Name**. The full setup procedure (retrieving the Shop ID and API Key from Pancake POS, and handling combined/multi-page shops) is documented in **Module 4 — Pancake Integration**, since it is common infrastructure shared by this screen, the Sales Tracker, and Unit Codes (Module 7).

### Step-by-Step SOP

**SOP 3-1: Register a New Page/Store**
1. **Pages & Store > Tools > Add New.**
2. Fill Name, Description, Owner, Platform, Page URL.
3. Optionally expand **Show Settings** to configure the Pancake panel (Module 4).
4. Click **Submit.**

**SOP 3-2: Bulk-Upload Pages/Store**
1. **Tools > Upload Pages/Store > Click to Download Sample File.**
2. Fill Page/Store Name, Description, Owner Name, Platform ID (see legend: 1 = Facebook, 2 = Instagram, 3 = Tiktok, 4 = Shopee, 5 = Lazada), Page URL.
3. Save, then **Select File > Upload.**

**Verification.** Confirm the new page appears in the table with the correct Platform and Status, and — if Pancake was configured — that orders begin flowing via Module 4's sync mechanisms.

**Common Mistakes.** ⚠ Leaving a page's status as **In-review** or **Restricted** without following up with the platform — these statuses mirror real platform-side restrictions and won't resolve themselves inside LHIKE ERP.

## 3.6 Page ROAS Tracker

### Feature Breakdown

1. **Filters (top):** Platform (Facebook, Instagram, Twitter, Shopee, Lazada, Snapchat, TikTok), Page Status (Active/Inactive/In Review/Restricted), Filter Page (by business/page name), Date Range.
2. **Toggle checkboxes:** View Shipped Out, View In Transit, View On Delivery, View Returned, View Delivered, **CPP** — controls which parcel-status columns appear per page in the results table.
3. **Per-page table columns:** Orders, Sales, Ad Spent, ROAS — repeated in a block for each page/store, side by side, so multiple pages can be compared in one view.
4. **View Tutorial Here** link and **Submit** button.

### Step-by-Step SOP

**SOP 3-3: Compare ROAS Across Pages for a Date Range**
1. **E-commerce > Page ROAS Tracker.**
2. Select Platform (or leave blank for all), Page Status, and one or more pages under Filter Page.
3. Set the Date Range.
4. Check any of the funnel toggle boxes (Shipped Out/In Transit/On Delivery/Returned/Delivered/CPP) needed for this review.
5. Click **Submit.**

**Expected Result.** A side-by-side table, one block per selected page, showing daily Orders/Sales/Ad Spent/ROAS plus a Total Amount and Average row per page.

**Best Practices.** ✅ Use the "Effective December 1..." on-screen reminder as a standing rule: update all ad-spend data within a one-week window — the source manual notes that once updated, prior ad-spend records cannot be reverted, so ad spend must be entered accurately the first time.

## 3.7 Adspend ROAS Summary

### Feature Breakdown

A single consolidated table (not split per page): **Date Range** selector + **Submit**; table columns **Date, Total Orders, Total Orders Amount, Total Ad Spent, ROAS**, with **Total Amount** and **Average** summary rows at the bottom.

### Step-by-Step SOP

**SOP 3-4: Review Company-Wide ROAS for a Period**
1. **E-commerce > Adspent ROAS Summary.**
2. Set the Date Range, click **Submit.**
3. Read the day-by-day rows, then the **Total Amount** and **Average** rows for the period's overall ROAS.

**Common Mistakes.** ⚠ Comparing this screen's company-wide Total Ad Spent against a single page's figure on the Page ROAS Tracker — they answer different questions (all pages vs. one page) and won't match by design.

## 3.8 Sales Tracker

The Sales Tracker "allows firms to track sales, analyze performance, forecast trends, manage teams, and combine data from several platforms."

### Feature Breakdown

1. **Toggle Column** — customizes visible columns (Order Date, CSR, Verifier Name, Upsell By, Customer Name, Address, Province, City, Brgy, Zip, Contact, Order, Total Qty, Price (Final), Page, Platform, Tracking No., Courier, Parcel Status, Encoded Date, Parcel Update, Shipping Fee, MOP, Reserve, Reserve Date, Order Status, Shipped Out Date, Shift, Date Added, Price (Initial), Price (Upsell), Intern Name) without deleting the underlying data.
2. **Add New Order** — manually create an order (customer info, products/services, quantities, prices).
3. **Refresh** — reloads data from the server.
4. **Report** — integrates data across the system (CSR name, sales, inventory, financing, product status: cancelled by customer/warehouse, returned, delivered).
5. **Tools ▾** menu:
   - **Download Sales from 3P Apps** (see Module 4 — pulls confirmed Pancake POS orders into the tracker)
   - **RTS Report (Per Item)**
   - **Scan Order (Barcode)**
   - **Upload Sales Monitoring** (bulk order upload — Section 3.8.1)
   - **Delete Uploaded Sales Monitoring**
   - **USER ID** (Section 3.8.2)
   - **Export to Excel** (Section 3.8.3)
   - **Update Tracking Number [Pancake]** (Module 4)
   - **Update Parcel**
6. **Total Price / Total Shipping Fee** — computed sums shown below the filtered result set.

### 3.8.1 Upload Sales Monitoring

Uploads a batch of orders via Excel from **Facebook/Shopify, TikTok, Lazada, or Shopee** — each platform has its own template.

**Conditions (verbatim from the source manual — read before every bulk upload):**
- **Duplicate Customer:** same contact number with the same page name, same order time, and same date of order.
- **Page Does Not Exist:** the page must already exist under **E-commerce > Pages & Store**.
- **Item Code Does Not Exist:** the item code must exist under **Logistics & Inventory > Inventory > Unit Codes**.
- **Verification Does Not Exist:** spelling must match exactly one of: `CANNOT BE REACHED`, `CANCELLED`, `NO ANSWER`, `ORDER CONFIRMED`, `VERIFIER REMARKS`, `NO TO UPSELL`, `INCORRECT NUMBER`, `UNVERIFIED`.
- **Invalid MOP ID:** must be one of `1=COD, 2=G-Cash, 3=Bank Transfer, 4=COP, 5=FREE, 6=Paymaya, 7=Cash, 8=Pay Later, 9=Payment Account, 10=Mixed Card`.
- **ITEMCODING TEMPLATE:** use semicolon (`;`) as the item separator and pipe (`|`) as the internal comma, e.g. `1 X ITEMCODE1 ; 2 X ITEMCODE2 ; 1 X ITEMCODE3`.
- All modes of payment are automatically confirmed on upload.

**SOP 3-5: Upload a Batch of Orders**
1. **Sales Tracker > Tools > Upload Sales Monitoring.**
2. Select the platform (Facebook/Shopify, TikTok, Lazada, or Shopee), download that platform's sample file.
3. Fill the template per the Conditions above, save it.
4. Set the Order Date (or tick "Order date based on Upload File" to use dates already in the spreadsheet), select Shift/Time where applicable, **Select File > Upload.**

**Recovery.** If the upload errors, use the exported error file (which shows exactly which rows/conditions failed) to correct and re-upload, rather than guessing at the cause.

### 3.8.2 USER ID (Facebook ID Linking)

Links a LHIKE ERP user account to that person's Facebook ID as recorded in their Pancake Ph account — this is what lets Pancake attribute a conversation/order to the correct CSR/agent.

**SOP 3-6: Link a User's Facebook ID**
1. **Sales Tracker > Tools > USER ID** — shows every username from the User Management module (Module 9), each with Employee No., Name, Position, FB Id (Pancake), Status.
2. Click the row's edit icon for the target user, opening **Update FB Id**.
3. In Pancake Ph: click your account (top right) > **Account Information** > copy the **Facebook ID**.
4. Paste it into the **Update FB Id** overlay in LHIKE ERP, click **Submit.**

**Verification.** A success prompt ("User Facebook ID updated successfully") confirms the field is now populated in the USER ID table.

### 3.8.3 Export to Excel

**SOP 3-7: Export a Filtered Order Set**
1. Set the desired **Order Date** filter, click **Search.**
2. **Tools > Export to Excel** — downloads the filtered rows (Date, CSR Name, Verifier Name, Customer Name, Address, Province, City, Barangay, Zip Code, Contact Number, Order, Upsell Item, Price Initial/Upsell) as a spreadsheet.

## 3.9 Product Testing

"Product testing is a procedure that entails carefully examining the product's functionality, performance, dependability, and usability... to confirm that the product fulfills user needs."

### Feature Breakdown

1. **New Product Testing** button, **View Archives**, **View Collections.**
2. **Table:** Collection, Name, SRP, Pages, Status, Verdict, Platform, Action.

### Step-by-Step SOP

**SOP 3-8: Submit a New Product for Testing**
1. **Product Testing > New Product Testing.**
2. Fill Collection (optional), Product Name, Product Name Description, Product Image, Generic Product Name/Image, Product Description, Quantity per pack, Product Form, Other Product Specifications.
3. Click **Submit and Go to Next Page** — fill COG, click **Get Percentage** (computes COG Percent against SRP for 1pc), then **Submit and Go to Next Page** again.
4. Add one or more **Creatives** (Creative Name + Creative Link, click **Add link** for each), then **Submit and Go to Next Page.**
5. Review the summary **Item Request** screen (Collection, RDP Control Number, Product Name/Description/Image, Generic Product info, COG/COG Percent/SRP, Page Name, Platform, Creatives) and the **Level 1 / Level 2** approval panel (each showing Approver/Status/Date/Remarks, both starting **Pending**).
6. Click **Close** — the product now appears in the Product Testing dashboard with a **Pending** verdict badge showing both approval levels' status.

**Verification.** Confirm both Level 1 and Level 2 show the correct approver assigned and status before treating the product as ready to sell.

**Other actions:** Edit item (pencil icon — e.g., replace the product image), **Move to Archives** (box icon, with a confirmation prompt; reversible via **Unarchive**), **View Collections** (browse products grouped by Collection), **View Archives**/**View Requests** (toggle between active and archived lists).

**Common Mistakes.** ⚠ Treating a product as approved because Level 1 is marked Approve while Level 2 is still Pending — both levels must clear before a product should be considered testing-approved.

## 3.10 BM & Ad Account

### Feature Breakdown

1. **Table:** Date Created, BM Name, Owner, Birthday, Status, Remarks; **Tools** (Add New, Upload BM); row actions (Search, Edit, Delete).
2. **Status values:** Active, Inactive, In-review, Restricted, Permanently Disabled, Other.

### Step-by-Step SOP

**SOP 3-9: Add a BM & Ad Account**
1. **BM & Ad Account > Tools > Add New.**
2. Fill Name, Owner, Owner Birthday, Address, Email, Contact no, Remarks, Upload Picture, Upload ID, Adsmanager Link.
3. Click **Submit.**

**SOP 3-10: Bulk-Upload BM Accounts**
1. **Tools > Upload BM > Click to Download Sample File.**
2. Fill BM Name, BM OwnerName, BM Owner Birthday, Address, Email, Contact no, Remarks, Status, BM Admins.
3. Save, **Select file > Upload.** A prompt reports Total Row Added / Total Row Skipped.

**Verification.** Use **Search** and the row's magnifying-glass View action to confirm a newly added or uploaded BM account's details, including Created By/Created Date history.

## 3.11 Profitability Formula

"An economic indicator that divides a profit metric by the net revenue earned during the relevant period, providing insight into a company's historical margin profile (and future trajectory)."

### Feature Breakdown

**Inputs:** ROAS, Pricing, COG, Ad Spent, Days, RTS Percentage, ODZ/INC Percentage, Shipping Amount, COD FEE Percentage.

**Outputs (after clicking Compute):** Total Revolving Funds, Gross/NET Profit (%), COG (%), Parcel per Day (%), Parcel per Day (Qty), Parcel from RTS, COG of RTS Return.

**Upgraded Version** (toggle button) — expands into a full waterfall breakdown table:
```
Parcel
Gross Sales
  less: ODZ/INC (x%)
= Total (less ODZ/INC)
  less: RTS (x%)
= Total (less RTS)
  less: Shipping (x.xx)
  less: COD fee (x%)
  less: COG
  less: Adspent
= Gross profit
  less: OPEX (user-entered)
= NET Profit
  + COG of RTS Returned
= Total NET Profit & COG of RTS Ret.
  + Total Revolving Fund
= Total Revolving Fund & NET Profit
```

### Step-by-Step SOP

**SOP 3-11: Project Profitability for a SKU**
1. **E-commerce > Profitability Formula.**
2. Fill ROAS, Pricing, COG, Ad Spent, Days, RTS Percentage, ODZ/INC Percentage, Shipping Amount, COD Fee Percentage.
3. Click **Compute.**
4. Read Total Revolving Funds and Gross/NET Profit % on the right; optionally click **Upgraded Version** for the full waterfall breakdown, entering **OPEX** manually where prompted.

**Real Business Scenario.** Before scaling ad spend on a SKU from ₱5,000/day to ₱10,000/day, a marketing manager re-runs the Profitability Formula with the higher Ad Spent and the same historical RTS%/ODZ%, confirming the projected NET Profit still clears the company's minimum threshold before committing the larger budget — turning a spreadsheet-based guess into a repeatable, documented pre-scale check.

**Common Mistakes.** ⚠ Entering RTS%/ODZ% from a different, unrelated product line — these percentages are highly product- and courier-route-specific, and reusing stale figures materially skews the projected NET Profit.

## 3.12 Settings (General)

A screenshot of **E-commerce > Settings > General Settings** shows two toggles:

1. **Hide/Unhide the "Change Status on Pancake" in downloadsales** — controls whether the Download Sales from 3P Apps screen (Module 4) exposes the option to change an order's status directly on Pancake from within LHIKE ERP.
2. **Allow the editing of ads spent for any day (not just for today and yesterday)** — when off, ad-spend entries are restricted to being edited only for the current or previous day, a control that helps prevent quiet retroactive changes to historical ROAS figures.

🔒 **Security note.** The second toggle is a data-integrity control: leaving it off by default limits how far back ad-spend history can be edited, making the Page ROAS Tracker and Adspend ROAS Summary more trustworthy as a historical record. Enable it only when a specific, justified correction is needed, and prefer to disable it again afterward.

## 3.13 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| Sales Monitoring upload rejects every row | Page doesn't exist yet, or item codes not yet created | Check Pages & Store and Unit Codes (Module 7) for the referenced names/codes | Create the missing page/unit code first, then re-upload | E-commerce or Logistics & Inventory data owner |
| Page ROAS Tracker shows 0 ROAS for an active page | Ad spend not yet entered for the period, or page not connected to Pancake | Check Adspend ROAS Summary for the same dates; check Pancake connection (Module 4) | Enter ad spend; verify Pancake Shop ID/API Key | E-commerce data owner |
| A user's orders aren't attributing correctly in Pancake | FB ID not linked in USER ID (3.8.2) | Check Sales Tracker > Tools > USER ID for that user | Link the correct Facebook ID | System administrator |
| Product Testing item stuck at Pending despite being reviewed | Only Level 1 approved, Level 2 still outstanding | Check both approval panels on the item's detail view | Route to the Level 2 approver | Product Testing approvers |

## 3.14 Security

🔒 Per Module 9, E-commerce permissions are broken down finely — e.g., separate checkboxes exist for viewing/editing/deleting **Ads**, managing **Sales Order** (including a distinct "Delete Order" and "Update Parcel Status (NCW)" right), and **Pages** (View/Add/Edit vs. Delete). Grant Delete-level rights sparingly, especially on Sales Order and Pages.

## 3.15 Suggested Screenshots

📷 **Page ROAS Tracker with multiple pages side by side** — caption: "Comparing Orders, Sales, Ad Spent, and ROAS across pages for the same date range."
📷 **Upload Sales Monitoring platform selector** — caption: "Choosing the correct template — Facebook/Shopify, TikTok, Lazada, or Shopee."
📷 **Product Testing item request summary with Level 1/Level 2 approval panel** — caption: "Two-level sign-off before a new product goes live."
📷 **Profitability Formula — Upgraded Version breakdown** — caption: "From Gross Sales to Total Revolving Fund & NET Profit, one deduction at a time."

## 3.16 Administrator Notes

- Keep the ITEMCODING TEMPLATE and MOP ID legend posted/visible to whoever performs Sales Monitoring uploads — these are the most common upload-failure causes.
- Review the "Allow editing of ads spent for any day" toggle's on/off history periodically as a light audit control.

## 3.17 Manager Notes

- **KPIs:** ROAS by page (trend, not single-day), RTS%/ODZ% actuals vs. Profitability Formula assumptions, Product Testing approval turnaround time.
- Use Adspend ROAS Summary as the standing weekly marketing-review artifact; use Page ROAS Tracker only when investigating a specific page's underperformance.

## 3.18 Employee Notes

**Daily responsibilities (marketing/CSR staff):** enter/verify ad spend before the "today/yesterday" edit window closes; process Sales Monitoring uploads following the Conditions checklist; keep USER ID's Facebook ID mapping current for new hires.

**Do's:** ✅ Double-check platform selection (Facebook/Shopify vs. TikTok vs. Lazada vs. Shopee) before uploading — each has its own template.
**Don'ts:** ⚠ Don't reuse another SKU's RTS%/ODZ% assumptions in the Profitability Formula.

## 3.19 Templates

**Product Testing Log**
```
RDP Control No. | Product Name | SRP | COG | COG % | Level 1 Approver/Status | Level 2 Approver/Status | Date Cleared
```

**ROAS Weekly Tracker**
```
Week of: ______________
Page | Orders | Sales | Ad Spent | ROAS | Notes
```

**Sales Monitoring Upload Checklist**
```
[ ] Correct platform template selected
[ ] Page(s) already exist in Pages & Store
[ ] Item codes already exist in Unit Codes
[ ] Verification values match the approved list exactly
[ ] MOP IDs valid (1-10 per legend)
[ ] Item coding uses ; and | correctly
```

---

*Next: Module 4 — Pancake Integration*
