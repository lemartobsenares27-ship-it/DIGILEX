# LHIKE ERP

## Complete User Manual, Operations Guide, Administrator Handbook & Standard Operating Procedures (SOP)

### *The Complete Guide to Operating, Managing, Scaling, and Mastering LHIKE ERP for E-commerce Businesses*

---

**Publisher of the underlying system:** Valenin IT Services — *"Run your business with no worries."*
**Product:** LHIKE ERP
**Documentation compiled from:** Official Valenin IT Services LHIKE ERP user manuals (module-by-module PDF series, 2024) and the LHIKE ERP Tutorial course (EcommUniversity / Exponential University, 33 lessons, first published March 3, 2025)
**Document type:** Consolidated Operations Manual, User Guide, Training Handbook, and SOP Manual
**Status:** Living document — expanded module by module as source material is incorporated. See [Document Control](#document-control) below for current coverage.

---

## Copyright

LHIKE ERP, the LHIKE ERP logo, and all associated screen layouts, module names, and workflows described in this manual are products of **Valenin IT Services**. Portions of the source explanatory text in this manual are adapted from the LHIKE ERP Tutorial course published by EcommUniversity on the Exponential University platform.

This consolidated manual is a **derivative training and reference document** assembled for internal company use — onboarding, daily operations, administrator training, and standard operating procedures. It is not itself an official Valenin IT Services publication. No claim of ownership over the LHIKE ERP product, brand, or software is made by the compilation of this document.

All company data, figures, screenshots, and business examples referenced in this manual (e.g. sample product SKUs, sample fee rates, sample courier names) are illustrative unless your organization has configured its own values, in which case your organization's live configuration always takes precedence over any example in this text.

## Disclaimer

This manual is provided for **internal training and operational reference purposes only**. While every effort has been made to ensure this document accurately reflects the LHIKE ERP screens, fields, and workflows as documented in the source manuals (dated March 2024 onward) and the source training course (published 2025), software is continuously updated. Menu labels, button placements, field names, and workflow steps in your live LHIKE ERP environment **may differ** from what is described here if your version has been updated since this manual's last revision.

Where a section of this manual is marked **"Pending source material"**, it means the underlying official module manual or lesson had not yet been supplied to the documentation team at the time of writing. Such sections will be completed in a later revision rather than filled with unverified guesses about the software's behavior.

Where this manual includes general operational guidance — best practices, common-mistake patterns, troubleshooting escalation paths, checklist templates — that content is **supplementary SOP guidance** written for this handbook and should be adapted to your organization's actual policies, approval chain, and risk tolerance. It is clearly distinguished from documented system behavior throughout.

This manual does not replace vendor support. For defects, outages, or behavior that contradicts this manual, contact your LHIKE ERP administrator or Valenin IT Services support channel first.

## Preface

Every growing e-commerce operation eventually hits the same wall: spreadsheets stop scaling. Orders come in faster than they can be tracked by hand, warehouse staff lose sight of what has shipped and what hasn't, finance closes the books a month late because nobody can agree on the numbers, and management has no single place to look to understand whether the business is actually profitable this week.

LHIKE ERP exists to close that gap. It is a single platform that unifies the operational backbone of an e-commerce business — sales and warehouse visibility, logistics and fulfillment, inventory, finance and bookkeeping, human resources, task management (Kanban), and marketplace/ad-platform integrations — so that every department works from the same live data instead of five disconnected files.

This manual exists because a system this central to daily operations deserves documentation that matches its importance: not a quick-start flyer, but a complete reference that a new hire can learn from on day one and an administrator can still consult two years later. It is written to be read cover to cover by someone who has never used ERP software before, and to be used as a lookup reference by someone who already knows the system but needs the exact steps for a task they perform rarely.

## How to Use This Manual

**If you are new to LHIKE ERP:** start with Module 1 (Introduction) and read the System Overview below before touching any module. Understanding *why* the system is organized the way it is will make every subsequent module easier to learn.

**If you are being trained for a specific role:** your trainer will typically point you to the module(s) relevant to your department (e.g., warehouse staff → Module 2 (Dashboard) and Module 7 (Logistics & Inventory); bookkeeping staff → Module 6 (Finance); HR staff → Module 8 (HR)). Each module is self-contained enough to be read on its own, but assumes you have read Module 1 first.

**If you are looking for a specific procedure:** every module contains a **Step-by-Step SOP** subsection for each feature, formatted identically throughout the manual: Purpose → Prerequisites → Steps → Expected Result → Verification → Common Mistakes → Recovery → Best Practices. Use your document viewer's search function to jump directly to the feature name.

**If you are an administrator or manager:** each module contains dedicated **Administrator Notes** and **Manager Notes** subsections covering configuration, monitoring, KPIs, and approvals specific to that module, in addition to the general guidance in the dedicated chapters near the end of this manual (Security, Internal Controls, Audit Readiness, Disaster Recovery, etc.).

**Icons and conventions used throughout this manual:**

| Convention | Meaning |
|---|---|
| **Bold** | UI element name (button, field, menu item, tab) |
| `Fixed-width` | Exact value to type or select |
| > | Menu navigation path, e.g. **Finance > Book Keeping** |
| ⚠ | Common mistake or risk to avoid |
| ✅ | Best practice |
| 🔒 | Security- or permissions-relevant note |
| 📷 | Suggested screenshot placement for the illustrated edition |

## Document Control

| Module | Source material | Status |
|---|---|---|
| Front Matter | This project | Complete |
| Module 1 — Introduction | LHIKE ERP Tutorial, Lesson 1 (Introduction) | Complete |
| Module 2 — Dashboard | *User Manual – LHIKE ERP: Sales Warehouse Logistics* (updated 3:32 PM, Mar 13, 2024); *User Manual – LHIKE ERP: Finance* (updated 2:13 PM, Mar 21, 2024) | Complete (dashboard-level screens only) |
| Module 3 — E-commerce | Pages & Store, Page ROAS Tracker, Adspend ROAS Summary, Sales Tracker, Product Testing, BM & Ad Account, Profitability Formula | Pending source material |
| Module 4 — Pancake Integration | Tracking Numbers for Pancake Orders | Pending source material |
| Module 5 — Board (Kanban) | Kanban Board, Kanban Board Settings | Pending source material |
| Module 6 — Finance (deep module) | Income Statement, Book Keeping, Reimbursement, Utility Expense, Settings (Accounts/Banks/Department/Type of Expense) | Pending source material |
| Module 7 — Logistics & Inventory | Purchase Order, Product Items, Stocks, Unit Codes, Fulfillment, Shipped Out (Barcode), Fulfillment Settings, RTS Items, Settings (General/API) | Pending source material |
| Module 8 — HR | 201 File, Deduction, Cash Advance, Department, Schedule, Holiday, Event, Payroll, Payroll Period, Leave Credits, Request, Branch, Settings | Pending source material |
| Module 9 — User Module | User Management | Pending source material |
| Additional chapters (Best Practices, SOP, Internal Controls, Audit Readiness, DR, Backup, Change Mgmt, Multi-Branch/Warehouse, Reporting Strategy, FAQ, Glossary) | Synthesized from all modules once complete | Pending — written last, after all modules are documented |

Each new module is appended to this manual as its source manual/lesson is supplied. This document control table is updated with every revision so readers always know what is authoritative and what is still outstanding.

---

## Table of Contents

1. Cover Page
2. Copyright
3. Disclaimer
4. Preface
5. How to Use This Manual
6. Document Control
7. System Overview
8. **Module 1 — Introduction**
9. **Module 2 — Dashboard** (Sales Warehouse Logistics · Finance)
10. Module 3 — E-commerce *(pending)*
11. Module 4 — Pancake Integration *(pending)*
12. Module 5 — Board / Kanban *(pending)*
13. Module 6 — Finance *(pending)*
14. Module 7 — Logistics & Inventory *(pending)*
15. Module 8 — Human Resources *(pending)*
16. Module 9 — User Management *(pending)*
17. ERP Best Practices & SOP Library *(pending)*
18. Internal Controls & Audit Readiness *(pending)*
19. Disaster Recovery & Backup Strategy *(pending)*
20. Change Management & Version Control *(pending)*
21. Multi-Branch & Multi-Warehouse Operations *(pending)*
22. Reporting Strategy & KPI Dashboard Design *(pending)*
23. Automation Opportunities & Future/AI Integrations *(pending)*
24. Frequently Asked Questions *(pending)*
25. Complete Glossary *(pending)*

---

## System Overview

### What LHIKE ERP Is

LHIKE ERP is a business management software platform that combines the functionality of **Logistics, Human Resources, Inventory, Kanban (task/workflow management), and E-commerce** operations into a single integrated system. It was purpose-built by Valenin IT Services for start-up and growing e-commerce companies that need the operational discipline of enterprise software without the cost, complexity, and multi-vendor sprawl of traditional enterprise ERP suites.

The name **LHIKE** reflects the five pillars the platform brings together under one login, one database, and one set of permissions — replacing what would otherwise be five or more separate tools (a warehouse system, an HRIS, an accounting package, a project board, and ad-hoc spreadsheets for e-commerce/ad tracking).

### Why It Exists — The Business Problem

A typical e-commerce start-up begins with spreadsheets: one for orders, one for expenses, one for payroll, one for ad spend, one for warehouse counts. This works until the business grows past a handful of orders per day. Past that point, spreadsheets introduce three compounding risks:

1. **Data drift** — the same fact (e.g., "was this parcel delivered?") lives in multiple files that disagree with each other because they are updated manually and independently.
2. **No real-time visibility** — management cannot answer "are we profitable this month?" without waiting for someone to manually reconcile numbers across files.
3. **No institutional memory** — when the one employee who understands the spreadsheet leaves, the process leaves with them.

LHIKE ERP addresses this by making every department (sales, warehouse, logistics, finance, HR, marketing/e-commerce) read from and write to the same underlying system, with role-based visibility so each user sees what is relevant to their job while management sees the consolidated picture.

### Advantages of LHIKE ERP

1. **Efficient Management of Key Operations** — process optimization by eliminating manual data entry, which reduces the risk of transcription and reconciliation errors.
2. **Improved Productivity** — automation of routine, repetitive processes reduces reliance on manual labor and increases overall throughput per employee.
3. **Cost Savings** — a single platform replaces multiple point solutions, reducing both software licensing costs and the administrative overhead of maintaining several systems.
4. **Real-Time Information and Insights** — dashboards surface current figures rather than end-of-month reports, so decisions are made on current data.
5. **Better Collaboration** — one shared platform for all departments to exchange information reduces the miscommunication and version-control problems inherent to file-based workflows.
6. **Scalability** — designed to grow with the company: additional modules, users, branches, and warehouses can be added as the business expands, without a platform migration.
7. **Tailored for E-commerce** — unlike generic ERP systems, LHIKE ERP's feature set (COD/parcel status tracking, ad-spend ROAS tracking, marketplace/courier integrations) is purpose-built around how e-commerce businesses actually operate.

### LHIKE ERP Compared to Other ERP Systems

Traditional ERP platforms (SAP, Oracle, Dynamics, NetSuide-class systems) are built to be configured for *any* industry, which means e-commerce-specific workflows (parcel status funnels, courier remittance reconciliation, ad-platform ROAS tracking) must be custom-built on top of them at significant cost. LHIKE ERP takes the opposite approach: it integrates the functions an e-commerce business actually needs into a single platform while remaining cost-effective for start-ups, because it is purpose-designed around e-commerce operations rather than generalized for every industry and then customized down.

### The Nine Modules

| # | Module | Core Function | Primary Users |
|---|---|---|---|
| 1 | Introduction | Orientation, concepts, navigation | All users |
| 2 | Dashboard | At-a-glance sales, warehouse, logistics, and finance KPIs | Management, warehouse leads, finance |
| 3 | E-commerce | Store/page management, ad ROAS tracking, product testing, profitability | Marketing, e-commerce managers |
| 4 | Pancake Integration | Order/tracking-number synchronization with the Pancake platform | Warehouse, logistics, customer service |
| 5 | Board (Kanban) | Visual task and workflow management | All departments |
| 6 | Finance | Income statement, bookkeeping, expense/reimbursement tracking | Finance, bookkeeping, management |
| 7 | Logistics & Inventory | Purchase orders, stock, fulfillment, barcode shipping, RTS handling | Warehouse, procurement, logistics |
| 8 | Human Resources | 201 files, payroll, attendance, leave, cash advance | HR, payroll, management |
| 9 | User Management | Accounts, roles, and access control | System administrators |

### System Architecture (Conceptual)

LHIKE ERP is a browser-based, centrally hosted platform. Every module reads from and writes to one shared company database, which is what allows, for example, a parcel's delivery status recorded in the Logistics & Inventory module to automatically update the "Delivered" figures shown on the Dashboard and the revenue recognized in the Finance module, without any manual re-entry.

```
                     ┌───────────────────────────┐
                     │        LHIKE ERP           │
                     │   (single shared database)  │
                     └─────────────┬───────────────┘
                                   │
   ┌───────────┬───────────┬───────┴───────┬───────────┬───────────┐
   │           │           │               │           │           │
Dashboard  E-commerce  Pancake Board (Kanban)  Finance   Logistics &   HR      User
                       Integration                       Inventory            Management
   │           │           │               │           │           │           │
   └───────────┴───────────┴───────────────┴───────────┴───────────┴───────────┘
                   All modules share one company-wide dataset;
              role-based permissions control what each user can see/edit.
```

### Who Uses LHIKE ERP

- **Executives / Owners** — consume the Dashboard and Finance modules for company-wide visibility; approve high-level decisions.
- **Managers / Department Leads** — monitor their department's KPIs, approve requests (leave, cash advance, reimbursement, purchase orders), and review reports.
- **Finance / Bookkeeping Staff** — operate the Finance module daily: bookkeeping entries, income statements, reimbursements, utility expenses.
- **Warehouse / Logistics Staff** — operate the Logistics & Inventory module: receiving, stock counts, fulfillment, barcode shipping.
- **Marketing / E-commerce Staff** — operate the E-commerce module: ad performance, ROAS, product testing, store/page management.
- **HR Staff** — operate the HR module: employee records, payroll, attendance, leave.
- **System Administrators** — operate the User Management module and module-level Settings pages across the system; own onboarding/offboarding accounts and permissions.

Later chapters (Security; ERP Best Practices & SOP; Internal Controls & Audit Readiness) describe the role/permission model, audit logging, and access-control lifecycle for the User Management module in depth once that module's source manual is available.
