# Module 6 — Finance

*Source: Valenin IT Services user manuals — Finance – Income Statement (Mar 21, 2024), Finance – Bookkeeping (Mar 21, 2024), Finance – Reimbursement (Mar 21, 2024), Finance – Utility Expense (Mar 21, 2024), Finance – Settings (Mar 21, 2024). The Finance **dashboard** overview screen (Gross Revenue/Opex/Adspent/etc. cards) is documented in Module 2, Section 2.B — this module covers the deeper Finance sidebar group: Income Statement, Book Keeping, Reimbursement, Utility Expense, and Settings.*

## 6.1 Learning Objectives

After completing this module, the reader will be able to:

- Read an Income Statement for any date range, including its parcel-risk-adjusted projections.
- Record, disable (with approval), and bulk-upload Bookkeeping transactions.
- File and approve a Reimbursement request, and a Utility Expense request, and explain how each posts automatically into Bookkeeping.
- Configure Finance module Settings: General, Accounts, Banks, Department, and Type of Expense.

## 6.2 Business Purpose

**Why this module exists.** "Finance refers to the management of money, investments, and financial activities within an individual, organization, or economy... the creation, allocation, and utilization of financial resources." This module is where that management actually happens day to day: recording transactions, requesting and approving reimbursements/utility bills, and producing the income statement management uses to judge the business's health.

**How it helps the business.** Centralizes bookkeeping, reimbursement, and utility-expense workflows with built-in approval controls (segregation of requester vs. approver) and automatic posting — so Finance staff aren't reconciling three separate paper trails at month-end.

**Who uses it.** Finance/bookkeeping staff (daily entry), department staff (filing reimbursement/utility requests), Finance OIC/management (approvals), executives (Income Statement).

**Departments involved.** Finance, and — as requesters — every department that incurs reimbursable or utility expenses.

**Dependencies.** Reimbursement and Utility Expense requests, once approved, post automatically as Bookkeeping entries. Bookkeeping's account list is configured in Settings – Accounts, which in turn references Settings – Banks and Settings – Department. Income Statement figures are computed from the same underlying revenue/expense/parcel data reflected on the Finance Dashboard (Module 2) and the Logistics & Inventory module (Module 7).

## 6.3 Concepts

**Income Statement vs. Bookkeeping.** The **Income Statement** is a read-only, period-based summary report ("summarize company's revenue for a given time duration... provides an overview of the company's operating revenue along with the expenditures to achieve that revenue"). **Book Keeping** is the underlying transaction ledger — the individual debits/credits that, in aggregate, produce the Income Statement's figures.

**Projected vs. Actual figures.** The Income Statement distinguishes **Actual Company Funds** (real cash on hand) from **Projected Company Funds**, **Projected Account Receivables**, and **Projected RTS** — the latter group models money not yet collected or at risk of being lost to returns, based on parcels currently In-Transit/Delivering/PPW (see Module 7 for these statuses).

**Hardcoded vs. custom accounts.** Bookkeeping's account list always includes three **hardcoded** accounts — **!Cash Advance, !Reimbursement, !Utility Expense** — which cannot be renamed or removed, only assigned to a bank. Administrators can additionally create **custom accounts** (e.g., "COG Extended Warehouse," "IT Interns") with their own voucher/revolving-fund/gross-revenue-exclusion settings.

**Revolving Fund Account types.** A custom account can be flagged as a specific kind of revolving fund — **Adspent Account, COG Purchase Account, or Shipping Fee Account** — tying it to the same revolving-fund categories referenced in the Finance Dashboard (Module 2) and Profitability Formula (Module 3).

**Request → Approve → Post pattern.** Both Reimbursement and Utility Expense follow the same three-stage pattern: a requester files a request (auto-numbered with a Control No.), an approver reviews and Approves/Declines it, and — only upon approval — the transaction is automatically written into Book Keeping. This is a deliberate segregation-of-duties control: the person who spends money is not the same person who posts it to the books.

**Disabling a transaction is not deleting it.** Book Keeping entries cannot simply be deleted; a user must **Request Disable** with a reason, and an admin must **Approve** or **Decline** that request. Disabled items move to a separate **Disabled** view — they remain in the system, fully auditable, rather than disappearing.

## 6.4 Navigation

- **Sidebar:** FINANCE > **Income Statement**, **Book Keeping**, **Reimbursement**, **Utility Expense**, **Settings** (General, Accounts, Banks, Department, Type of Expense).
- (Recall from Module 2: **Dashboard > Finance** is a separate, higher-level overview screen distinct from this sidebar group.)

## 6.5 Income Statement

### Feature Breakdown

1. **Date range dropdown** (top) — same control family as elsewhere in the system: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, **Custom** (pick specific Start/End dates via calendar or typed text boxes).
2. **Particulars table** — Gross Revenue, Adspent, Cost of Good Purchase, Shipping Fee, **Gross Profit**, **OPEX**, **Profit & Loss**, each with an Amount column.
3. **Right-side panel** — Actual Company Funds, Warehouse Inventory, Projected Account Receivables.
4. **Parcel breakdown table** — In-Transit, Delivering, Total PAR (Parcel At Risk / Pending Account Receivable), each with Amount, Projected RTS (% and value), and PAR value; a second table breaks down **PPW** the same way (Amount, SF/Shipping Fee %, RTS, PAR).
5. **Projected Company Funds** — a summary card combining the above into one bottom-line projected cash figure.

### Step-by-Step SOP

**SOP 6-1: Generate an Income Statement for a Custom Period**
1. **Finance > Income Statement.**
2. Click the date-range dropdown, choose **Custom**, and either click specific dates on the calendar overlay or type them directly into the Start Date/End Date text boxes.
3. Click **Apply.**

**Example (from the source manual):** to review the Filipino Christmas "Ber Months" season, set Start Date `09/01/2023` and End Date `12/25/2023` (115 days).

**Expected Result.** The Particulars table, side panels, and parcel breakdown tables all refresh to the selected period.

**Verification.** Gross Profit should equal Gross Revenue minus Adspent, Cost of Good Purchase, and Shipping Fee; Profit & Loss should equal Gross Profit minus OPEX — if either doesn't reconcile, check for a Bookkeeping entry posted to the wrong account/category.

**Best Practices.** ✅ Run the Income Statement for the same period as the Adspend ROAS Summary (Module 3) when preparing a combined marketing/finance review, so ad-spend figures agree across both reports.

## 6.6 Book Keeping

### Feature Breakdown

1. **Account tabs** — ALL, !Cash Advance, !Reimbursement, !Utility Expense, plus any custom accounts (e.g., COG Extended Warehouse, IT Interns).
2. **Add Transaction** button; **Enabled ▾** dropdown (switch view between Enabled / Disabled / For Approval).
3. **Export, View Summary, Upload Book Keeping** buttons.
4. **Table** — Posted Date, Voucher, Transaction, Department, Type of Expense, Debit, Credit, Bank, Actions.

### Step-by-Step SOP

**SOP 6-2: Add a Bookkeeping Transaction**
1. **Finance > Book Keeping > Add Transaction.**
2. Fill Account, Posted Date, Transaction (description), Department, Category, Type of Expense, Amount, Bank, Voucher, Upload Receipt.
3. Click **Submit.** The new transaction appears at the top of the list under its account tab.

**SOP 6-3: Request to Disable a Transaction (Staff)**
1. Open the transaction's **View** (magnifying glass).
2. Click **Request Disable**, enter Remarks explaining why, click **Yes.**

**Expected Result.** The transaction's status becomes visible under the **For Approval** view; it still shows under its original account tab as pending disable.

**SOP 6-4: Approve/Decline a Disable Request (Admin)**
1. Open the flagged transaction, click **Approve.**
2. In the **Approve Disable** overlay, choose **Approve** or **Decline**, add remarks, click **Yes.** ⚠ On-screen warning: *"Disabled Item cannot be undone."*

**Expected Result.** An approved-disable transaction moves out of the Enabled view into the **Disabled** view (switch via the account-status dropdown, top right) — it is not deleted, and its full History (Added By/Date, Date Requested, Requested By, Reason for request, Status, Remark, Approved By/Date) remains visible.

**SOP 6-5: Bulk-Upload Bookkeeping Transactions**
1. **Book Keeping > Upload Book Keeping > Click to Download Sample File.**
2. Fill columns: Posted Date, Accounts, Transaction, Department, Type of Expense, Debit, Credit, Bank, Voucher.
3. ⚠ **Note (verbatim):** *"The values to be inputted on the columns in the spreadsheet are the values based on registered values in the ERP system or else the upload will be invalid."* — Accounts, Department, Type of Expense, and Bank values must exactly match existing Settings entries (Section 6.8).
4. Save, **Select file > Upload.** A success message reports rows updated and rows skipped.

**Common Mistakes.** ⚠ Typing an Account, Department, or Bank name in the upload spreadsheet that doesn't exactly match what's configured in Settings — causes the whole row to be skipped rather than partially applied.
⚠ **Confusing "disable" with "delete."** Since disabling requires a documented reason and admin approval, staff should not expect an immediate, unilateral removal of a mis-entered transaction.

## 6.7 Reimbursement

Reimbursement is "compensation paid by an organization to an individual or party for out-of-pocket expenses incurred or overpayments made... not subject to taxation, in contrast to regular compensation."

### Step-by-Step SOP

**SOP 6-6: File a Reimbursement Request**
1. **Finance > Reimbursement > Request Reimbursement.**
2. Fill Payee/Supplier, Department, Name, Purpose, Particular/s (add multiple via **+**), Type of Expense, Quantity, Unit Price, Mode of Payment, Total Amount, Upload Receipt. Date and Control No. auto-generate.
3. Click **Request.**

**Expected Result.** The request appears at the top of the dashboard list, status **Pending**.

**SOP 6-7: Export a Reimbursement Form**
1. Open the request's View screen, click **Export** — downloads a formatted `.xlsx` reimbursement form (Payee/Supplier, Control No., Date, Particulars/Amount, Mode of Payment, Type of Expense, and signature lines for Requested by / Prepared by / Reviewed by / Reviewed by / Approved by).

**SOP 6-8: Approve a Reimbursement Request**
1. Open the request, click **Approve.**
2. In the confirmation overlay, select **Approve** or **Decline**, add remarks, click **Yes.**

**Expected Result.** Once approved, the request is automatically recorded as a Book Keeping entry under the **!Reimbursement** account (Debit = amount, per Section 6.6).

**Verification.** Confirm the new Book Keeping row's amount matches the reimbursement's Total Amount exactly.

## 6.8 Utility Expense

Utility expenses are "the costs incurred by a company for utilizing necessities such as electricity, water, waste disposal, heating, and sewage... considered operating expenses and are included in the income statement."

### Step-by-Step SOP

**SOP 6-9: File a Utility Expense Request**
1. **Finance > Utility Expense > Request Utility Expense.**
2. Fill Due Date, Request Form (**HRA** or **RFP**), Payee/Supplier, Requested By, Purpose, Description (add multiple items via **+**), Type of Expense, Quantity, Unit Price, Mode of Payment, Total Amount, Upload Bills. Date and Control No. auto-generate.
3. Click **Request.**

**SOP 6-10: Approve a Utility Expense Request**
1. Open the request's View screen, review the inputted information and History (Added By, Added Date, Status).
2. Click **Approve**, then confirm **Approve** or **Decline** with remarks in the overlay.

**Expected Result.** Approved/Declined requests are visually marked by status in the dashboard list; an approved request is automatically recorded as a Book Keeping entry under the **!Utility Expense** account.

**Common Mistakes.** ⚠ Confusing the **Request Form** field's HRA vs. RFP values — these correspond to different internal paper-request conventions (e.g., control numbers observed as `PRF-HRAD-2024-1`); use whichever your organization's actual paper/approval process expects.

## 6.9 Settings

### 6.9.1 General

A single toggle: **Hide/Unhide the shared expense/type of request in reimbursement/utility expenses** — controls whether certain shared-expense fields/type-of-request options are exposed on the Reimbursement and Utility Expense request forms.

### 6.9.2 Accounts

Three accounts are **hardcoded** and cannot be renamed or deleted — only their **Bank** assignment can be changed: **!Cash Advance, !Reimbursement, !Utility Expense.**

**SOP 6-11: Assign a Bank to an Account**
1. **Finance > Settings > Accounts**, click the hamburger/bank-assignment icon on the target account's row.
2. In **Edit Bank**, select the bank, click **Update.**

**SOP 6-12: Add a Custom Account**
1. **Settings > Accounts > Add Account.**
2. Fill Name; choose **With Voucher** or **No Voucher**; choose a **Revolving Fund Account** type (Adspent Account / COG Purchase Account / Shipping Fee Account / Not Applicable); check **Exclude in Gross Revenue** if applicable; select **Members** (multiple users who can use this account).
3. Click **Submit.**

**Action buttons per account row:** View, Activate/Deactivate, With/No Voucher toggle.

### 6.9.3 Banks

**SOP 6-13: Add a Bank**
1. **Settings > Banks > Add Bank**, enter the bank Name, **Submit.**
2. Action buttons: View, Activate/Deactivate.

### 6.9.4 Department

**SOP 6-14: Add a Department**
1. **Settings > Department > Add Department**, enter the Department Name, **Submit.**
2. Action buttons: View, Activate/Deactivate.

*(Note: these Finance-module Departments are the same department records referenced by Kanban Board "By Department" story assignment in Module 5, and by HR department structures once Module 8 is documented.)*

### 6.9.5 Type of Expense

**SOP 6-15: Add a Type of Expense**
1. **Settings > Type of Expense > Add Type of Expense.**
2. Fill **Type of Opex** (a category, e.g., "Other Expense," "Operating Expense," "Revolving Funds," "Non-Operating Expense"), **Name** (e.g., "Travel Funds," "Repair and Maintenance," "Electricity"), and **Type**: **Income (Credit)**, **Expenses (Debit)**, or **Not Applicable (Not Debit, Not Credit).**
3. Click **Submit.**

**Best Practices.** ✅ Establish a stable, agreed Type of Expense list before staff start filing Reimbursement/Utility Expense requests day-to-day — the bulk-upload validation rule in SOP 6-5 means these names must match exactly wherever they're referenced later.

## 6.10 Decision Tree — Reimbursement/Utility Expense Request Stuck Pending

```
A filed request has been Pending for an unusually long time?
        ↓
       YES
        ↓
Was it routed to the correct approver / department?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Correct    Follow up directly with
routing/   the named approver —
department the request itself has
via Edit   no separate escalation
           mechanism inside the ERP
```

## 6.11 Common Mistakes

⚠ **Treating "Disable" as instant deletion** — it requires a reason and admin approval, and is explicitly irreversible once approved (Section 6.6).
⚠ **Bulk-uploading Bookkeeping/Reimbursement data with Account, Department, Bank, or Type of Expense names that don't exactly match Settings** — causes silent row-skipping.
⚠ **Comparing Income Statement Gross Revenue against the Finance Dashboard's Gross Revenue for a different date range** — always confirm both screens are set to the same period before comparing.

## 6.12 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| Bookkeeping bulk upload skips rows | Account/Department/Bank/Type of Expense name mismatch | Compare spreadsheet values against Settings screens exactly | Correct spelling/casing, re-upload | Finance data owner |
| Reimbursement/Utility Expense not appearing in Book Keeping after approval | Approval not actually completed (still Pending) | Re-check the request's status | Complete the Approve step | Finance approver |
| Income Statement's Projected figures look wrong | Underlying parcel statuses (In-Transit/Delivering/PPW) stale in Logistics & Inventory | Cross-check Module 7's Fulfillment/PPW screens | Update parcel statuses at the source | Logistics & Inventory data owner |
| A disable request can't be found after approval | Viewing the wrong account-status view (Enabled instead of Disabled) | Switch the Enabled/Disabled/For Approval dropdown | Switch to Disabled view | — |

## 6.13 Security

🔒 The Request → Approve → Post pattern (Section 6.3) is a deliberate segregation-of-duties control — per Module 9, distinct permission checkboxes exist for **Reimbursement: Requester vs. Approver** and **Utility Expense: Requester vs. Approver**, and Bookkeeping separately distinguishes **View/Add** from **View Approver** and **Add Type of Expense** rights. Never grant the same individual both Requester and Approver rights for the same expense category unless your organization has explicitly accepted that control gap.

## 6.14 Suggested Screenshots

📷 **Income Statement with Custom date range and parcel breakdown tables** — caption: "Actual funds, projected receivables, and RTS-adjusted PAR — all on one screen."
📷 **Book Keeping Request Disable overlay** — caption: "Disabling a transaction requires a documented reason and admin approval — never instant deletion."
📷 **Reimbursement exported .xlsx form** — caption: "A signed paper trail generated directly from the ERP request."
📷 **Settings – Accounts showing the three hardcoded accounts** — caption: "!Cash Advance, !Reimbursement, !Utility Expense — renameable only in bank assignment."

## 6.15 Administrator Notes

- Establish Banks, Departments, and Type of Expense entries before go-live — Bookkeeping bulk uploads and manual entry both depend on exact-match values.
- Periodically review the Disabled view as a light audit — every disabled transaction retains its full approval history.

## 6.16 Manager Notes

- **KPIs:** Profit & Loss trend period-over-period, Projected RTS impact on cash flow, Reimbursement/Utility Expense turnaround time (request to approval).
- Use the Income Statement's Custom date range to align financial reviews with marketing campaign windows (Module 3) or seasonal periods.

## 6.17 Employee Notes

**Daily responsibilities (Finance staff):** post Bookkeeping transactions same-day where possible; process pending Reimbursement/Utility Expense approvals; reconcile Bank running balances (Module 2, Section 2.B).

**Do's:** ✅ Always attach a receipt/bill upload when filing Reimbursement or Utility Expense requests.
**Don'ts:** ⚠ Don't request a transaction disable without a clear, specific reason — it becomes part of the permanent audit record.

## 6.18 Templates

**Reimbursement Request Checklist**
```
[ ] Payee/Supplier, Department, Name filled
[ ] Purpose and Particular/s clearly described
[ ] Type of Expense matches Settings exactly
[ ] Receipt uploaded
[ ] Control No. noted for follow-up
```

**Utility Expense Request Checklist**
```
[ ] Due Date set
[ ] Request Form (HRA/RFP) selected correctly
[ ] Bill uploaded
[ ] Total Amount matches the bill
```

**Monthly Bookkeeping Close Checklist**
```
[ ] All Reimbursement/Utility Expense requests for the period Approved or Declined (none left Pending)
[ ] Bank running balances reconciled against statements
[ ] Income Statement generated for the period and reviewed against Finance Dashboard
[ ] Any Disabled transactions for the period reviewed
```

---

*Next: Module 8 — Human Resources (pending source material)*
