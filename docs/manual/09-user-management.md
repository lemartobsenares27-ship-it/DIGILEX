# Module 9 — User Management

*Source: User Manual – LHIKE ERP: User Management (Valenin IT Services, updated 2:34 pm, March 21, 2024).*

## 9.1 Learning Objectives

After completing this module, the reader will be able to:

- Explain the full lifecycle of a LHIKE ERP user account, from creation to enable/disable.
- Add a new user and understand the two-step (admin-initiated + self-service request-access) onboarding flow.
- Read and edit the fine-grained, per-module permission checkbox matrix that makes up a user's Role.
- Explain what the "Mother Account" designation means and why it must be tightly controlled.
- Upload/update the company logo shown on the login page.

## 9.2 Business Purpose

**Why this module exists.** "This module involves the procedures and tasks related to overseeing user accounts and their access rights within a system. This includes creating, adjusting, and removing user accounts, as well as regulating the permissions and privileges linked to these accounts." Every other module's 🔒 Security notes throughout this manual point back to User Management as the place those permissions are actually granted.

**How it helps the business.** Centralizes account lifecycle and access control in one auditable screen, instead of ad hoc, undocumented access decisions — and lets an organization apply the principle of least privilege precisely, since almost every feature across all nine modules has its own dedicated permission checkbox.

**Who uses it.** System administrators exclusively for granting/editing access; every employee, indirectly, via the account this module creates for them.

**Departments involved.** IT/System Administration, with input from every department's manager on what access their staff actually need.

**Dependencies.** This module's role/permission matrix is the access-control layer that governs every other module documented in this manual (Modules 1–8). The **Department** field referenced during role assignment (E-commerce Board section) ties back to Finance's Settings – Department (Module 6).

## 9.3 Concepts

**Employee No. / Username / Full Name.** Each account has an internally assigned Employee No. (e.g., `GDT017`), a Username (which the user themselves sets during Request Access), and a Full Name/Position for identification in the User Management table.

**Employment Status.** A distinct field from account Enabled/Disabled — **Active, Inactive, Resigned, Terminated** — tracked per user, giving a clear record of *why* an account might currently be disabled, separate from the toggle itself.

**Two-step onboarding: Admin creates the stub, employee requests access.** Unlike a typical "admin sets a password and hands it over" model, LHIKE ERP splits account creation into two actions performed by two different people: (1) an administrator creates a bare record (Employee No., Name, basic info) via **Add User**, which is created **disabled and without login credentials**; (2) the employee themselves visits the LHIKE ERP login page and clicks **Request Access**, supplying their own Username, Password, and a security question/answer. The administrator then reviews and **Enables** the resulting account. This means the employee — not the administrator — is the one who sets their own password, and no account becomes usable until both steps are complete.

**Role = a matrix of checkboxes, not a named preset.** Rather than choosing from a small list of named roles (e.g., "Admin," "Staff"), LHIKE ERP's **Change Role** screen presents an exhaustive, per-module list of individual permission checkboxes, organized under headings mirroring the sidebar (E-commerce, User, Board, HR, Finance, Logistic & Inventory, Mother Account). An administrator builds a role for each user by checking exactly the boxes that person's job requires.

**Mother Account.** A distinct, separately-checked permission ("Access for Mother Account") that grants sweeping cross-account access — the manual groups it in its own section, set apart from every other module's permissions, signaling it should be treated as a special, tightly-restricted super-admin capability rather than a routine grant.

**Company Logo.** The image shown above the Sign In form on the login page — configurable from within User Management, not a separate branding/settings screen.

## 9.4 Navigation

- **Sidebar:** USER > **User Management** (this is the only item under the USER group, appearing at the very bottom of the full sidebar, below HR).

## 9.5 Feature Breakdown

Numbered to match the source manual's figure callouts.

1. **Sidebar option menu** for User Management.
2. **Table** — ID, Username (clickable — opens Edit user information), Full Name, Position, Last Login, Action (**Change Role**, **Enabled/Disabled** toggle).
3. **Search bar** and records-per-page selector.
4. **Change Role button** (per row) — opens the permission checkbox matrix (Section 9.7).
5. **Enabled/Disabled button** (per row) — identifies whether the user is active or inactive/resigned, and toggles it.
6. **Add User** button (top right) — starts the two-step onboarding flow (Section 9.6).
7. **Add Company Logo** button (top right) — Section 9.8.
8. **Pagination.**

## 9.6 Step-by-Step SOP — Onboarding a New User

**SOP 9-1: Administrator Creates the User Stub**
1. **User Management > Add User.**
2. Fill Employee No., Last Name, First Name, Middle Name, Birthdate, Contact Number, Personal Email, Company Email, Gender, Position, Employment Date, Employment Status.
3. Click **Save.**

**Expected Result.** The new user (e.g., "Juan Dela Cruz") appears in the User Management table with **NO REQUEST ACCESS** shown in place of the usual Change Role/Enabled buttons — the account exists but has no username/password yet and cannot log in.

**SOP 9-2: Employee Self-Registers via Request Access**
1. The new employee goes to the LHIKE ERP login page and clicks **REQUEST ACCESS.**
2. They fill Employee ID, Full Name, Username, Password, Re-type password, a Security Question and Answer, then **Submit.**

**Expected Result.** A confirmation states the request is subject to administrator verification. Back in User Management, the row now shows a real Username and a **Disabled** button (still not usable) instead of "NO REQUEST ACCESS."

**SOP 9-3: Administrator Enables the Account**
1. In User Management, click the **Disabled** button on the new user's row.
2. Confirm **Enable [username]** in the overlay, click **Submit.**

**Expected Result.** The account becomes **Enabled** and the employee can now log in with the username/password they set in SOP 9-2.

**Verification.** Confirm the employee can successfully sign in, and that their Last Login timestamp updates in the User Management table after their first login.

**Common Mistakes.** ⚠ Assuming Add User (SOP 9-1) alone grants login access — it explicitly does not; the employee must still complete Request Access, and the administrator must still Enable the account. ⚠ Skipping the Change Role step (Section 9.7) after enabling — a newly enabled account still needs its permission checkboxes set before it is useful, since roles are not assigned automatically.

## 9.7 Step-by-Step SOP — Assigning a Role (Permissions)

**SOP 9-4: Edit a User's Permissions**
1. **User Management**, click **Change Role** on the target user's row.
2. The **User Role** screen shows the user's Name, Employee No., Position, Status at the top, followed by a long checklist grouped by module. Representative groups and checkboxes observed in the source manual:
   - **E-commerce** — Dashboard (View); Ads (View/Upload/Edit); **Sales Order** (View All, Edit Order (All), Verify Order, View (Own), Create New Order, Upload Sales Order (Excel), Delete Order, View Report, Update Parcel Status (NCW)); **Conversion Rate** (View (All)/(Own), Upload Conversion & Update Sales); **New Item Request** (View/Create/Edit Request (Own/All), Archive (Own/All), Set Page, Update Vendor, 1st Approver, Update Platform, 2nd Approver); **Pages** (View/Add/Edit (Own/All), Delete (Platform)); **BM** (View/Add/Edit (Own/All), Delete (All)); **Account Health** (Manage View/Update, View Only); **Calculator** (View); **Customer Settings.**
   - **User** — **User Management** (Manage role, access, and account status).
   - **Board** — **Kanban** (Kanban Board, Settings, View All).
   - **HR** — Dashboard (View); **201 File** (View/Add/Edit); **Leave Credits** (View/Add).
   - **Finance** — Dashboard (View); **Remittance** (View, Edit Remittance, Save Auto-computed Remittance); **Payroll** (Manage Payroll); **Book Keeping** (View/Add, View Approver, Add Type of Expense); **Settings** (View/Add/Change Status); **Reimbursement** (Requester, Approver); **Utility Expense** (Requester, Approver).
   - **Logistic & Inventory** — Dashboard (View); **Purchase Order** (Received Delivery, Edit (Add Assigned), View (Owned & assigned), Create/Edit/Delete/Copy (Owned), View (All), Bank Settings); **Products** (View/Edit, Remaining Items (View), Delete, View Deleted Item, Upload Products, Upload Unit Codes); **Fulfillment** (Placer Status Update (via Excel Import), Manage Fulfillment, Create Order in Portal, Print Waybill, API Export); **RTS** (View, Update Goods & Damage, RTS Approver); **Supplier** (View, Edit, Fulfillment Settings); **Fulfillment Settings**; **Inventory Release Summary** (Remove).
   - **Mother Account** — **Access for Mother Account** (grants all-account access into one).
3. Check exactly the boxes this user's role should have.
4. Click **Submit** (or **Cancel** to discard).

**Verification.** Log in as (or observe) the user and confirm sidebar items and action buttons match exactly what was checked — anything unchecked should be invisible or inaccessible to them.

**Common Mistakes.** ⚠ Checking **Delete (All)**-type permissions broadly "to be safe" — per the least-privilege principle, grant destructive/bulk rights only to roles that specifically require them (see the 🔒 Security notes throughout Modules 3, 6, and 7). ⚠ Checking **Mother Account > Access for Mother Account** for a routine staff role — this is a super-admin-level grant and should be reserved for a very small number of accounts.

## 9.8 Step-by-Step SOP — Company Logo

**SOP 9-5: Upload/Change the Company Logo**
1. **User Management > Add Company Logo.**
2. **Select file** (jpg/png/jpeg), click **Upload.**

**Expected Result.** A success prompt confirms the upload, and the new logo appears above the Sign In form on the login page for all users immediately.

## 9.9 Decision Tree — Employee Can't Log In

```
New/returning employee reports they cannot log in?
        ↓
Has the employee completed "Request Access" on the login page?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Direct them  Is their account shown as
to Request   Enabled in User Management?
Access            ↓
(SOP 9-2)    ┌────┴────┐
             NO         YES
             ↓           ↓
        Admin enables   Check Employment Status —
        the account     if Resigned/Terminated,
        (SOP 9-3)       access should stay disabled;
                        if Active, check Change Role
                        for missing permissions
```

## 9.10 Real Business Scenario — Offboarding

An employee resigns. The administrator does **not** delete their User Management record (preserving audit history of everything they did while employed). Instead: (1) set **Employment Status** to **Resigned** on their Edit user information screen, and (2) click their **Enabled** button to **Disable** the account, preventing further login while keeping their historical actions (Bookkeeping entries added, Purchase Orders created, Kanban stories assigned, etc.) fully attributable and intact across every other module.

## 9.11 Common Mistakes

⚠ **Treating Add User as sufficient for onboarding** — it is only step one of three (Section 9.6).
⚠ **Deleting a departing employee's account** instead of disabling it — this is not the documented pattern; Employment Status + Disable preserves the audit trail that every other module's History panels depend on.
⚠ **Granting Mother Account access broadly.**
⚠ **Forgetting Change Role after Enable** — an enabled-but-role-less account can log in but will see almost nothing useful.

## 9.12 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| New hire's row shows "NO REQUEST ACCESS" indefinitely | Employee hasn't visited the login page's Request Access form yet | Confirm with the employee directly | Have them complete SOP 9-2 | HR / onboarding coordinator |
| User can log in but sees almost no menus | Role/permissions never assigned after Enable | Check Change Role for the account | Assign appropriate permissions (SOP 9-4) | System administrator |
| A resigned employee's account is still Enabled | Offboarding step (Section 9.10) not completed | Check Employment Status and Enabled/Disabled state | Set Resigned + Disable immediately | System administrator |
| Company logo doesn't update on login page after upload | Browser cache | Hard-refresh the login page | Clear cache / reload | — |

## 9.13 Security

🔒 This entire module **is** the Security chapter's mechanism for every other module in this manual. Key controls to enforce:
- **Least privilege by default** — grant only the checkboxes a role's actual job requires; expand later on request rather than granting broadly upfront.
- **Segregation of duties** — per Module 6, never grant the same person both Requester and Approver checkboxes for Reimbursement or Utility Expense; per Module 7, restrict Purchase Order Delete/Bank Settings rights narrowly.
- **Mother Account is a super-admin grant** — restrict to the smallest possible number of accounts, and treat any change to who holds it as a significant, loggable event.
- **Offboarding = Disable + Employment Status change, never delete** — preserves audit history system-wide.
- **Two-person onboarding control** — because the employee (not the admin) sets their own password via Request Access, no administrator ever knows another user's credentials, a meaningful security property worth preserving rather than working around.

## 9.14 Suggested Screenshots

📷 **User Management table** — caption: "Every account: username, position, last login, role, and enabled status in one screen."
📷 **Change Role screen, E-commerce section expanded** — caption: "Permissions are granted checkbox by checkbox, module by module — not by a single named role."
📷 **Request Access screen (login page)** — caption: "The employee — not the administrator — sets their own username and password."
📷 **Add Company Logo screen** — caption: "Branding the login page directly from User Management."

## 9.15 Administrator Notes

- Maintain a written role template per position (e.g., "Warehouse Packer," "Finance Approver") mapping to the exact checkbox set, so Change Role stays consistent across similar hires instead of being configured freehand each time.
- Periodically audit the Mother Account list and the Book Keeping/Reimbursement Approver list for segregation-of-duties violations.

## 9.16 Manager Notes

- Review your department's staff list in User Management periodically to confirm Employment Status and permissions still match each person's actual current role.
- Approve access requests promptly — an employee who has completed Request Access but is waiting on Enable cannot do their job.

## 9.17 Employee Notes

**Onboarding:** complete Request Access on the login page as soon as your administrator confirms your Employee No./record exists; choose a strong password and a security question/answer only you would know.

**Do's:** ✅ Report immediately if you can see menus/data that don't seem related to your job — this may indicate an over-broad role grant.
**Don'ts:** ⚠ Don't share your username/password with a colleague to "borrow" access — request the correct permission through your administrator instead.

## 9.18 Templates

**Employee Onboarding Checklist**
```
[ ] Add User (Employee No., name, position, employment date) — admin
[ ] Employee completes Request Access — employee
[ ] Account Enabled — admin
[ ] Role/permissions assigned per position template — admin
[ ] First login confirmed (Last Login populated)
```

**Employee Offboarding Checklist**
```
[ ] Employment Status set to Resigned/Terminated
[ ] Account Disabled
[ ] Mother Account access revoked, if held
[ ] Pending approvals (Reimbursement/Utility Expense/PO) reassigned to another approver
[ ] Kanban stories / Purchase Orders assigned to departing user reviewed and reassigned
```

---

*Next: Module 8 — Human Resources (pending source material)*
