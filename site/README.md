# TESTOMAXX Landing Page

A standalone, static conversion landing page for TESTOMAXX — separate from the
Digilex Financial Control Center app in the rest of this repo. Plain HTML/CSS/JS,
no build step, no dependencies.

## Files

- `index.html` — all page content/copy
- `styles.css` — all styling (dark navy/gold/red theme matching the existing ad creative)
- `script.js` — mobile nav, FAQ accordion, sticky mobile CTA bar, order form submit
- `netlify.toml` — deploy config if hosted on Netlify

## Content status

Pricing, dosage, and delivery details were filled in from real order
confirmations/Messenger scripts (not placeholders):

- **Pricing: ₱399 / ₱599 / ₱799 for 1 / 2 / 3 bottles**, free shipping on 2+.
  Note: some ad creative shown to me had 2 bottles at ₱549, but actual COD
  checkouts in the chat log were invoiced at ₱599 (a customer flagged the
  mismatch). I used ₱599 as the source of truth since it's what's actually
  charged — **reconcile your ad creative to match whatever price is on this
  page**, or ads and landing page will visibly contradict each other.
- **Dosage / "Paano Gamitin" section**: 2 capsules/day (1 AM, 1 PM, both
  ~30 min before meals), plenty of water, no alcohol, 1–2 hr gap from other
  maintenance meds — taken from the real usage instructions you sent.
- **Delivery**: J&T Express, Luzon 1–3 days / Visayas 4–6 / Mindanao 7–8,
  discreet packaging, no advance payment (COD only).

**Deliberately left out** (from your Messenger ad scripts, but not put on the
page): "FDA Approved" / FDA registration claims, "safe for diabetes / high
blood / prostate enlargement" claims, and explicit sexual-performance
language. Philippine FDA rules bar food supplements from claiming to treat or
prevent disease, and Meta will reject or ban ad accounts over unsubstantiated
health claims or explicit sexual content — both would put your ad account and
product registration at risk. The page keeps the "supports vitality /
stamina / testosterone" framing instead.

## Still placeholder — fill in before launching ads

Search `index.html` for:

- **Sample Customer reviews** (`id="reviews"` section) — swap in real,
  verified customer reviews before running paid traffic; fabricated
  testimonials violate Meta's ad policies.
- **FAQ**: the return/refund policy `[Ilagay dito ang iyong return/refund
  policy.]`, and the COD-coverage-exclusions bracket if any provinces are
  excluded.
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
