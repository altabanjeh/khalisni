# Khalsni branding + managed service images

## 1. Brand assets

The two **official, business-supplied** assets are the single source of truth:

| Supplied source | Stored (unaltered) as | Role |
|---|---|---|
| `imges/logo/ds.jpeg` (1024²) — Arabic wordmark خلصني on Khalsni blue | `frontend/public/brand/khalsni-wordmark.png` / `.jpg` (uniform border trimmed) and `…-square.png` (untouched) + `frontend/public/brand/source/khalsni-wordmark-original.jpeg` | Primary wordmark |
| `imges/logo/WhatsApp Image 2026-04-23 at 6.55.41 PM.jpeg` (1254²) — checkmark app icon | `frontend/public/brand/khalsni-app-icon.png` (+`-rounded.png`) + `frontend/public/brand/source/khalsni-app-icon-original.jpeg` | Compact app icon |

Brand blue: **`#006BB9`**.

Regenerate every derivative from the two sources with:

```bash
python scripts/generate_brand_assets.py
```

### Application identity (favicon / PWA), all derived from the app icon only

`frontend/public/`: `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`,
`favicon-48x48.png`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `site.webmanifest`. Wired up in `frontend/index.html`
(`<link rel=icon|apple-touch-icon|manifest>`, `theme-color #006BB9`,
`<title>خلصني | Khalsni</title>`). nginx serves `site.webmanifest` as
`application/manifest+json`.

### Centralized components — never hardcode a logo path

`frontend/src/components/brand/KhalsniLogo.jsx`:

* `<KhalsniLogo size overrideSrc to />` — wordmark; `overrideSrc` lets the
  admin-managed `theme.logo_url` still win, otherwise the supplied wordmark. No
  text fallback any more.
* `<KhalsniAppIcon size to />` — compact icon (constrained space).
* `<KhalsniLockup />` — icon + wordmark for wide headers / auth screens.

Used in: public header + footer (`PublicLayout`), internal header (`Topbar`),
internal sidebar (`Sidebar`), auth screens (`LoginPage`, `RegisterPage`).

Removed stale scaffold graphics: `public/favicon.svg`, `src/assets/react.svg`,
`src/assets/vite.svg`.

## 2. Managed service images

### Data → API → UI

```
Service.image (ImageField, upload_to="services/images/", blank/null)   ← already existed
      │  admin write: AdminServiceRuleSerializer (image / clear_image,
      │  PublicSiteImageValidator: ext+MIME+size ≤ 5 MB; re-encode/resize
      │  via core.image_utils.optimize_image_upload — strips EXIF, caps 1600px,
      │  neutralises polyglot uploads)
      ▼
ServiceAdminViewSet  (IsAuthenticated + CanViewOrManageServiceCatalog, MultiPartParser, AdminAuditMixin)
      ▼
Public read: ServiceListSerializer / ServiceDetailSerializer / RelatedServiceSerializer
      → image_url  (root-relative "/media/services/images/x.jpg?v=<updated_at>", cache-busted)
      ▼
Frontend: <ServiceCard> + <ServiceDetailsPage> via <ImageFallback> →
      shows the image, or <BrandImagePlaceholder> (Khalsni-blue field + app-icon
      mark) — never a broken image / undefined. alt text = localized service name.
```

No new migration: `Service.image` has existed since `services/0001_initial`.

### Admin UX

`ServicesManagementPage` → service create/edit → **صورة الخدمة / Service Image**
field (`ImageUploadField`): upload, live preview before save, replace, and
**إزالة صورة الخدمة / Remove-reset**. Same for **صورة الفئة / Category Image**.
Accepts JPEG/PNG/WebP.

### Initial (seed / default) images

`python manage.py seed_service_images [--force] [--dry-run]`

* Maps each service **by slug** to `backend/services/seed_assets/service_images/<slug>.jpg`;
  unmapped services fall back by **category keyword**, then a default.
* Only fills services with no image (unless `--force`). Idempotent.
* Assets: Unsplash, downloaded + resized + committed into the repo (never
  hot-linked), then copied into Khalsni media storage on seed. Source URL +
  licence per file in `seed_assets/service_images/CREDITS.json` (all Unsplash
  License — commercial use, no attribution required).
* **These are defaults, not code.** Nothing maps images by id/name at
  request time; an admin can replace/reset any of them from the UI.

### Security notes

* Public catalogue images live under `/media/services/images/` and are meant to
  be world-readable — served by nginx like the existing category/CMS images.
* Private customer/request documents remain under `/media/secure_orders/…` /
  `/media/payments/…`, still `deny all` in nginx and only reachable through the
  authenticated `/api/documents/<id>/download/` endpoint. **Unchanged.**
* Image-management endpoints keep `CanViewOrManageServiceCatalog`; customers /
  employees / anonymous users get 401/403.
