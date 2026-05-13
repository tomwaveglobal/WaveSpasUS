# Trustpilot logo on the product page rating snippet

Small, CSS-only customisation that appends a Trustpilot logo image **after** the existing rating element on the product detail page (PDP). Designed so the rating block visually reads as "★★★★★ X Reviews · [Trustpilot]" without touching any Liquid or app embed.

The rating element itself is rendered by the **Reviews.io** Shopify app (custom element `<reviewsio-product-ratings>`), which is injected at runtime. The CSS rule targets that injected element and adds the logo via a `::after` pseudo-element, so no app changes are needed.

---

## What it does

| Without | With |
|---|---|
| `★★★★★ 1,247 Reviews` | `★★★★★ 1,247 Reviews   [Trustpilot]` |

The Trustpilot wordmark sits on the same baseline as the star rating, with a small left margin. It's purely decorative (not a clickable link) — the existing rating element keeps whatever click/href behaviour the app supplies.

---

## Prerequisites

1. **The Reviews.io Shopify app is installed and emitting `<reviewsio-product-ratings>` on the PDP.** This is the element the CSS hooks onto. Confirm in the rendered DOM:
   - View source on a product page → search for `reviewsio-product-ratings`.
   - If the app uses a different tag (`<rio-product-ratings>`, `<div class="reviews-io-rating">`, etc.) — change the selector in the CSS below to match.

2. **A hosted Trustpilot logo image.** This theme uses a PNG uploaded to Shopify Files:
   ```
   https://cdn.shopify.com/s/files/1/0058/2284/0889/files/Trustpilot_logo_0246374a-44ef-45a8-acea-90b1a756e7e5_1.png?v=1776265646
   ```
   For another store, **upload a fresh copy** to that store's Files (Settings → Files → Upload) — don't hotlink the WaveSpas CDN URL across stores. Copy the new URL into the CSS.

3. **Concept theme with `assets/theme.css`.** This guide assumes the CSS sits in a global stylesheet that's loaded on every PDP. If the theme bundles CSS through a build step, add the rule to the equivalent source file.

---

## Files touched

- `assets/theme.css` — append one CSS block (no schema, no Liquid, no app config).

That's it. No section, snippet, template, or settings_schema changes.

---

## The CSS

Append this block at the end of `assets/theme.css`:

```css
/* Trustpilot logo appended after the product page rating snippet ("X Reviews") */
reviewsio-product-ratings {
  display: inline-flex;
  align-items: center;
}

reviewsio-product-ratings::after {
  content: '';
  display: inline-block;
  margin-inline-start: var(--sp-3);
  width: 75px;
  height: 19px;
  background-image: url('https://cdn.shopify.com/s/files/1/0058/2284/0889/files/Trustpilot_logo_0246374a-44ef-45a8-acea-90b1a756e7e5_1.png?v=1776265646');
  background-repeat: no-repeat;
  background-position: left center;
  background-size: contain;
  flex-shrink: 0;
  transform: translateY(-1px);
}
```

### What each rule does

| Rule | Why |
|---|---|
| `reviewsio-product-ratings { display: inline-flex; align-items: center; }` | Forces the host element into a flex container so the star + label + logo all share a baseline. Without this, the `::after` would render as a block child of an inline-by-default element and the logo would drop to the next line. |
| `content: ''` | Required for `::after` to render. Empty because we paint the image via `background-image`, not an inline `<img>`. |
| `margin-inline-start: var(--sp-3)` | Logical-direction margin (works for RTL too) so the logo sits ~12px to the right of "X Reviews" in LTR locales. |
| `width: 75px; height: 19px` | Locked dimensions matching the source PNG's aspect ratio. Adjust if you upload a differently-sized asset. |
| `background-size: contain` | Scales the PNG inside the 75×19 box without cropping; preserves aspect ratio. |
| `flex-shrink: 0` | Prevents the logo from getting squeezed if the parent runs out of horizontal space (e.g. narrow PDP layouts on mobile). |
| `transform: translateY(-1px)` | Optical alignment — the Trustpilot wordmark visually centres ~1px higher than the surrounding text. Tweak (or remove) once you've eyeballed it on the target theme. |

---

## Variables used

This snippet uses two Concept theme custom properties:

- `--sp-3` — the 12px spacing token. Falls back gracefully to no margin if the theme doesn't expose it. If you want a hard fallback, change to `margin-inline-start: 12px`.

If the target theme doesn't use the `--sp-*` token system, swap `var(--sp-3)` for a literal `12px` value.

---

## Replication on another store

For each new store running the same Reviews.io + Concept setup:

1. **Upload the Trustpilot logo PNG** to that store's Files. (Admin → Settings → Files → Upload files.) Note the resulting `cdn.shopify.com/...` URL.

2. **Open `assets/theme.css`** in your dev workflow and append the block from this doc, **replacing the `background-image: url(...)` value** with the new file's URL.

3. **Verify the host element**: open a PDP, inspect, confirm `<reviewsio-product-ratings>` exists. If the element name differs, update the two selectors in the CSS.

4. **Save and reload the PDP.** The logo should appear immediately to the right of the rating snippet. No theme republish required if you're using Shopify CLI dev mode — the CSS will hot-reload.

---

## Testing checklist

- [ ] PDP rating row shows: `★★★★★ X Reviews   [Trustpilot]` on desktop
- [ ] Same layout holds on mobile (≤ 768px) without the logo wrapping below the text or being clipped
- [ ] Logo doesn't appear on pages that don't render `<reviewsio-product-ratings>` (collection cards, search, account pages, etc.) — the selector is scoped to the element, so this should be automatic
- [ ] In RTL locales (if applicable): logo sits on the **left** of the rating text (the `margin-inline-start` handles direction automatically)
- [ ] No console warnings or 404s for the image asset
- [ ] Logo crispness: at 2x DPR (Retina) the 75×19 box should still look sharp because the source PNG is hosted at higher resolution and downscaled with `contain`

---

## Common gotchas

- **Logo doesn't appear at all** → The `<reviewsio-product-ratings>` element isn't on the page. Check that the Reviews.io app is installed, the product has reviews, and the app's "Show ratings on product pages" toggle is on. The CSS only acts when the element exists.

- **Logo appears on every page** (not just PDP) → That means the rating element is being rendered elsewhere too (sometimes Reviews.io injects it on collection pages or quick-view modals). If you want to scope strictly to PDP, change the selector to `.template-product reviewsio-product-ratings` (Concept adds a `template-product` class to `<body>` on PDP) or wrap the rule in a `.product__rating` ancestor if the theme uses one.

- **Logo overlaps the text on narrow viewports** → Reduce `width: 75px` to `60px` and `height: 19px` proportionally (~`15px`), or use `display: flex; flex-wrap: wrap` on the host so it drops cleanly to a new line on overflow.

- **CSS not applied after dev push** → `assets/theme.css` is cached aggressively by browsers + Shopify's CDN. Hard-reload (Cmd+Shift+R) or bump the asset query string. In dev mode (`shopify theme dev`), this is automatic.

- **Image is fuzzy on Retina** → Make sure the uploaded PNG is at least 2x the displayed size (150×38 source for 75×19 display). The CSS doesn't change; the source asset does.

---

## Source — original commit on WaveSpas (UK)

The original rule lives in [`assets/theme.css`](../assets/theme.css) around line 10897. Search the file for the comment `/* Trustpilot logo appended after the product page rating snippet ("X Reviews") */` to find it.
