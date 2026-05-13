# Add color, padding, alignment, and radius options to the product Text block

This document describes how to extend the product page **Text block** with merchant-controlled styling. It is written so an AI agent or developer can replicate the change on another Shopify theme that follows the same architecture.

**Final settings added:**
- **Colors:** Text color, Icon color, Background color (independent of each other)
- **Layout:** Alignment (Left / Center / Right), Vertical padding (px), Border radius (px)

## Context

The Text block lives inside `sections/main-product.liquid` (it is a section-scoped block, not a standalone block file). Before this change, the rendering code already referenced settings like `background_color`, `text_color`, `background_height`, and `alignment` — but the schema never defined them, so they were unreachable from the theme editor. This change wires those up properly and adds the missing **icon color** and **border radius** controls.

## Files touched

- `sections/main-product.liquid` — both the render block (`{%- when 'text' -%}`) and the schema entry (`"type": "text"` block).

## Coverage

Works on every product template that uses the `main-product` section (`product.json`, `product.product-new2.json`, etc.). Templates that use a different section (e.g. `product.modal.json`) are not affected.

## Step 1 — Update the render code

Find the `{%- when 'text' -%}` case inside the section's block loop (search for `when 'text'`). It will look roughly like this — locate the `text_block_style` capture block and the inner `<div class="product__text-inner ...">` markup.

**Replace this block:**

```liquid
{%- capture text_block_style -%}
  {%- if block.settings.background_color != blank and block.settings.background_color != 'rgba(0,0,0,0)' -%}background-color: {{ block.settings.background_color }};{%- endif -%}
  {%- if block.settings.text_color != blank and block.settings.text_color != 'rgba(0,0,0,0)' -%}color: {{ block.settings.text_color }};{%- endif -%}
  {%- if block.settings.background_height > 0 -%}min-height: {{ block.settings.background_height }}px;{%- endif -%}
{%- endcapture -%}
{%- assign alignment_class = 'justify-start' -%}
{%- if block.settings.alignment == 'center' -%}
  {%- assign alignment_class = 'justify-center' -%}
{%- elsif block.settings.alignment == 'right' -%}
  {%- assign alignment_class = 'justify-end' -%}
{%- endif -%}
<div class="product__text{% if modulo == 0 %} even{% endif %}{% if prev_block.type != 'text' %} first{% endif %}{% if next_block.type != 'text' %} last{% endif %}" {{ block.shopify_attributes }}>
  <div class="product__text-inner flex items-center gap-2d5 {{ alignment_class }}"{% if text_block_style != blank %} style="{{ text_block_style }}"{% endif %}>
    {%- if block.settings.icon_image != blank -%}
      {%- liquid
        if block.settings.iwidth == 'fit'
          assign icon_width = block.settings.icon_image.width
        else
          assign icon_width = block.settings.icon_width
        endif
        assign image_alt = block.settings.icon_image.alt | default: block.settings.accessibility_info | escape
        assign image_alt = image_alt | default: block.settings.text | escape
        assign max_width = block.settings.icon_image.width
      -%}
      <figure class="media media--transparent relative inline-block">
        {%- capture sizes -%}{{ icon_width }}px{%- endcapture -%}
        {%- capture widths -%}{{ icon_width | times: 1.5 | at_most: max_width | round }}, {{ icon_width | times: 2 | at_most: max_width }}, {{ icon_width | times: 3 | at_most: max_width }}{%- endcapture -%}
        {{- block.settings.icon_image | image_url: width: max_width | image_tag: loading: 'lazy', sizes: sizes, widths: widths, alt: image_alt, class: 'image-fit' -}}
      </figure>
    {%- elsif block.settings.icon != 'none' -%}
      {%- liquid
        if block.settings.iwidth == 'fit'
          render 'icon-guarantee', icon: block.settings.icon, size: 'lg', class: 'inline-block stroke-1'
        else
          render 'icon-guarantee', icon: block.settings.icon, size: 'custom', class: 'inline-block stroke-1', width: block.settings.icon_width
        endif
      -%}
    {%- endif -%}
    <p class="data-contona-persona rte {{ block.settings.text_size }} leading-tight">{{ block.settings.text }}</p>
  </div>
</div>
```

**With this:**

```liquid
{%- capture text_block_style -%}
  {%- if block.settings.background_color != blank and block.settings.background_color != 'rgba(0,0,0,0)' -%}background-color: {{ block.settings.background_color }};{%- endif -%}
  {%- if block.settings.background_height > 0 -%}padding-top: {{ block.settings.background_height }}px;padding-bottom: {{ block.settings.background_height }}px;{%- endif -%}
  {%- if block.settings.border_radius > 0 -%}border-radius: {{ block.settings.border_radius }}px;{%- endif -%}
{%- endcapture -%}
{%- capture icon_style -%}
  {%- if block.settings.icon_color != blank and block.settings.icon_color != 'rgba(0,0,0,0)' -%}color: {{ block.settings.icon_color }};{%- endif -%}
{%- endcapture -%}
{%- capture text_style -%}
  {%- if block.settings.text_color != blank and block.settings.text_color != 'rgba(0,0,0,0)' -%}color: {{ block.settings.text_color }};{%- endif -%}
{%- endcapture -%}
{%- assign outer_align = 'left' -%}
{%- assign justify_class = 'justify-start' -%}
{%- if block.settings.alignment == 'center' -%}
  {%- assign outer_align = 'center' -%}
  {%- assign justify_class = 'justify-center' -%}
{%- elsif block.settings.alignment == 'right' -%}
  {%- assign outer_align = 'right' -%}
  {%- assign justify_class = 'justify-end' -%}
{%- endif -%}
<div class="product__text text-{{ outer_align }}{% if modulo == 0 %} even{% endif %}{% if prev_block.type != 'text' %} first{% endif %}{% if next_block.type != 'text' %} last{% endif %}" {{ block.shopify_attributes }}>
  <div class="product__text-inner flex items-center gap-2d5 {{ justify_class }}"{% if text_block_style != blank %} style="{{ text_block_style }}"{% endif %}>
    {%- if block.settings.icon_image != blank -%}
      {%- liquid
        if block.settings.iwidth == 'fit'
          assign icon_width = block.settings.icon_image.width
        else
          assign icon_width = block.settings.icon_width
        endif
        assign image_alt = block.settings.icon_image.alt | default: block.settings.accessibility_info | escape
        assign image_alt = image_alt | default: block.settings.text | escape
        assign max_width = block.settings.icon_image.width
      -%}
      <figure class="media media--transparent relative inline-block"{% if icon_style != blank %} style="{{ icon_style }}"{% endif %}>
        {%- capture sizes -%}{{ icon_width }}px{%- endcapture -%}
        {%- capture widths -%}{{ icon_width | times: 1.5 | at_most: max_width | round }}, {{ icon_width | times: 2 | at_most: max_width }}, {{ icon_width | times: 3 | at_most: max_width }}{%- endcapture -%}
        {{- block.settings.icon_image | image_url: width: max_width | image_tag: loading: 'lazy', sizes: sizes, widths: widths, alt: image_alt, class: 'image-fit' -}}
      </figure>
    {%- elsif block.settings.icon != 'none' -%}
      <span class="inline-flex items-center"{% if icon_style != blank %} style="{{ icon_style }}"{% endif %}>
      {%- liquid
        if block.settings.iwidth == 'fit'
          render 'icon-guarantee', icon: block.settings.icon, size: 'lg', class: 'inline-block stroke-1'
        else
          render 'icon-guarantee', icon: block.settings.icon, size: 'custom', class: 'inline-block stroke-1', width: block.settings.icon_width
        endif
      -%}
      </span>
    {%- endif -%}
    <p class="data-contona-persona rte {{ block.settings.text_size }} leading-tight"{% if text_style != blank %} style="{{ text_style }}"{% endif %}>{{ block.settings.text }}</p>
  </div>
</div>
```

### What changed and why

| Change | Reason |
|---|---|
| Removed `color:` from `text_block_style` | Text color now applies only to the `<p>` so it can be set independently of the icon. |
| Added `icon_style` capture | Lets `icon_color` be applied to the icon container without affecting text. |
| Added `border-radius` to `text_block_style` | New setting. |
| `background_height` writes `padding-top` + `padding-bottom` (not `min-height`) | Merchants want vertical breathing room around the text, not a tall empty box. |
| Outer wrapper uses `text-{{ outer_align }}`; inner uses `flex` + `justify-content` | The outer block applies `text-align` (handles wrapped lines and inline content), and the inner full-width flex container uses `justify-content` to position the icon + text horizontally. Using both ensures alignment is reliable while the block keeps its full section width — important when a background color is set so the bg fills edge-to-edge. |
| Wrapped the SVG icon in a `<span class="inline-flex items-center">` with inline color | The icon SVGs use `stroke="currentColor"`, so the wrapper's `color` recolors the icon stroke without touching the text. |
| Added `figure` inline-style for image icons | Same purpose for image-based icons. |
| No extra utility padding when bg is set | The default `.product__text-inner` CSS rule (`padding: var(--sp-5) var(--sp-6)`) already provides horizontal/vertical breathing room, and the `background_height` setting writes `padding-top` / `padding-bottom` inline (overriding the vertical default) when the merchant wants more. |

## Step 2 — Add the schema settings

Find the `{ "type": "text", "name": "...", "settings": [ ... ] }` block within the `{% schema %}` of `main-product.liquid`. Locate the `text_size` setting — it is the last existing setting in the array. Append the following entries **after** `text_size` (before the closing `]` of `settings`):

```json
{
  "type": "header",
  "content": "Colors"
},
{
  "type": "color",
  "id": "text_color",
  "label": "Text color",
  "default": "#000000"
},
{
  "type": "color",
  "id": "icon_color",
  "label": "Icon color",
  "default": "#000000"
},
{
  "type": "color",
  "id": "background_color",
  "label": "Background color",
  "default": "rgba(0,0,0,0)"
},
{
  "type": "header",
  "content": "Layout"
},
{
  "type": "select",
  "id": "alignment",
  "label": "Alignment",
  "options": [
    { "value": "left", "label": "Left" },
    { "value": "center", "label": "Center" },
    { "value": "right", "label": "Right" }
  ],
  "default": "left"
},
{
  "type": "range",
  "id": "background_height",
  "label": "Vertical padding",
  "info": "Adds equal padding above and below the text.",
  "min": 0,
  "max": 100,
  "step": 2,
  "unit": "px",
  "default": 0
},
{
  "type": "range",
  "id": "border_radius",
  "label": "Border radius",
  "min": 0,
  "max": 50,
  "step": 1,
  "unit": "px",
  "default": 0
}
```

> **Important:** comma placement matters. The previous entry (the `text_size` select) needs a trailing comma after its closing `}` so the JSON stays valid.

## Step 3 — Verify

1. Run `shopify theme dev` (or push to a development theme) and open a product page in the theme editor.
2. Click an existing **Text** block on a product page → the inspector should now show **Colors** and **Layout** sections with the new settings.
3. Test each setting:
   - **Background color** → block renders full-width with that background colour edge-to-edge across the section column.
   - **Text color** and **Icon color** independently → confirm they don't override each other.
   - **Vertical padding** → padding above and below the text grows; horizontal padding from the theme default stays unchanged.
   - **Border radius** → corners round.
   - **Alignment** → Left / Center / Right all visibly position the icon + text inside the block.
4. Confirm existing Text blocks that haven't been touched still look identical to before (defaults are transparent / 0 / left, so nothing should change visually).

## Notes for replication on other themes

- This change assumes the theme uses Tailwind-style utility classes (`flex`, `items-center`, `gap-2d5`, `text-left|center|right`, `justify-start|center|end`). If the theme uses a different utility system, swap the class names for the equivalents.
- The icon snippet is `icon-guarantee.liquid`. Other themes may name it differently (`icon.liquid`, `icon-feature.liquid`); update the `render` calls accordingly. The `currentColor` recoloring trick works as long as the SVG uses `stroke="currentColor"`.
- This guide assumes the theme has an existing `.product__text-inner` CSS rule that applies default padding (`padding: var(--sp-5) var(--sp-6)` or similar). If that doesn't exist in your theme, add a small default padding (e.g. `px-3 py-2`) to the inner div in the render code so the block doesn't look squashed when a background color is applied with no Vertical padding set.
- If the theme stores blocks as standalone block files (`blocks/text.liquid`) rather than section-scoped blocks, apply the same render and schema changes inside that file instead. The schema lives in `{% schema %} ... {% endschema %}` at the bottom, and the render is the rest of the file (no `{%- when 'text' -%}` wrapper needed).
- Why both `text-align` and `justify-content` for alignment: the outer wrapper's `text-align` controls how multi-line text wraps and how inline content sits; the inner flex container's `justify-content` positions the flex items (icon + text) within the full-width block. Using only one of them leaves edge cases — only `text-align` doesn't position flex items, and only `justify-content` doesn't help wrapped text lines.
