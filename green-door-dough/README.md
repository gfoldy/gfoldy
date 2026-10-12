# Green Door Dough 🚪🍞

Preorder website for Green Door Dough. Customers scan a QR code, choose bread, pick
a Saturday, and pay by card / Apple Pay / Google Pay through **Stripe**. Every
order lands in your Stripe dashboard, and the **bake sheet** page shows exactly
what to bake each Saturday.

| Page | What it's for |
| --- | --- |
| `/` | The shop: menu, cart, pickup day, checkout |
| `/success.html` | "You're on the bake list!" page after paying |
| `/orders.html` | **Your** bake sheet: totals to bake and each customer's order (password protected) |
| `/sign.html` | Printable QR-code sign for the stand |

## Changing the menu, prices, pickup spot, or cutoff

Everything lives in **`shop.js`**:

- `SHOP.pickup.location` / `window`: where and when people pick up
- `SHOP.cutoff`: when orders close for that Saturday (default **Thursday 8 PM**)
- `SHOP.timezone`: set this to your time zone so the cutoff is correct
- `SHOP.closedDates`: Saturdays you're not baking, e.g. `['2026-11-28']`
- `MENU`: items and prices (**in cents**: `1200` = $12). Add `soldOut: true` to grey something out.
- `SHOP.contact`: your email + Instagram handle

Commit and push the change, and the site updates in about 30 seconds.

## One-time setup (about 20 minutes)

### 1. Create a Stripe account
1. Sign up at <https://dashboard.stripe.com/register>.
2. While you're testing, leave **Test mode** on (toggle in the top right).
3. Go to **Developers → API keys** and copy the **Secret key** (`sk_test_…`).

Stripe charges about 2.9% + 30¢ per card payment. There are no monthly fees.

### 2. Put the site on Vercel
1. Go to <https://vercel.com/new> and import the `gfoldy/gfoldy` GitHub repo.
2. Set **Root Directory** to `green-door-dough`. Framework preset: **Other**.
3. Under **Environment Variables**, add:
   - `STRIPE_SECRET_KEY`: the key from step 1
   - `ADMIN_PASSWORD`: any password you pick for the bake sheet
   - `SITE_URL`: your site's address, e.g. `https://greendoordough.com` (optional, but set it once you have a domain)
4. Click **Deploy**.

> GitHub Pages can show the site but **can't take payments**, because the
> checkout needs a small server. That's why it runs on Vercel.

### 3. Test an order
On your live site, order something and pay with Stripe's test card
`4242 4242 4242 4242` (any future expiry date, any CVC). Then open
`/orders.html`, enter your `ADMIN_PASSWORD`, and the order should appear under
that Saturday.

### 4. Go live
1. In Stripe, finish **Activate account** (business info + bank account for payouts).
2. Switch off Test mode, copy the **live** secret key (`sk_live_…`), and replace
   `STRIPE_SECRET_KEY` in Vercel (**Settings → Environment Variables**). Then **redeploy**.
3. Optional: buy a domain (e.g. `greendoordough.com`) under Vercel → **Domains**.

### 5. Print your QR sign
Open `/sign.html` on your **live** site. Check that the address under the QR
code is your real URL, then click **Print** (or download the QR as an SVG for
stickers and flyers). Test-scan it with your phone before you print a stack.

## Your Saturday routine
- **Thursday night** (after the cutoff): open `/orders.html` → **What to bake** has your totals.
- **Saturday**: print the bake sheet and tick off each name as people pick up.
- Refunds and customer receipts are handled in the Stripe dashboard → **Payments**.

## Running it locally
```bash
npm install
npx vercel dev   # serves the site + API at http://localhost:3000
npm test         # checks the cutoff logic and order validation
```
