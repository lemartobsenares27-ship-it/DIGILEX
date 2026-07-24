# LHIKE ERP (application)

A real, running clone of LHIKE ERP's foundation: a Node/Express/Prisma backend
with genuine multi-user accounts, roles, and authentication, and a React
frontend implementing the Dashboard and User Management modules exactly as
specified in [`docs/manual/`](../docs/manual) (built from the official LHIKE
ERP user manuals).

This is a **foundation-first** build, not a full clone yet:

| Module | Status |
|---|---|
| User Management (accounts, roles/permissions, onboarding, company logo) | ✅ Built |
| Dashboard (Sales Warehouse Logistics + Finance) | ✅ Built (placeholder/zeroed figures — see below) |
| E-commerce, Pancake Integration, Board, Finance (deep), Logistics & Inventory, HR | 📄 Fully documented in `docs/manual/`, not yet built here |

Every unbuilt module still appears in the sidebar (marked "soon") so the
app's full shape is visible, and clicking one shows a "Coming soon" page
that points back to its documentation chapter.

**Why the Dashboard shows zeros:** its real figures (parcel counts, revenue)
are computed from the Logistics & Inventory and Finance transactional
modules, which haven't been built yet. The dashboard endpoints return the
documented shape with placeholder zero values rather than fabricated data,
and say so on-screen.

## Architecture

- **`server/`** — Express + TypeScript + Prisma ORM + SQLite (swap to
  Postgres for production — see `server/prisma/schema.prisma`), JWT auth in
  an httpOnly cookie, bcrypt password hashing.
- **`client/`** — React + TypeScript + Vite + Tailwind CSS, React Router.

Why a real backend instead of the browser-only approach used by the
existing Digilex app: LHIKE ERP's User Management module has genuine
multi-user accounts, a fine-grained permission matrix, and approval
workflows (Reimbursement, Utility Expense, Purchase Orders) where one
person's action must be visible to another in real time — none of that is
representable with per-browser local storage.

## Permission model

`server/src/permissions.ts` defines the canonical permission tree mirroring
Module 9's Change Role checkbox matrix — one leaf permission per checkbox
documented in the manual, across every module (including ones not yet
built, so the role-assignment screen is complete even before those modules
ship). A user's granted permissions are stored as a JSON array on their
record; **Mother Account** is a separate boolean that bypasses all
permission checks, matching the documented super-admin behavior.

## Running locally

### Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev   # creates prisma/dev.db and seeds an admin account
npm run dev              # http://localhost:4000
```

Seeded login: **username `admin`, password `ChangeMe123!`** (a Mother
Account — change this password immediately in any real deployment).

### Frontend

```bash
cd client
npm install
npm run dev               # http://localhost:5173, proxies /api to :4000
```

### Onboarding a second user (matches Module 9's documented flow exactly)

1. Sign in as `admin`, go to **User Management > + Add User**, fill in an
   Employee No. and name, **Save**. The account exists but cannot log in yet.
2. Sign out. On the login page, click **Request Access** and have the
   "employee" set their own username/password using that Employee No.
3. Sign back in as `admin`, find the new username in User Management, and
   click **Disabled** to enable it, then **Change Role** to grant permissions.
4. The new user can now sign in with the username/password they chose in
   step 2 and will see only the sidebar sections their role grants.

## What's next

Building out one module at a time, in the same foundation-first order used
here: pick the next module from `docs/manual/`, add its Prisma models,
Express routes, and React pages, following the same pattern as Dashboard
and User Management above.
