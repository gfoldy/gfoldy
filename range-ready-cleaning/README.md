# Range Ready Cleaning — Website

A fast, static one-page site for **Range Ready Cleaning** — professional firearm
cleaning serving Southeast Wisconsin. Built to match the brand flyer: dark
tactical theme, silver/green palette, crosshair "RR" logo.

*Clean gear. Reliable performance.*

## Files

| File | Purpose |
|------|---------|
| `index.html` | The full site (hero, why-us, services, pricing, contact). |
| `styles.css` | All styling and responsive layout. |
| `script.js` | Mobile nav + booking form handling. |
| `assets/logo.svg` / `favicon.svg` | Vector RR crosshair logo. |
| `assets/flyer.png` | Original flyer (used as the social/share image). |
| `_headers` | Cloudflare Pages security + caching headers. |

No build step, no dependencies — just static files.

## Deploy to Cloudflare Pages

### Option A — Connect this Git repo (recommended)
1. Push this branch to GitHub (already done for you).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Select this repository and branch.
4. Build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave blank)*
   - **Build output directory:** `range-ready-cleaning`
5. Save & deploy. Every push auto-deploys.

### Option B — Direct upload (Wrangler CLI)
```bash
cd range-ready-cleaning
npx wrangler pages deploy . --project-name range-ready-cleaning
```

### Custom domain (rangereadycleaning.com)
In your Pages project → **Custom domains → Set up a domain** → enter
`rangereadycleaning.com`. Cloudflare adds the DNS records automatically if the
domain is on your account.

## Before you go live — quick checklist

1. **Booking form endpoint.** In `index.html`, the form `action` is a
   placeholder (`https://formspree.io/f/your-form-id`). Until you set a real
   endpoint, the form falls back to opening the visitor's email app addressed to
   `info@rangereadycleaning.com`. To collect submissions online instead, create a
   free form endpoint (e.g. [Formspree](https://formspree.io) or
   [Web3Forms](https://web3forms.com)) and paste the URL into the `action`.
2. **Email address.** Update `info@rangereadycleaning.com` in `index.html` and
   `script.js` if you use a different address.
3. **Facebook link.** Replace the placeholder Facebook URL in `index.html`
   (`contact` section) with your real page URL.
4. **Pricing.** The pricing cards say "Contact" — swap in real numbers whenever
   you're ready.
