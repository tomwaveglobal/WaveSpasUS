# Replicate WaveSpas USA setup on a new Shopify store

End-to-end runbook for setting up another Wave-brand Shopify store from scratch with the same Git workflow and theme customisations as `wavespasus.myshopify.com`. Designed to be followed top-to-bottom by a developer or AI agent.

**Source of truth:** the `tomwaveglobal/WaveSpasUS` repo. Every customisation below is documented in `docs/` and can be ported as-is to another Concept-themed store.

---

## Examples used in this doc

Throughout this runbook, replace these placeholders with your target store's values:

| Placeholder | Example (WaveSpas USA) | Your store |
|---|---|---|
| `<store-domain>` | `wavespasus.myshopify.com` | `<your-store>.myshopify.com` |
| `<repo-org>` | `tomwaveglobal` | the GitHub org/user the new repo lives under |
| `<repo-name>` | `WaveSpasUS` | e.g. `WaveGlobal`, `WaveSpasCA` |
| `<local-dir>` | `~/Documents/GitHub/WaveSpasUS` | `~/Documents/GitHub/<repo-name>` |
| `<live-theme-id>` | `153138823425` | from `shopify theme list` `[live]` row |

---

## What you'll set up

1. CLI environment (Shopify CLI, `gh`, git)
2. Local working directory + Git repo
3. Pull the live theme from Shopify
4. GitHub repo + `main` + `Development` branches
5. Shopify ↔ GitHub auto-sync connection (admin UI step — manual)
6. Apply the three customisations we shipped on USA: **badges**, **product Text block styling**, **Trustpilot logo**
7. Test on Development → ship to live

---

## Phase 1 — CLI environment

```bash
# Shopify CLI 3.x (3.93+ for `shopify store auth` / `shopify store execute`)
npm i -g @shopify/cli@latest
shopify version          # expect 3.x

# GitHub CLI
brew install gh
gh auth login            # browser flow; needs `repo`, `read:org`, `workflow`

# git
git --version            # any modern version (2.x)
```

Confirm with:

```bash
which shopify && shopify version
gh auth status
git --version
```

---

## Phase 2 — Pull the live theme

```bash
mkdir -p <local-dir> && cd <local-dir>
git init -b main

# First-time auth opens a browser tab. Log in with a staff/partner
# account that has access to <store-domain>.
shopify theme list --store=<store-domain>
# → note the [live] theme id, call it <live-theme-id>

shopify theme pull --store=<store-domain> --theme=<live-theme-id> --force
```

Sanity check it's the same Concept theme:

```bash
grep -E '"theme_name"|"theme_author"' config/settings_schema.json
# → "theme_name": "Concept",
# → "theme_author": "RoarTheme",
```

If it's **not** Concept, stop — the customisations in this doc assume Concept and won't apply cleanly.

---

## Phase 3 — Initial commit + `.gitignore`

```bash
cat > .gitignore <<'EOF'
.DS_Store
node_modules/
.shopify/
*.log
EOF

git add -A
git commit -m "Initial import from <store-domain> live theme"
```

---

## Phase 4 — Create the GitHub repo + push `main` + `Development`

```bash
# Private repo recommended for production themes
gh repo create <repo-org>/<repo-name> --private --source=. --remote=origin --push

# Branch model: main = production, Development = staging
git checkout -b Development
git push -u origin Development
git checkout main
```

After this you'll have on GitHub:
- `main` ← production-mirroring branch
- `Development` ← staging-mirroring branch

---

## Phase 5 — Connect Shopify ↔ GitHub (manual, admin UI)

**Claude cannot do this step.** It must be done in the Shopify admin:

1. Shopify admin → **Online Store** → **Themes** → **Add theme** → **Connect from GitHub**
2. Authorise the GitHub OAuth (granting access to `<repo-org>/<repo-name>`).
3. Pick the repo and branch `main`. Shopify creates a theme called `<repo-name>/main` that auto-syncs from `main`.
4. Repeat for `Development` → creates `<repo-name>/Development`.
5. **Publish** the `<repo-name>/main` theme so it replaces the existing live one.

Verify both connections via CLI:

```bash
shopify theme list --store=<store-domain>
# Expect to see:
#   <repo-name>/main         [live]
#   <repo-name>/Development  [unpublished]
```

From now on, every commit to `main` on GitHub auto-deploys to the live theme within ~30–60s. Likewise for `Development`. Theme-editor edits flow the other way — Shopify auto-commits settings_data.json back to the branch.

---

## Phase 6 — Apply the customisations

For each customisation, copy its source doc into the new repo, work through it on a feature branch off `Development`, then merge.

```bash
# Source docs live in this repo:
SRC=~/Documents/GitHub/WaveSpasUS/docs
DST=<local-dir>/docs
mkdir -p $DST
cp $SRC/usa-site-badge-implementation.md $DST/
cp $SRC/product-text-block-styling.md   $DST/
cp $SRC/trustpilot-logo-on-pdp.md       $DST/
```

### 6a. Badges + country labels + swatch overlay

- **Doc:** `docs/usa-site-badge-implementation.md`
- **Branch:** `feature/badge-labels`
- **Files touched:** `config/settings_schema.json`, `snippets/product-badges.liquid` (replaced), `snippets/product-card.liquid` (5 edits), `snippets/product-card-swatches.liquid` (NEW), `snippets/css-variables.liquid`, `snippets/header-nav-mega.liquid`
- **Plus on USA (not in the original doc):** also render the badge on the PDP hero by adding one line to `sections/main-product.liquid` inside `product__gallery-container`:
  ```liquid
  {%- render 'product-badges', product: product, class: 'z-2 absolute top-0 left-0 grid gap-3 m-3' -%}
  ```
  Place it just before the `render 'product-media-gallery'` call. See PR #2 on `tomwaveglobal/WaveSpasUS` for the exact diff.

Validate before pushing:

```bash
python3 -m json.tool config/settings_schema.json > /dev/null && echo SCHEMA VALID
```

### 6b. Product Text block styling

- **Doc:** `docs/product-text-block-styling.md`
- **Branch:** `feature/text-block-styling`
- **Files touched:** `sections/main-product.liquid` only — render block at `{%- when 'text' -%}` plus schema additions after the Text block's `text_size` select
- **Gotcha:** `sections/main-product.liquid` has two `when 'text'` matches. The merchant Text block is the one inside `case block.type` (typically the first match). The other is inside `case block.settings.type` for a line-item input — leave it alone.

### 6c. Trustpilot logo on PDP rating

- **Doc:** `docs/trustpilot-logo-on-pdp.md`
- **Branch:** `feature/trustpilot-logo`
- **Files touched:** `assets/theme.css` only — appended CSS rule
- **Per-store asset required:** upload a fresh Trustpilot logo PNG to the target store's Files. Don't hotlink another store's CDN URL. See **Phase 7** for the API-driven upload.

---

## Phase 7 — Per-store assets

### Upload the Trustpilot logo via Admin GraphQL

The CSS in 6c needs a logo on the target store's CDN. Easy three-step upload:

```bash
# 1) Download the source PNG to /tmp
curl -sL "https://cdn.shopify.com/s/files/1/0605/2911/5393/files/Trustpilot_logo_0246374a-44ef-45a8-acea-90b1a756e7e5_1.png" \
  -o /tmp/trustpilot_logo.png
FILESIZE=$(stat -f%z /tmp/trustpilot_logo.png)

# 2) Auth + stage upload
shopify store auth --store <store-domain> --scopes write_files
shopify store execute --store <store-domain> --allow-mutations \
  --query 'mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}' \
  --variables "{\"input\":[{\"resource\":\"FILE\",\"filename\":\"Trustpilot_logo.png\",\"mimeType\":\"image/png\",\"httpMethod\":\"POST\",\"fileSize\":\"$FILESIZE\"}]}"
# → copy the `url`, `resourceUrl`, and `parameters` from the response

# 3) POST the file to the staged target (build the `-F` args from the parameters)
curl -X POST "<staged-url>" \
  -F "Content-Type=image/png" \
  -F "key=<key-from-params>" \
  # ... other params from the staged target response ...
  -F "file=@/tmp/trustpilot_logo.png"
# → expect HTTP 201

# 4) Create the file in Shopify pointing at resourceUrl
shopify store execute --store <store-domain> --allow-mutations \
  --query 'mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id alt fileStatus ... on MediaImage{image{url width height}}} userErrors{field message code}}}' \
  --variables '{"files":[{"originalSource":"<resourceUrl>","alt":"Trustpilot","contentType":"IMAGE","filename":"Trustpilot_logo.png"}]}'
# → poll the returned id until fileStatus == READY, then read image.url
```

Drop the `image.url` into the CSS rule in `assets/theme.css`.

### Metafields the badge work depends on

`product.metafields.theme.label` (and optionally `theme.label_color`) ship with Concept. Confirm under Settings → Custom data → Products. If missing on the target store, define them:

- Namespace `theme`, key `label`, type `single line text`
- Namespace `theme`, key `label_color`, type `color`

Authoring examples (set per-product under Products → [product] → Metafields → Label):
- `Free Gift!` — universal
- `US:Free Shipping` — only US shoppers
- `US,CA:Free Shipping` — US + CA
- `US:NEW IN;GB:NEW IN;CA:Limited` — per-market

---

## Phase 8 — Develop, test, ship

For each feature branch:

```bash
# Branch off Development
git checkout Development && git pull
git checkout -b feature/<name>

# ... apply changes per doc ...

# Optional: live preview while editing
shopify theme dev --store=<store-domain>

# Validate any settings_schema.json edits
python3 -m json.tool config/settings_schema.json > /dev/null && echo VALID

# Push + PR → Development
git add -A
git commit -m "<descriptive message>"
git push -u origin feature/<name>
gh pr create --base Development --title "<title>" --body "..."

# Merge into Development → Shopify auto-syncs <repo-name>/Development within 30–60s
gh pr merge <pr-number> --merge
```

### Verifying sync without browser access

You can curl the Development theme as if a logged-in admin were previewing:

```bash
# Establish session cookie
rm -f /tmp/cookies.txt
curl -s -L -c /tmp/cookies.txt -A "Mozilla/5.0" \
  "https://<store-domain>/?preview_theme_id=<dev-theme-id>" -o /dev/null

# Fetch a real PDP and grep for the markup you added
curl -s -L -b /tmp/cookies.txt -A "Mozilla/5.0" \
  "https://<store-domain>/products/<handle>?preview_theme_id=<dev-theme-id>" \
  -o /tmp/preview.html
```

`<dev-theme-id>` is the id of `<repo-name>/Development` from `shopify theme list`.

### Ship to live

When happy on Development:

```bash
gh pr create --base main --head Development --title "Ship <feature> to live" --body "..."
# Merge via the GitHub UI when you're ready
```

The live theme (`<repo-name>/main`) auto-syncs within ~30–60s.

---

## Gotchas we hit while doing this on USA

- **JSONC, not JSON.** `config/settings_data.json` and `templates/*.json` ship with a JS-style `/* ... */` comment header. `python3 -m json.tool` rejects them. To validate, strip the header first (`tail -n +N`) or rely on Shopify's CLI/sync to surface errors.
- **Schema range step limit.** A `type: range` field disappears silently from the admin if `(max - min) / step + 1 > 101`. e.g. `min: 16, max: 400, step: 2` = 193 steps → rejected. All ranges in the source docs respect this.
- **Inline schema validation.** `sections/*.liquid` files have inline `{% schema %} ... {% endschema %}` blocks. Validate with:
  ```bash
  awk '/{% schema %}/{flag=1;next} /{% endschema %}/{flag=0} flag' \
    sections/<file>.liquid | python3 -m json.tool > /dev/null
  ```
- **`preview_theme_id=` needs a session cookie.** A plain `curl` without cookies will silently hit the *live* theme regardless of the query string. Always set a cookie jar first.
- **Two `when 'text'` matches in `main-product.liquid`.** One is the merchant Text block (`case block.type`); the other is a line-item input branch (`case block.settings.type`). Don't patch the wrong one.
- **Badge slot mismatch.** Each badge mapping needs `advanced_badge_map_N_text` **and** `advanced_badge_map_N_image` in the **same** numbered slot. Text in slot 2 + image in slot 1 → no match, no render.
- **Merge revert trap on GitHub-connected themes.** If you revert `main`, GitHub's "Update branch from main" button on an open Development → main PR will merge the revert into Development, silently undoing your work. Safe flow: changes on Development → PR to main → merge promptly. Don't revert main mid-flow.
- **Sale badges removed.** The new `product-badges.liquid` does NOT render the `saved_amount` sale pill. If you want sale badges back, merge them into the new file before deploying. On USA we accepted the trade-off.

---

## Phase 9 — Reference: what we shipped on USA today

In case you need to cherry-pick commits or follow the order of operations:

| PR | Description |
|---|---|
| #1 | Badges + Advanced Badges + country labels + swatch overlay (`feature/badge-labels` → `Development`) |
| #2 | PDP hero badge render (`feature/pdp-badges` → `Development`) |
| #3 | Ship #1 + #2 to live (`Development` → `main`) |
| #4 | Product Text block styling (`feature/text-block-styling` → `Development`) |
| #5 | Ship #4 to live (`Development` → `main`) |
| #6 | Trustpilot logo on PDP rating (`feature/trustpilot-logo` → `Development`) |
| #7 | Ship #6 to live (`Development` → `main`) |

All PRs are visible at https://github.com/tomwaveglobal/WaveSpasUS/pulls (closed tab).

---

## TL;DR — minimum-viable replication checklist

- [ ] CLI environment set up (Shopify CLI, gh, git)
- [ ] Theme pulled into `<local-dir>`, confirmed Concept
- [ ] `main` + `Development` branches pushed to `<repo-org>/<repo-name>`
- [ ] Shopify admin → connected `main` and `Development` to GitHub (manual UI step)
- [ ] `<repo-name>/main` published to live
- [ ] Three customisation docs copied into `docs/`
- [ ] Trustpilot logo uploaded to target store's Files
- [ ] Three feature branches merged into `Development`
- [ ] Verified on `<repo-name>/Development` preview
- [ ] `Development → main` PR merged to ship to live
