# Garrett Foldy — Personal Training Website

A fast, mobile-friendly one-page website for online personal training and
custom workout plans — built to convert visitors coming from Instagram into
coaching clients. Positioned around everyday health, strength and fitness
(not competitive bodybuilding).

## Live site

This repo deploys automatically to **GitHub Pages** via the workflow in
`.github/workflows/static.yml` whenever changes land on the `main` branch.
The published URL appears under **Settings → Pages** once deployed
(typically `https://<username>.github.io/<repo>/`).

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content and structure |
| `styles.css` | Bold, energetic dark theme |
| `script.js`  | Mobile menu, scroll animations, footer year |

## Make it yours (quick edits)

Everything below can be edited directly in `index.html` — no build step, no
dependencies.

1. **Instagram handle** — search `index.html` (and the footer/CTA) for
   `garrettfoldy` and replace every occurrence with your real handle. All
   the "Message me" buttons point to `https://instagram.com/<handle>`.
2. **Photos** — the hero and about sections use styled placeholders. Add your
   images to the repo and replace the placeholder `<div>`s with
   `<img src="your-photo.jpg" alt="...">` (marked with HTML comments in the file).
3. **Copy** — update the headline, about story, services and FAQ text to match
   your voice and offer.
4. **Testimonials** — swap the sample quotes in the *Results* section for real
   client reviews as you collect them.
5. **Colors** — tweak the palette at the top of `styles.css` (the
   `--accent` / `--accent-2` variables control the accent colors).

## Preview locally

Just open `index.html` in a browser, or run a simple static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
