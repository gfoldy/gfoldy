# Method Machining LLC — Website

Static one-page site for Method Machining, built for **Cloudflare Pages**. No build step, no framework.

```
method-machining/
├── public/            # everything that gets served
│   ├── index.html     # page content
│   ├── styles.css
│   ├── main.js        # mobile menu + quote form
│   ├── _headers       # security + cache headers (Cloudflare Pages)
│   └── img/           # logos, favicon, social share image
├── functions/api/quote.js   # Pages Function that emails quote requests
└── wrangler.toml
```

## Before you launch — edit these

In `public/index.html` (search for `EDIT`):

- Email, phone, hours, and location in the **Request a Quote** section
- The hero stats (`±0.0005"`, `1–1,000+`, `24–48 hr`) — make sure they match what you actually offer
- Capabilities and materials lists — add or remove to match your machines

## Preview locally

```bash
cd method-machining
npx wrangler pages dev
```

Open http://localhost:8788. (Or just open `public/index.html` in a browser; the form won't send without the function.)

## Deploy to Cloudflare Pages

### Option A — connect GitHub (auto-deploys on every push)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick the `gfoldy/gfoldy` repo and your production branch.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `public`
   - Root directory (advanced): `method-machining`
4. Save and deploy. You'll get a `method-machining.pages.dev` URL.

### Option B — deploy from your computer

```bash
cd method-machining
npx wrangler login
npx wrangler pages deploy
```

### Custom domain

Pages project → **Custom domains** → **Set up a custom domain** → enter e.g. `methodmachining.com`.
If the domain's DNS is already on Cloudflare (like your KMHS site), the records are added for you.

## Quote form email setup

The form posts to `/api/quote`, which sends an email through [Resend](https://resend.com) (free tier: 3,000 emails/month).

1. Create a Resend account and **verify your domain** (it gives you DNS records to add in Cloudflare).
2. Create an API key.
3. In the Pages project → **Settings** → **Variables and Secrets**, add:

| Name | Example | Type |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | Secret |
| `QUOTE_TO` | `info@methodmachining.com` | Text |
| `QUOTE_FROM` | `Method Machining Website <quotes@methodmachining.com>` | Text |

4. Redeploy. Replies to the notification email go straight to the customer.

Until this is set up, the form shows an error telling visitors to email you directly, so nothing gets silently lost.

**Spam:** the form has a hidden honeypot field. If spam becomes a problem, add Cloudflare Turnstile.
