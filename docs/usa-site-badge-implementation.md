# Product label + badge implementation — for the USA site

End-to-end guide for replicating the WaveSpas product-label work on the **WaveSpas USA site** (or any sister site running the RoarTheme "Concept" theme). Drop this file into the target repo's `docs/` folder and follow it top-to-bottom.

Covers:
1. Basic badge styling (text size, text colour, background colour)
2. Responsive text-size split (mobile + desktop)
3. **Advanced Badges** — text-to-image mappings, 10 slots, per-slot text overlay toggle
4. Per-page visibility modes (Product / Collection / Home / Search / Navigation)
5. **Country-targeted labels** — the `US:LABEL;GB:OTHER` metafield syntax
6. Overlay swatches on the product image (collection cards)

---

## Compatibility check

Target must be RoarTheme **Concept** (5.x). Confirm in the target repo's `config/settings_schema.json`:

```json
{
  "name": "theme_info",
  "theme_name": "Concept",
  "theme_author": "RoarTheme",
  ...
}
```

If `theme_name` matches, this guide applies as-is.

---

## Files touched

| File | What gets changed |
|---|---|
| `config/settings_schema.json` | New settings in Product tiles → Badges + Color swatches |
| `snippets/product-badges.liquid` | Replaced — mode-based rendering + country rules |
| `snippets/product-card.liquid` | `badge_context` pass-through + extracted swatch logic + overlay rendering location |
| `snippets/product-card-swatches.liquid` | **NEW** — extracted swatch logic |
| `snippets/css-variables.liquid` | Responsive font-size, badge-image widths, `.badge-on-image` overlay, `.swatches-overlay` positioning |
| `snippets/header-nav-mega.liquid` | Passes `badge_context: 'nav'` so the mega menu uses its own visibility mode |

No template, section, or theme.css edits required.

---

## ⚠️ Two Shopify gotchas

### 1. Range `step` limit (101 max)
`type: range` fields silently disappear from the admin if `(max - min) / step + 1 > 101`. e.g. `min: 16, max: 400, step: 2` = 193 steps → rejected. All ranges in this guide respect the limit.

### 2. Merge-revert trap on GitHub-connected themes
If you revert main, GitHub's "Update branch from main" button on a Development → main PR will merge the revert *into* Development, silently undoing your additions before they reach main. Safe workflow: changes on Development → PR to main → merge straight away. Avoid reverting main mid-flow.

---

## How country-targeted labels work (the "GB:" / "US:" syntax)

The label rendered for a product comes from the **`product.metafields.theme.label`** metafield (existing in Concept). The value is a `;`-separated list of entries. Each entry is either:

- **Plain text** — shown to every shopper:
  `Free Gift!`
- **Country-prefixed** — shown only when the shopper's localised country matches:
  `US:Free Shipping`
- **Multi-country prefix** — comma-separated ISO codes:
  `US,CA:Free Shipping`
- **Mixed list** — multiple entries separated by `;`:
  `US:Free Shipping;GB:NEW IN;CA:Limited Stock`

The country is detected per-request via `localization.country.iso_code` (already exposed in Liquid). On a USA-only store with no Markets/localisation enabled it returns `US`, so unprefixed entries and `US:` entries both render. If you later enable Shopify Markets, the same logic adapts automatically — `CA` shoppers see `CA:` entries, etc.

The colon-split is robust to colons *inside* the label (e.g. `US:Mention us: 5% off`) because the snippet uses `slice` on the post-prefix portion and rejoins with `:`. The country list is upper-cased before comparison, so `us:` and `US:` both work.

---

## 1. `config/settings_schema.json`

### 1a. Badges sub-section (inside Product tiles)

Find the existing **Product tiles** section (search for `t:settings_schema.products.name`). Locate the **Badges** sub-area — it contains `product_vertical_badges`, `product_sold_out`, `product_save_amount`, `product_save_type`.

**Insert after the `product_save_type` select and before the next header (`header__icon_list`):**

```json
{
  "type": "range",
  "id": "product_badge_text_size",
  "min": 8,
  "max": 24,
  "step": 1,
  "unit": "px",
  "default": 12,
  "label": "Badge text size (mobile)",
  "info": "Font size of product badges like \"Free Gift!\" on screens under 768px"
},
{
  "type": "range",
  "id": "product_badge_text_size_desktop",
  "min": 8,
  "max": 40,
  "step": 1,
  "unit": "px",
  "default": 16,
  "label": "Badge text size (desktop)",
  "info": "Font size from 768px and up"
},
{
  "type": "color",
  "id": "product_badge_text_color",
  "label": "Badge text color",
  "default": "#ffffff"
},
{
  "type": "color",
  "id": "product_badge_bg_color",
  "label": "Badge background color",
  "info": "Used as the default when a product doesn't set its own label color metafield",
  "default": "#f5a623"
},
{
  "type": "header",
  "content": "Advanced Badges"
},
{
  "type": "paragraph",
  "content": "Map product badge text (e.g. \"Free Gift!\") to an uploaded image. When a product's badge text matches a mapping, the image replaces the styled text pill. Country rules from the badge text (e.g. US:NEW IN) still apply."
},
{
  "type": "header",
  "content": "Visibility — choose what each page type shows"
},
{
  "type": "select",
  "id": "advanced_badge_mode_product",
  "label": "Product pages",
  "options": [
    { "value": "hidden", "label": "Hidden" },
    { "value": "text",   "label": "Text only" },
    { "value": "image",  "label": "Image only" },
    { "value": "both",   "label": "Image + text" }
  ],
  "default": "hidden"
},
{
  "type": "select",
  "id": "advanced_badge_mode_collection",
  "label": "Collection pages",
  "options": [
    { "value": "hidden", "label": "Hidden" },
    { "value": "text",   "label": "Text only" },
    { "value": "image",  "label": "Image only" },
    { "value": "both",   "label": "Image + text" }
  ],
  "default": "hidden"
},
{
  "type": "select",
  "id": "advanced_badge_mode_home",
  "label": "Home page",
  "options": [
    { "value": "hidden", "label": "Hidden" },
    { "value": "text",   "label": "Text only" },
    { "value": "image",  "label": "Image only" },
    { "value": "both",   "label": "Image + text" }
  ],
  "default": "hidden"
},
{
  "type": "select",
  "id": "advanced_badge_mode_search",
  "label": "Search results",
  "options": [
    { "value": "hidden", "label": "Hidden" },
    { "value": "text",   "label": "Text only" },
    { "value": "image",  "label": "Image only" },
    { "value": "both",   "label": "Image + text" }
  ],
  "default": "hidden"
},
{
  "type": "select",
  "id": "advanced_badge_mode_nav",
  "label": "Top navigation menu",
  "info": "Product cards inside the header mega-menu dropdown.",
  "options": [
    { "value": "hidden", "label": "Hidden" },
    { "value": "text",   "label": "Text only" },
    { "value": "image",  "label": "Image only" },
    { "value": "both",   "label": "Image + text" }
  ],
  "default": "hidden"
},
{
  "type": "header",
  "content": "Image sizing"
},
{
  "type": "text",
  "id": "advanced_badge_image_mobile",
  "label": "Badge image width (mobile, px)",
  "default": "60",
  "info": "Number of pixels, e.g. 60"
},
{
  "type": "text",
  "id": "advanced_badge_image_desktop",
  "label": "Badge image width (desktop, px)",
  "default": "120",
  "info": "Number of pixels, e.g. 120"
}
```

Then add **10 mapping slots**. Slots 1–10 follow this pattern — duplicate for 2 through 10, incrementing IDs and labels:

```json
{
  "type": "text",
  "id": "advanced_badge_map_1_text",
  "label": "Badge text 1",
  "info": "Match exactly (case-sensitive), e.g. Free Gift!"
},
{
  "type": "image_picker",
  "id": "advanced_badge_map_1_image",
  "label": "Image for badge 1"
},
{
  "type": "checkbox",
  "id": "advanced_badge_map_1_show_text",
  "label": "Show text on top of image (badge 1)",
  "default": true
}
```

The 10-slot block ends before the existing `header__icon_list` header.

### 1b. Color swatches section — overlay toggle

Find the existing **Color swatches** section (search for `t:settings_schema.swatches.name`). Inside its `settings` array, add **after** the existing `swatch_image_tooltip` checkbox:

```json
{
  "type": "checkbox",
  "id": "product_card_swatches_overlay",
  "label": "Overlay swatches on product image",
  "info": "When enabled, colour swatches appear over the bottom-centre of the product image on collection cards instead of below it.",
  "default": false
},
{
  "type": "checkbox",
  "id": "product_card_swatches_keep_text",
  "label": "Also keep swatches under the image",
  "info": "Only applies when overlay is on. Off = overlay only. On = swatches appear in both places.",
  "default": false
}
```

**Validate the file:**
```bash
python3 -m json.tool config/settings_schema.json > /dev/null && echo VALID
```

---

## 2. `snippets/product-badges.liquid`

Replace the entire file with:

```liquid
{%- liquid
  assign current_country = localization.country.iso_code | upcase

  if badge_context == 'nav'
    assign badge_mode = settings.advanced_badge_mode_nav
  else
    case template.name
      when 'product'
        assign badge_mode = settings.advanced_badge_mode_product
      when 'collection'
        assign badge_mode = settings.advanced_badge_mode_collection
      when 'index'
        assign badge_mode = settings.advanced_badge_mode_home
      when 'search'
        assign badge_mode = settings.advanced_badge_mode_search
      else
        assign badge_mode = 'hidden'
    endcase
  endif

  assign badge_mode = badge_mode | default: 'hidden'
-%}
{%- if badge_mode != 'hidden' -%}
<div class="badges{% if class != blank %} {{ class }}{% endif %} pointer-events-none">
  {%- assign label_value = product.metafields.theme.label.value -%}
  {%- if label_value != blank -%}
    {%- assign badge_bg = product.metafields.theme.label_color.value | default: settings.product_badge_bg_color -%}
    {%- assign badge_fg = settings.product_badge_text_color | default: '#ffffff' -%}
    {%- capture styles -%}
      {%- if badge_bg != blank -%}--badge-background: {{ badge_bg }};{%- endif -%}
      {%- if badge_fg != blank -%}--badge-foreground: {{ badge_fg }};{%- endif -%}
    {%- endcapture -%}

    {%- assign label_entries = label_value | split: ';' -%}
    {%- for entry in label_entries -%}
      {%- assign entry_trimmed = entry | strip -%}
      {%- if entry_trimmed == blank -%}{%- continue -%}{%- endif -%}

      {%- assign show_label = false -%}
      {%- assign label_text = '' -%}

      {%- if entry_trimmed contains ':' -%}
        {%- assign colon_parts = entry_trimmed | split: ':' -%}
        {%- assign countries_raw = colon_parts.first | strip | upcase -%}
        {%- assign text_parts = colon_parts | slice: 1, 999 -%}
        {%- assign label_text = text_parts | join: ':' | strip -%}
        {%- assign country_list = countries_raw | split: ',' -%}
        {%- for cc in country_list -%}
          {%- assign cc_trimmed = cc | strip -%}
          {%- if cc_trimmed == current_country -%}
            {%- assign show_label = true -%}
            {%- break -%}
          {%- endif -%}
        {%- endfor -%}
      {%- else -%}
        {%- assign label_text = entry_trimmed -%}
        {%- assign show_label = true -%}
      {%- endif -%}

      {%- if show_label and label_text != blank -%}
        {%- assign badge_image = blank -%}
        {%- assign badge_show_text = true -%}
        {%- if settings.advanced_badge_map_1_text != blank and settings.advanced_badge_map_1_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_1_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_1_show_text -%}
        {%- elsif settings.advanced_badge_map_2_text != blank and settings.advanced_badge_map_2_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_2_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_2_show_text -%}
        {%- elsif settings.advanced_badge_map_3_text != blank and settings.advanced_badge_map_3_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_3_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_3_show_text -%}
        {%- elsif settings.advanced_badge_map_4_text != blank and settings.advanced_badge_map_4_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_4_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_4_show_text -%}
        {%- elsif settings.advanced_badge_map_5_text != blank and settings.advanced_badge_map_5_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_5_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_5_show_text -%}
        {%- elsif settings.advanced_badge_map_6_text != blank and settings.advanced_badge_map_6_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_6_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_6_show_text -%}
        {%- elsif settings.advanced_badge_map_7_text != blank and settings.advanced_badge_map_7_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_7_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_7_show_text -%}
        {%- elsif settings.advanced_badge_map_8_text != blank and settings.advanced_badge_map_8_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_8_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_8_show_text -%}
        {%- elsif settings.advanced_badge_map_9_text != blank and settings.advanced_badge_map_9_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_9_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_9_show_text -%}
        {%- elsif settings.advanced_badge_map_10_text != blank and settings.advanced_badge_map_10_text == label_text -%}
          {%- assign badge_image = settings.advanced_badge_map_10_image -%}
          {%- assign badge_show_text = settings.advanced_badge_map_10_show_text -%}
        {%- endif -%}

        {%- case badge_mode -%}
          {%- when 'text' -%}
            <span class="badge flex items-center gap-1d5 font-medium leading-none rounded-full"{% if styles != blank %} style="{{ styles }}"{% endif %}>
              {{- label_text | escape -}}
            </span>
          {%- when 'image' -%}
            {%- if badge_image != blank -%}
              {{ badge_image | image_url: width: 800 | image_tag: alt: label_text, class: 'badge-image', loading: 'lazy' }}
            {%- endif -%}
          {%- when 'both' -%}
            {%- if badge_image != blank and badge_show_text -%}
              <div class="badge-image-wrap relative inline-block">
                {{ badge_image | image_url: width: 800 | image_tag: alt: label_text, class: 'badge-image', loading: 'lazy' }}
                <span class="badge badge-on-image flex items-center gap-1d5 font-medium leading-none rounded-full"{% if styles != blank %} style="{{ styles }}"{% endif %}>
                  {{- label_text | escape -}}
                </span>
              </div>
            {%- elsif badge_image != blank -%}
              {{ badge_image | image_url: width: 800 | image_tag: alt: label_text, class: 'badge-image', loading: 'lazy' }}
            {%- elsif badge_show_text -%}
              <span class="badge flex items-center gap-1d5 font-medium leading-none rounded-full"{% if styles != blank %} style="{{ styles }}"{% endif %}>
                {{- label_text | escape -}}
              </span>
            {%- endif -%}
        {%- endcase -%}
      {%- endif -%}
    {%- endfor -%}
  {%- endif -%}
</div>
{%- endif -%}
```

---

## 3. `snippets/css-variables.liquid`

Find the closing `</style>` near the bottom. Insert this block **just before** that `</style>`:

```liquid
.badges .badge {
  font-size: {{ settings.product_badge_text_size | default: 12 }}px;
}
@media screen and (min-width: 768px) {
  .badges .badge {
    font-size: {{ settings.product_badge_text_size_desktop | default: 16 }}px;
  }
}

.badge-image {
  display: block;
  width: {{ settings.advanced_badge_image_mobile | default: 60 }}px;
  height: auto;
}
@media screen and (min-width: 768px) {
  .badge-image {
    width: {{ settings.advanced_badge_image_desktop | default: 120 }}px;
  }
}
.badge-image-wrap .badge-on-image {
  position: absolute;
  left: 50%;
  bottom: var(--sp-2);
  transform: translateX(-50%);
  z-index: 1;
  white-space: nowrap;
}

.product-card__media.swatches-overlay .product-card__bottom {
  position: absolute;
  left: 50%;
  bottom: var(--sp-3);
  transform: translateX(-50%);
  z-index: 3;
  padding: var(--sp-1d5) var(--sp-3);
  background: rgb(var(--color-background) / 0.85);
  backdrop-filter: blur(4px);
  border-radius: 999px;
  pointer-events: auto;
}
```

---

## 4. `snippets/product-card.liquid`

Five edits, applied in order.

### 4a. Lift `quick_view_id` capture to the top liquid block

Find the top liquid block (~lines 42–58). At the end of the `{%- liquid ... -%}` block, just before `-%}`, add:

```liquid
capture quick_view_id
  echo 'Quickview-'
  echo section_id
  if block_id != blank
    echo '-'
    echo block_id
  endif
  echo '-'
  echo product_id
endcapture
```

Then **delete** the inline capture that previously lived inside `{% if show_quick_view %}`:

```liquid
{%- capture quick_view_id -%}Quickview-{{ section_id }}{% if block_id != blank %}-{{ block_id }}{% endif %}-{{ product_id }}{%- endcapture -%}
```

### 4b. Add `swatches-overlay` class to `product-card__media`

```liquid
<div class="product-card__media relative h-auto{% if settings.product_card_swatches_overlay %} swatches-overlay{% endif %}">
```

### 4c. Forward `badge_context` to product-badges

Replace:
```liquid
{%- render 'product-badges', product: product, vertical_badges: vertical_badges, show_sold_out: show_sold_out, show_save_amount: show_save_amount, save_type: save_type, class: 'z-2 absolute grid gap-3 pointer-events-none' -%}
```
with:
```liquid
{%- render 'product-badges', product: product, vertical_badges: vertical_badges, show_sold_out: show_sold_out, show_save_amount: show_save_amount, save_type: save_type, badge_context: badge_context, class: 'z-2 absolute grid gap-3 pointer-events-none' -%}
```

### 4d. Replace the inline swatch block with the extracted snippet

Find the block starting with:
```liquid
{%- if show_color_swatches -%}
  {%- liquid
    assign swatch_trigger_list = 'products.general.color_swatch_trigger' | t | downcase | split: ','
    ...
```

It spans ~100 lines and ends with `{%- endfor -%}{%- endif -%}`. **Replace the entire block** with:

```liquid
{%- if show_color_swatches and settings.product_card_swatches_overlay == false -%}
  {%- render 'product-card-swatches', product: product, product_url: product_url, show_quick_view: show_quick_view, quick_view_id: quick_view_id -%}
{%- elsif show_color_swatches and settings.product_card_swatches_overlay and settings.product_card_swatches_keep_text -%}
  {%- render 'product-card-swatches', product: product, product_url: product_url, show_quick_view: show_quick_view, quick_view_id: quick_view_id -%}
{%- endif -%}
```

### 4e. Render the overlay swatches inside `product-card__media`

Inside the `{%- if featured_media -%}` branch, just **before** the closing `</div>` of `product-card__media`, add:

```liquid
{%- if show_color_swatches and settings.product_card_swatches_overlay -%}
  {%- render 'product-card-swatches', product: product, product_url: product_url, show_quick_view: show_quick_view, quick_view_id: quick_view_id -%}
{%- endif -%}
```

---

## 5. `snippets/product-card-swatches.liquid` (NEW file)

Create this file with the extracted swatch logic. Full content:

```liquid
{%- doc -%}
  Renders the colour swatches for a product card.

  Extracted from product-card.liquid so the same swatch HTML can render in
  either the content area (default) or overlaid on the product image
  (settings.product_card_swatches_overlay = true).

  @param {object} product - Product object
  @param {string} product_url - Product URL (collection-scoped)
  @param {boolean} show_quick_view - Whether quick view is enabled (affects aria-controls)
  @param {string} quick_view_id - Quick view modal ID
{%- enddoc -%}
{%- liquid
  assign swatch_trigger_list = 'products.general.color_swatch_trigger' | t | downcase | split: ','
  assign color_count = 0

  assign has_color_option = false
  for option in product.options_with_values
    assign option_name = option.name | downcase
    for trigger in swatch_trigger_list
      assign swatch_trigger = trigger | strip
      if option_name contains swatch_trigger
        assign has_color_option = true
      elsif swatch_trigger == 'color' and option_name contains 'colour'
        assign has_color_option = true
      endif
      if has_color_option
        break
      endif
    endfor
    if has_color_option
      break
    endif
  endfor
-%}
{%- for option in product.options_with_values -%}
  {%- liquid
    assign is_color = false
    assign use_variant_image = false
    assign option_name = option.name | downcase
    for trigger in swatch_trigger_list
      assign swatch_trigger = trigger | strip
      if option_name contains swatch_trigger
        assign is_color = true
      elsif swatch_trigger == 'color' and option_name contains 'colour'
        assign is_color = true
      endif

      if is_color == true
        break
      endif
    endfor

    if option_name contains 'model'
      unless has_color_option
        assign is_color = true
        assign use_variant_image = true
      endunless
    endif
  -%}
  {%- if is_color -%}
    {%- liquid
      assign option_index = forloop.index0
      assign values = ''
      assign max_color_count = settings.product_max_color_swatches
    -%}
    <div class="product-card__bottom flex items-center gap-2">
      <ul class="swatches swatches--{{ settings.rounded_swatch }}{% if settings.product_color_swatch_type == 'variant' or use_variant_image %} swatches--variant{% endif %} swatches--{{ product.id }} inline-flex items-start gap-2">
        {%- for variant in product.variants -%}
          {%- assign value = variant.options[option_index] %}
          {%- unless values contains value -%}
            {%- liquid
              assign values = values | join: ',' | append: ',' | append: value | split: ','
              assign color_count = color_count | plus: 1
              assign color_title = product.title | append: ' - ' | append: value
              assign color_url = variant.url | within: collection
              if settings.product_disable_collection_portion
                assign color_url = variant.url
              endif

              assign swatch = blank
              if value.swatch != blank
                assign swatch = value.swatch
              endif

              if use_variant_image and variant.image
                assign swatch = variant
              elsif settings.product_color_swatch_type == 'variant' and variant.image
                assign swatch = variant
              endif
            -%}
            {%- if color_count <= max_color_count -%}
              <li>
                {%- render 'swatch', href: color_url, title: color_title, value: value, value_label: value, swatch: swatch -%}
              </li>
            {%- endif -%}
          {%- endunless -%}
        {%- endfor -%}
      </ul>
      {%- if color_count > max_color_count -%}
        <a href="{{ product_url }}" class="reversed-link font-medium text-xs text-opacity leading-none tracking-widest" is="hover-link"{% if show_quick_view %} aria-controls="{{ quick_view_id }}" aria-expanded="false"{% endif %}>+{{ color_count | minus: max_color_count }}</a>
      {%- endif -%}
    </div>
    {%- if color_count < 1 -%}
      <style>
        .swatches--{{ product.id }} { display: none; }
      </style>
    {%- endif -%}
  {%- endif -%}
{%- endfor -%}
```

---

## 6. `snippets/header-nav-mega.liquid`

Find the `render 'product-card'` call (around line 259). At the end of the parameter list (just before the closing `-%}`), add:

```liquid
,
badge_context: 'nav'
```

So the final render call looks like:
```liquid
{%- render 'product-card',
  product: product,
  ...
  save_type: settings.product_save_type,
  show_icon_list: false,
  badge_context: 'nav'
-%}
```

---

## 7. Deploy

```bash
git checkout Development        # or your working branch
git add config/settings_schema.json \
        snippets/product-badges.liquid \
        snippets/css-variables.liquid \
        snippets/product-card.liquid \
        snippets/product-card-swatches.liquid \
        snippets/header-nav-mega.liquid
git commit -m "Add badge styling + Advanced Badges + country labels + swatch overlay"
git push origin Development
```

Open a PR to `main` and merge. Shopify will sync within ~30–60s.

---

## 8. Authoring labels — examples for the USA site

Set on each product via **Admin → Products → [product] → Metafields → Label** (the existing `theme.label` metafield).

| Use case | Metafield value | What renders |
|---|---|---|
| Same label everywhere | `Free Gift!` | "Free Gift!" pill (or mapped image) for every shopper |
| USA-only | `US:Free Shipping` | Visible only to shoppers detected as US |
| US + Canada | `US,CA:Free Shipping` | Visible to US and CA shoppers |
| Different label per market | `US:Free Shipping;GB:UK Stock` | US shoppers see "Free Shipping"; UK shoppers see "UK Stock" |
| Universal + override | `Free Gift!;CA:Free Shipping CA` | Everyone sees "Free Gift!"; CA shoppers see both |
| Multiple country variants | `US:NEW IN;GB:NEW IN;CA:Limited` | One pill per market |

ISO codes must be 2-letter uppercase. Don't put spaces around the colon (`US:LABEL`, not `US : LABEL`). Spaces around commas in the country list are tolerated (`US, CA: LABEL` works).

If you map a label to an image via Advanced Badges, the mapping is on the **text** part only — so `US:Free Gift!` and `Free Gift!` both resolve to the same image if `Free Gift!` is in slot 1.

---

## 9. Testing checklist

After Shopify syncs the target theme:

### Basic styling (Theme settings → Product tiles → Badges)
- [ ] **Badge text size (mobile)** + **(desktop)** sliders both visible
- [ ] **Badge text color** + **Badge background color** show; changes reflect on a product whose `theme.label` metafield is set
- [ ] Adjusting mobile slider resizes pill at < 768px viewport; desktop slider resizes at ≥ 768px

### Advanced Badges
- [ ] "Advanced Badges" header appears below Badge background color
- [ ] Five Visibility selects (Product / Collection / Home / Search / Top nav) all default to **Hidden**
- [ ] Image width (mobile) + (desktop) text inputs accept px values
- [ ] 10 mapping slots: text input + image picker + "Show text on top of image" checkbox
- [ ] Set Badge text 1 = `Free Gift!`, upload a PNG, set Collection pages = Image only — on collection pages, the PNG replaces the orange pill for any product whose `theme.label` resolves to `Free Gift!`
- [ ] Set the same to Image + text — the PNG renders with the text pill overlaid at the bottom-centre
- [ ] Set Top navigation menu = Hidden — no badges in the header mega-menu dropdown

### Country rules
- [ ] Set a product's `theme.label` to `US:Free Shipping;GB:UK Stock` — US shoppers see "Free Shipping" pill, UK shoppers see "UK Stock"
- [ ] Set to `US,CA:Free Shipping` — both US and CA shoppers see it, others see nothing
- [ ] Set to `Free Gift!;US:Free Shipping` — US shoppers see both pills; non-US shoppers see only "Free Gift!"
- [ ] Confirm `localization.country.iso_code` resolves correctly — on a USA-only store with no Markets it should be `US`

### Overlay swatches (Theme settings → Color swatches)
- [ ] Toggle **Overlay swatches on product image** ON — colour swatches appear in a translucent pill at the bottom-centre of product images on collection cards
- [ ] Toggle **Also keep swatches under the image** ON — swatches appear in both locations
- [ ] Toggle both OFF — swatches return to under-image position (default)

---

## 10. Reference — original WaveSpas commits

The full chain of work on the WaveSpas (UK) repo, in case you need to cherry-pick from any specific commit:

- `0839935` — Re-apply badge text/colour controls
- `f304750` — Advanced Badges section + sizes + 10 mappings (text + image_picker)
- `cdda112` — Overlay swatches feature
- `d73cbbe` — "Also keep swatches under image" toggle
- `2c7641b` — Text pill ON TOP of badge image (via `.badge-on-image`)
- `3097fd4` — Mobile/desktop text size split
- `a6fb612` — Move Advanced Badges back into Product tiles + flip visibility defaults off
- `34da69e` — Initial nav suppression
- `f591e4b` — Replace visibility checkboxes with mode selects (final state)

Merged to main via PRs #8, #9, #10 in the WaveSpas (UK) repo.

---

## 11. Notes specific to the USA site

- On a single-market USA store, `localization.country.iso_code` always returns `US`. The country syntax is still useful for future-proofing — you can author `US:` entries today and they render correctly. If you later enable Shopify Markets for other regions, no code change needed; just add `CA:` / `MX:` / etc. entries to any product's metafield.
- If the USA site does **not** have a Markets/localisation setup at all, `localization` may be undefined for some routes. The snippet handles this gracefully (`localization.country.iso_code | upcase` yields an empty string, so country-prefixed entries silently don't match). Plain text entries always render.
- The `theme.label` and `theme.label_color` metafield definitions need to exist on the target store. They ship with Concept by default; check **Settings → Custom data → Products** if labels don't render at all on a product where the metafield value is set.
