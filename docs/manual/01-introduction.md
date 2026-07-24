# Module 1 — Introduction

*Source: LHIKE ERP Tutorial, Lesson 1 of 33 — "Introduction" (EcommUniversity, Exponential University, published March 3, 2025); sidebar/navigation structure cross-referenced against the official Valenin IT Services user manuals for Sales Warehouse Logistics and Finance (2024).*

---

## 1.1 Learning Objectives

After completing this module, the reader will be able to:

- Explain what LHIKE ERP is, what problem it solves, and why an e-commerce start-up would adopt it over spreadsheets or point solutions.
- List the five functional pillars (Logistics, HR, Inventory, Kanban, E-commerce) the platform integrates and name the nine documentation modules that map to the live system.
- Recognize LHIKE ERP's primary navigation structure (sidebar module groups, top bar, date-range filters) well enough to orient themselves in any module without further instruction.
- Describe the seven core advantages of the platform and use them to explain the system's value to a new hire or stakeholder.
- Compare LHIKE ERP's design philosophy to that of a traditional, industry-agnostic ERP suite.

## 1.2 Business Purpose

**Why this module exists.** Every reader of this manual — regardless of department — needs a shared mental model of the system before they touch any single module. Module 1 is that shared foundation.

**How it helps the business.** Consistent onboarding. A new warehouse hire, a new bookkeeper, and a new marketing hire all start from the same orientation, which shortens training time and reduces the "nobody explained this to me" class of operational mistakes.

**Who uses it.** Every LHIKE ERP user, on their first day, and every trainer delivering onboarding.

**Departments involved.** All departments (this is a cross-functional orientation module, not a department-specific one).

**Dependencies.** None — this module is the entry point to the entire manual. Every other module assumes the reader has completed this one.

## 1.3 Concepts

Before using LHIKE ERP, a new user should understand the following concepts:

**ERP (Enterprise Resource Planning).** Software that integrates the core business processes of an organization — in this case sales, warehouse, logistics, finance, HR, and e-commerce marketing — into one system with one shared dataset, so that information entered once (e.g., a parcel marked "Delivered") is instantly reflected everywhere it matters (dashboard totals, finance revenue recognition, logistics status), instead of needing to be re-entered in multiple spreadsheets.

**Module.** A self-contained functional area of LHIKE ERP (e.g., Finance, HR) accessed from the sidebar. Each module has its own sub-navigation, permissions, and settings, but shares the same underlying company data as every other module.

**Dashboard vs. Module.** In LHIKE ERP, "Dashboard" is itself a module group containing summary/overview screens (Sales Warehouse Logistics, Finance) that roll up figures computed by the deeper operational modules. It is the place to check "how are we doing right now," while the deeper modules (Logistics & Inventory, Finance, HR) are where the underlying transactions are actually entered and managed.

**Parcel status funnel.** A concept specific to e-commerce/COD (cash-on-delivery) logistics: an order's parcel moves through a sequence of statuses from creation to final outcome (e.g., Unfulfilled → Shipped Out → In-Transit → On-Delivery → Delivered, or alternatively → For Return → Returned/RTS). Understanding this funnel is essential before using the Dashboard or Logistics & Inventory modules — it is covered in depth in Module 2.

**Role-based access.** Not every user sees every module or every action within a module. What a given login can see and do is controlled by the User Management module (Module 9). This module is referenced throughout the manual as **🔒 Security** notes; it is documented in full once its source manual is available (see Document Control in the front matter).

## 1.4 Navigation

*The following describes the primary navigation chrome common to every module, as evidenced in the screen captures accompanying the Sales Warehouse Logistics and Finance manuals. Module-specific navigation (tabs, filters unique to a module) is documented within each module's own chapter.*

**Sidebar (left).** A persistent, collapsible vertical menu, grouped by module. Observed top-level groups, in order:

- **DASHBOARD** — Sales Warehouse Logistics, Finance
- **E-COMMERCE** — Pages & Store, Page ROAS Tracker, Adspend ROAS Summary, Sales Tracker, Product Testing, BM & Ad Account, Profitability Formula, Settings
- **BOARD** — Kanban Board, Settings
- **FINANCE** — Income Statement, Book Keeping, Reimbursement, Utility Expense, Settings
- **LOGISTIC & INVENTORY** — *(sub-items documented in Module 7 once its manual is supplied)*
- **HR** *(sub-items documented in Module 8)*
- **USER** *(User Management, documented in Module 9)*

The active module is highlighted in the sidebar (solid color fill) so the user always knows which module they are in. The sidebar icon at the very top toggles the sidebar's collapsed/expanded state.

**Top bar (right side of every screen).** Contains, from left to right: a notification bell icon, and the logged-in user's account menu (shown as "Admin ▾" in the source screenshots), which is where account-level actions (e.g., logout) live.

**Date-range selector (top right, module content area).** Present on Dashboard-type screens. Displays the currently selected date range (e.g., "MARCH 01, 2024 – MARCH 13, 2024") and opens a calendar picker with quick-select options: **Today**, **Yesterday**, **Last 7 Days**, **Last 30 Days**, **This Month**, **Last Month**, and **Custom** (manual start/end date selection via two linked calendar widgets). This control reappears throughout the system wherever a screen shows time-bound figures — learning it once in Module 2 means it is already familiar in every later module.

**Breadcrumb.** Below the top bar, each screen shows a small breadcrumb trail (e.g., "Sales Warehouse Logistics ›" or "Finance ›") confirming the current location within the module.

## 1.5 The Five Pillars

LHIKE stands for the five functional domains unified by the platform:

```
   L — Logistics        →  Module 7 (Logistics & Inventory)
   H — Human Resources  →  Module 8 (HR)
   I — Inventory         →  Module 7 (Logistics & Inventory)
   K — Kanban             →  Module 5 (Board)
   E — E-commerce        →  Module 3 (E-commerce), Module 4 (Pancake Integration)
```

Finance and the Dashboard sit above and across these pillars: Finance consolidates the monetary consequences of Logistics/Inventory and E-commerce activity, and the Dashboard summarizes all of it for daily monitoring.

## 1.6 Advantages of LHIKE ERP

1. **Efficient Management of Key Operations** — eliminates manual data entry across departments, reducing transcription and reconciliation errors.
2. **Improved Productivity** — automates routine processes, reducing manual labor and increasing throughput.
3. **Cost Savings** — replaces multiple single-purpose tools with one platform, cutting software and maintenance costs.
4. **Real-Time Information and Insights** — supports informed, current decision-making instead of end-of-month reporting.
5. **Better Collaboration** — gives every department a shared platform, improving cross-department communication and reducing error-prone hand-offs.
6. **Scalability** — grows with the company; additional users, modules, and data volume are accommodated without a platform change.
7. **Tailored for E-commerce** — purpose-built for the operational realities of e-commerce (COD collection, courier remittance, ad-spend ROAS) rather than generically configured.

## 1.7 LHIKE ERP vs. Other ERP Systems

| Dimension | Traditional Enterprise ERP | LHIKE ERP |
|---|---|---|
| Scope | Broad, industry-agnostic; e-commerce workflows require custom add-ons | Purpose-built around e-commerce/COD operations from the start |
| Cost profile | High licensing + implementation cost, often priced for large enterprises | Cost-effective, aimed at start-ups and growing SMEs |
| Time to value | Long implementation/configuration cycles | Modules map directly to how an e-commerce business already operates |
| Integration surface | Frequently a hub of separately licensed modules/add-ons | Single platform covering logistics, inventory, HR, Kanban, and e-commerce out of the box |

## 1.8 Real Business Scenario — Why a Start-Up Adopts LHIKE ERP

**Scenario.** A small COD e-commerce seller starts with three spreadsheets: one team member logs orders as they come from Facebook, another checks courier portals daily to see which parcels were delivered, and a third reconciles courier remittances against a bank statement once a month. Each file is a source of truth for one fact, and no one file agrees with another during the month.

**What breaks first.** As order volume grows past what one person can track by hand, the courier-status spreadsheet falls behind, the owner cannot get a same-day answer to "how much did we actually collect this week," and reconciling remittances becomes a multi-day monthly fire drill.

**How LHIKE ERP changes this.** Order and parcel status live in one system (Dashboard / Logistics & Inventory), visible in real time without anyone needing to manually poll a courier portal into a spreadsheet. Finance figures on the Dashboard (Gross Revenue, Operating Revenue, Adspend, COG Purchase, Shipping Fee) are computed from the same underlying data the warehouse and logistics teams are updating — so the owner's "are we profitable this week" question has a same-day answer instead of a month-end one.

This scenario recurs throughout the manual: every module chapter includes at least one real business scenario showing the same principle — one shared dataset instead of many disconnected files.

## 1.9 Common Mistakes (Orientation-Level)

⚠ **Treating LHIKE ERP like a set of unrelated apps.** New users sometimes update a fact in one module (e.g., manually noting a delivery in a side spreadsheet) instead of updating it at the source in LHIKE ERP, recreating the exact data-drift problem the platform exists to prevent.

⚠ **Skipping the Dashboard module.** Some new users go straight to their department's deep module (e.g., Finance staff jumping straight to Book Keeping) without ever learning the Dashboard, and as a result don't know where to look for the fast, at-a-glance answer to common questions.

⚠ **Not learning the date-range selector early.** Because it reappears on nearly every screen with time-bound data, not understanding it in Module 2 causes repeated confusion in every later module.

## 1.10 Administrator Notes

- Onboarding a new employee into LHIKE ERP begins with an account created in the User Management module (Module 9) with a role appropriate to their department, before any training on individual modules should begin.
- Administrators should ensure new hires are pointed to this manual (or the relevant module chapters) as part of the account-provisioning checklist, not left to learn the system by trial and error.

## 1.11 Manager Notes

- Use this module as the basis for a short, standardized orientation session (30–45 minutes) for every new hire, regardless of department, before handing them off to department-specific training.
- The seven advantages in Section 1.6 are useful talking points when justifying continued LHIKE ERP investment/training time to stakeholders unfamiliar with the system.

## 1.12 Employee Notes

**Daily responsibilities at this stage:** none yet — this module is orientation only.

**Best practices:**
- ✅ Learn the sidebar module groups before your first shift on the live system.
- ✅ Ask your trainer which modules apply to your role so you know what to focus on first.

**Do's:**
- ✅ Do treat LHIKE ERP as the single source of truth — if a fact isn't in the system, it isn't official yet.

**Don'ts:**
- ⚠ Don't keep a "shadow" spreadsheet duplicating what LHIKE ERP already tracks — this reintroduces the data-drift problem the system exists to eliminate.

## 1.13 Suggested Screenshots

📷 **LHIKE ERP landing/login page** — caption: "The LHIKE ERP entry point — every module is reached from here."
📷 **Full sidebar, expanded, showing all module groups** — caption: "The complete LHIKE ERP navigation structure: Dashboard, E-commerce, Board, Finance, Logistics & Inventory, HR, and User Management."
📷 **Top bar close-up (notification bell + Admin account menu)** — caption: "Account and notification controls, present on every screen."

---

*Next: Module 2 — Dashboard (Sales Warehouse Logistics · Finance)*
