# TESTOMAXX Landing Page

A standalone, static conversion landing page for TESTOMAXX — separate from the
Digilex Financial Control Center app in the rest of this repo. Plain HTML/CSS/JS,
no build step, no dependencies.

## Files

- `index.html` — all page content/copy
- `styles.css` — all styling (dark navy/gold/red theme matching the existing ad creative)
- `script.js` — mobile nav, FAQ accordion, sticky mobile CTA bar, order form submit
- `netlify.toml` — deploy config if hosted on Netlify

## Before you launch ads, replace these placeholders

Search `index.html` for:

- **`₱[PRICE]`** and **`[X]%`** in the pricing cards — put in your real per-bottle
  and bundle pricing/discounts.
- **Sample Customer reviews** (`id="reviews"` section) — these are placeholder
  quotes so the page isn't empty. Swap in real, verified customer reviews before
  running paid traffic to this page — using fabricated testimonials in ads is
  against Meta's ad policies and is misleading to customers.
- **FAQ answers** with bracketed text like `[X-X business days]` — fill in your
  actual delivery times, COD coverage areas, and return/refund policy.
- The Facebook link in the header/footer/order form already points to
  `https://www.facebook.com/profile.php?id=61566782627194` — update it if that changes.

## The order form

The COD order form (`#order` section) is wired for **Netlify Forms** —
`data-netlify="true"` plus a honeypot field for spam. If you deploy this on
Netlify, submissions show up automatically in Site settings → Forms, and you
can turn on email notifications there. No backend/server code needed.

If you host elsewhere (not Netlify), the form will need a different endpoint —
either swap in a form backend (Formspree, Google Forms, a simple serverless
function) or point `fetch('/', ...)` in `script.js` at your own endpoint.

## Deploying

**Option A — Netlify (recommended, matches the rest of this repo's hosting):**
1. In the Netlify dashboard, "Add new site" → "Import an existing project" → pick this GitHub repo.
2. Set **Base directory** to `site`, **Publish directory** to `site` (or `.` relative to that base), leave build command empty.
3. Deploy. Netlify Forms will pick up the order form automatically.
4. Point your Facebook ad's website URL at the resulting `*.netlify.app` domain (or attach a custom domain in Netlify's Domain settings).

**Option B — any static host** (Vercel, GitHub Pages, S3, etc.): upload the
contents of this `site/` folder as-is. You'll need to replace the Netlify Forms
wiring with an alternative form backend (see above).

## Local preview

```
cd site
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
