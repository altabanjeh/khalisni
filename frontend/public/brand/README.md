# Khalsni brand assets

These are the **official, business-supplied** Khalsni brand assets. Do not redraw,
recolour, restyle, distort, or regenerate them. Only format/size derivatives are
allowed, and every derivative must come from these source files.

| File | Purpose | Source |
|---|---|---|
| `khalsni-wordmark.png` / `.jpg` | Primary Arabic wordmark (خلصني) on the Khalsni blue field. Used in public header/footer, auth screens, internal header & sidebar. | Supplied file `imges/logo/ds.jpeg` (1024×1024), uniform blue border trimmed only. |
| `khalsni-wordmark-square.png` | Untouched 1:1 wordmark as originally supplied. | Supplied file `imges/logo/ds.jpeg`, unmodified. |
| `khalsni-app-icon.png` | Compact application icon (white history-circle + checkmark on a rounded blue square). Used where space is constrained: collapsed sidebar, mobile bar, avatars. | Supplied file `imges/logo/WhatsApp Image 2026-04-23 at 6.55.41 PM.jpeg` (1254×1254), white margin cropped to the icon, corner slivers filled with the icon's own blue. |
| `khalsni-app-icon-rounded.png` | Same icon with transparent rounded corners. | As above. |

## Application identity derivatives (in `frontend/public/`)

Generated from `khalsni-app-icon.png` only, design unchanged:

`favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`,
`favicon-48x48.png`, `apple-touch-icon.png` (180), `icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, and `site.webmanifest`.

Brand blue: `#006BB9`.

Regenerate with `scripts/generate_brand_assets.py`.
