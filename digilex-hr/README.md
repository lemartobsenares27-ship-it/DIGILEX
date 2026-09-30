# DIGILEX HR ERP

A self-contained internal HR system for DIGILEX (DTC e-commerce, Philippines) — employee
records, attendance, semi-monthly payroll with Philippine government deductions, leave
management, performance scorecards, recruitment pipeline, and a company document library.

No build step, no server, no npm install. It's a set of static HTML pages backed by
vanilla JavaScript and `localStorage`, styled with Tailwind (CDN) and Font Awesome (CDN),
with Chart.js for the dashboard charts.

## Opening the app

Double-click `digilex-hr/login.html` (or open it via File → Open in Chrome). You'll land
on the sign-in screen first — see **Logging in** below. All data is seeded automatically
on first load and persisted to `localStorage` from then on, so your edits survive a page
refresh or browser restart (they live only in that browser profile).

## Logging in

Every employee gets their own account (Employee ID as username), so the system knows who's
logging attendance. Two roles:

- **Admin** (Lee, `DLX-001`) — signs in and lands on the full Dashboard/sidebar app: every
  module described below.
- **Employee** (everyone else) — signs in and lands on a lightweight **My Attendance**
  portal (`pages/portal.html`): their own profile, a Time In / Time Out clock, this
  month's attendance stats, and their attendance history. They cannot reach the admin
  pages — trying to open `index.html` or any `pages/*.html` directly redirects them back
  to their portal.

Default password for every seeded account is **`digilex123`**. From an employee's profile
in **Employees → [name] → Reset Password**, an admin can reset that employee's password
back to the default at any time (shown once in a toast so it can be relayed to them).
New employees (added manually or converted from a job applicant in Recruitment) get a
login account automatically with the same default password.

This is a client-side demo login (accounts and passwords live in `localStorage`, not a
real backend) — good enough to gate who can log attendance in an internal tool, not a
substitute for real authentication if this were ever put on a public server.

> The app is built as a classic multi-page site (each module is its own `.html` file)
> rather than a single-page app. This is intentional: browsers block `fetch()` between
> local `file://` pages, so an SPA router would silently fail when opened without a
> server. Every page shares the same `js/app.js` (data store + sidebar/header) and
> `js/data.js` (seed data + PH government tables).

## Folder structure

```
digilex-hr/
├── login.html           Sign-in screen (entry point)
├── index.html            Admin Dashboard (KPIs, charts, activity feed, announcements)
├── css/styles.css         Design system on top of Tailwind
├── js/
│   ├── data.js              Seed data + SSS/PhilHealth/Pag-IBIG/TRAIN tax tables
│   ├── auth.js               Login accounts, sessions, role guards
│   ├── app.js                 Shared store, sidebar/header, toasts, modals, utilities
│   ├── dashboard.js            index.html logic
│   ├── employees.js            Employee directory
│   ├── attendance.js           Attendance matrix + logging (admin)
│   ├── payroll.js               Payroll runs + payslips
│   ├── leave.js                  Leave requests, balances, calendar
│   ├── performance.js            Scorecards + history
│   ├── recruitment.js            Kanban applicant tracker
│   ├── documents.js               Document library
│   ├── settings.js                 Company settings
│   └── portal.js                    Employee self-service (time in/out)
└── pages/                  employees.html, attendance.html, payroll.html, leave.html,
                              performance.html, recruitment.html, documents.html, settings.html,
                              portal.html (employee self-service)
```

## Adding an employee

Go to **Employees** → **Add Employee** (or use the Dashboard's quick-action button), fill
in the form (name, position, department are required), and save. The employee ID
(`DLX-00N`) is generated automatically. Daily and hourly rates are derived from the
monthly salary (÷26 and ÷8) wherever they're shown.

## Running payroll

1. Go to **Payroll**, pick the month, year, and period (1st–15th or 16th–end of month).
2. Days worked are pulled automatically from the Attendance module for that date range.
   Add overtime hours/rate, holiday pay, or allowances per employee as needed — the row
   recalculates live.
3. Deductions (SSS, PhilHealth, Pag-IBIG, withholding tax) are computed automatically
   using the 2025 Philippine contribution tables in `js/data.js`.
4. Click the payslip icon on any row to open a print-ready payslip, then **Print /
   Download as PDF** (uses the browser's print dialog — choose "Save as PDF").
5. Click **Process Payroll** to lock the period. Locked periods can no longer be edited;
   change the period selector to review a different cutoff.

## Resetting demo data

Go to **Settings** → **Reset to Demo Data**. This clears everything in `localStorage` for
this app and reseeds the original 8 DIGILEX employees, attendance history, leave
requests, performance scorecards, recruitment pipeline, and documents.

## Notes on the Philippine payroll figures

- **SSS**: 4.5% employee share of the Monthly Salary Credit, per the 2025 contribution
  schedule (₱135–₱1,350/month), split evenly across the two cutoffs.
- **PhilHealth**: 5% of monthly basic salary, employee pays half (2.5%), capped at
  ₱2,500/month, split evenly across the two cutoffs.
- **Pag-IBIG**: flat ₱100/month employee share (₱50 per cutoff).
- **Withholding tax**: BIR's TRAIN Law semi-monthly graduated table, applied to
  (gross pay − SSS − PhilHealth − Pag-IBIG) for that cutoff.

These are reference calculations for an internal tool, not a substitute for official BIR/
SSS/PhilHealth/Pag-IBIG filings.
