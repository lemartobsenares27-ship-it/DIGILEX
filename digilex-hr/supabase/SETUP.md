# Connecting DIGILEX HR to a real database (Supabase)

**Why:** right now every browser keeps its own private copy of the data. That
is why staff cannot sign in on their own phones — an employee you add on your
laptop does not exist on anyone else's device. Moving the data to Supabase
gives everyone one shared, live copy.

**Cost:** free tier, no credit card. It is far more than an 8–60 person team needs.

**Time:** about 10 minutes. You only do this once.

---

## Step 1 — Create the project

1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub or email.
2. Click **New project**.
   - **Name:** `digilex-hr`
   - **Database Password:** click *Generate*, then **save it in your password manager**. You will rarely need it, but it cannot be recovered.
   - **Region:** choose **Southeast Asia (Singapore)** — closest to the Philippines, so the app feels faster.
3. Click **Create new project** and wait ~2 minutes while it provisions.

---

## Step 2 — Create the tables

1. In the left sidebar click **SQL Editor** → **New query**.
2. Open the file `digilex-hr/supabase/schema.sql` from this repository, copy **everything** in it.
3. Paste it into the query box and click **Run** (or press Ctrl/Cmd + Enter).
4. You should see *Success. No rows returned*. That is correct — it creates tables, not rows.

> This also switches on the security rules that stop one employee from
> reading another's salary. Do not turn off "Row Level Security" later.

---

## Step 3 — Create your own login

1. Left sidebar → **Authentication** → **Users** → **Add user** → *Create new user*.
2. Enter **your email** and a password you choose. Tick *Auto Confirm User* if offered.
3. Click the new user in the list and copy the long **User UID**
   (looks like `3f9a1c2e-...`).

---

## Step 4 — Make yourself the admin

1. Go back to **SQL Editor** → **New query**.
2. Paste this, replacing the UID with the one you just copied:

```sql
insert into public.profiles (id, employee_id, role)
values ('PASTE-YOUR-USER-UID-HERE', 'DLX-001', 'admin');
```

3. Click **Run**.

This is what marks you as the owner. Everyone else defaults to `employee`,
so they only ever see their own attendance and payslip.

---

## Step 5 — Send me two values

Left sidebar → **Project Settings** (gear icon) → **API**. Send me:

| What | Looks like |
|---|---|
| **Project URL** | `https://abcdefghijk.supabase.co` |
| **anon public** key | a long string starting `eyJ...` |

Then I will connect the app, migrate your existing employees, and set up
staff logins.

### One important safety note

On that same page there is also a **`service_role`** key marked *secret*.

- The **anon public** key is safe to share with me and safe in the app — it is
  designed to sit in front-end code, and the rules from Step 2 are what
  actually protect your data.
- The **`service_role`** key bypasses every security rule. **Never** send it to
  me, never put it in the app, and never commit it. If it ever leaks, click
  *Reset* on it immediately.

---

## What changes for your staff afterwards

- They sign in on their **own phone** with their name and password, and it works.
- Their clock-in appears on **your** dashboard within seconds.
- They still only see their own attendance, payslip and leave — enforced by the
  database now, not just hidden in the screen, so it can no longer be bypassed
  with browser developer tools.
