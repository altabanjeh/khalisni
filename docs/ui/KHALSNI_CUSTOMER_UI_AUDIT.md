# KHALSNI Customer/Public UI Audit

Date: 2026-08-30

Scope: customer-facing/public frontend visual audit only. This audit intentionally avoids workflow, status, authorization, pricing, and business-rule changes.

## 1. Existing Architecture

- Frontend app: `frontend/`
- Backend app: `backend/`
- Frontend framework: React 19 with Vite.
- Router: `react-router-dom` v7, centralized in `frontend/src/routes/AppRoutes.jsx`.
- API client: Axios through `frontend/src/api/client.js`, aggregated by `frontend/src/api/services.js`.
- Backend framework: Django + Django REST Framework.
- Domain apps relevant to customer/public UI:
  - `services` for categories, services, pricing, duration, service documents, and service relationships.
  - `orders` for customer request creation, tracking, status logs, documents, and ratings.
  - `public_site` for homepage content, theme, advertisements, and missing-service requests.
  - `accounts` for registration/login/password reset.
- Public routes are wrapped in `PublicLayout` and `PublicSiteProvider`.
- Authenticated customer routes are wrapped in `ProtectedRoute roles={['customer']}` and `DashboardLayout`.

## 2. Customer/Public Routes

Public routes in `frontend/src/routes/AppRoutes.jsx`:

- `/` -> `frontend/src/pages/public/HomePage.jsx`
- `/services` -> `frontend/src/pages/public/ServicesPage.jsx`
- `/services/category/:slug` -> `frontend/src/pages/public/ServiceCategoryPage.jsx`
- `/services/:slug` -> `frontend/src/pages/public/ServiceDetailsPage.jsx`
- `/create-order` -> `frontend/src/pages/public/CreateOrderPage.jsx`
- `/track-order` -> `frontend/src/pages/public/TrackOrderPage.jsx`
- `/about` -> `frontend/src/pages/public/AboutPage.jsx`
- `/contact` -> `frontend/src/pages/public/ContactPage.jsx`
- `/faq` -> `frontend/src/pages/public/FaqPage.jsx`
- `/privacy` -> `frontend/src/pages/public/PrivacyPolicyPage.jsx`
- `/login` -> `frontend/src/pages/public/LoginPage.jsx`
- `/forgot-password` -> `frontend/src/pages/public/ForgotPasswordPage.jsx`
- `/reset-password/:token` -> `frontend/src/pages/public/ResetPasswordPage.jsx`
- `/register` -> `frontend/src/pages/public/RegisterPage.jsx`

Customer request routes:

- `/customer` -> `frontend/src/pages/customer/CustomerDashboardHome.jsx`
- `/customer/orders/new` -> `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`
- `/customer/orders` -> `frontend/src/pages/customer/MyOrdersPage.jsx`
- `/customer/orders/:id` -> `frontend/src/pages/customer/CustomerOrderDetailsPage.jsx`
- `/customer/orders/:id/missing-docs` -> `frontend/src/pages/customer/MissingDocumentsResponsePage.jsx`
- `/customer/profile` -> `frontend/src/pages/customer/ProfilePage.jsx`
- `/customer/manual` -> `frontend/src/pages/shared/ManualLaunchPage.jsx`

Search result behavior:

- No dedicated `/search` route exists.
- Homepage search suggestions route directly to service/category detail pages.
- Unknown homepage search submits to `/services?search=...`.
- Services filtering uses `/services?search=...&category=...`.

Public business pages:

- About: `/about`
- FAQ/help: `/faq`
- Contact: `/contact`
- Privacy policy: `/privacy`
- Public request tracking: `/track-order`
- Special/missing service request: embedded in home page and backed by `/api/public-site/missing-service-requests/`.

## 3. Shared Components

Public/customer-facing shared components:

- `frontend/src/layouts/PublicLayout.jsx`
  - Public navbar, mobile menu, footer, floating contact action.
- `frontend/src/components/public/PublicPage.jsx`
  - `PublicPageShell`, `PublicHero`, `PublicPanel`, `PublicCard`, `PublicInput`, `PublicTextarea`, `PublicButton`, `PublicLinkButton`, `PublicSearchInput`, `PublicLoading`, `PublicEmptyState`.
- `frontend/src/components/CategoryCard.jsx`
  - Category card used by services pages and related categories.
- `frontend/src/components/ServiceCard.jsx`
  - Service card used by service listings and related services.
- `frontend/src/components/DataTable.jsx`
  - Used by customer dashboard/order lists and admin/internal lists.
- `frontend/src/components/FileUploader.jsx`
  - Used in customer request/document flows.
- `frontend/src/components/ApplicationStepper.jsx`
  - Used in customer create-order flow.
- `frontend/src/components/StatusBadge.jsx`
  - Used across public tracking and customer order pages.
- `frontend/src/components/OrderTimeline.jsx`
  - Used by public tracking and customer order details.
- `frontend/src/components/DocumentList.jsx`
  - Used by public tracking and customer order details.
- `frontend/src/components/PageHeader.jsx`
  - Used heavily by authenticated customer dashboard pages.
- `frontend/src/layouts/DashboardLayout.jsx`, `Sidebar.jsx`, `Topbar.jsx`
  - Customer portal shell and mobile sidebar behavior.

## 4. Current Visual System

Styling system:

- Tailwind CSS v3 utility classes.
- Global theme tokens in `frontend/tailwind.config.js`.
- CSS custom properties and Tailwind component classes in `frontend/src/index.css`.
- `frontend/src/App.css` still contains leftover Vite/demo-style CSS and does not appear to be part of the customer visual system.

Design tokens:

- Primary brand blue: `#1252f7`.
- Navy/dark typography: `#0b1533`, `#17213a`.
- Backgrounds: `#ffffff`, `#f7faff`, `#eef4ff`.
- Border: `#e4eaf2`.
- Radius tokens:
  - `--radius-sm: 8px`
  - `--radius-md: 12px`
  - `--radius-lg: 16px`
  - `--radius-xl: 20px`
  - `--radius-2xl: 24px`
  - Many components also hardcode `rounded-[2rem]`, `rounded-2xl`, `rounded-3xl`, and `rounded-[1.75rem]`.
- Shadows:
  - `shadow-soft`
  - `shadow-panel`
  - local `shadow-sm`, `shadow-lg`, `shadow-2xl`

Public-site theme:

- `PublicSiteProvider` loads `/api/public-site/theme/` and `/api/public-site/homepage/`.
- Theme values are applied as CSS variables via `frontend/src/utils/publicSiteDefaults.js`.
- Admin theme screen exists at `frontend/src/pages/admin/ThemeSettingsPage.jsx`.

Current visual direction in source:

- The source already has many light surfaces and white/off-white tokens.
- Existing repo screenshots show both a dark legacy public UI (`homepage-current.png`, `public-services-verify.png`) and a later light UI under `docs/ui/screenshots/final/`.
- Remaining source-level problems are mostly card density, nested panels, inconsistent radius/shadow usage, missing image-led service cards, and RTL/detail polish.

## 5. Current Category Implementation

Backend model:

- `backend/services/models.py`
- `ServiceCategory` includes:
  - `name_ar`, `name_en`
  - `slug`
  - `description_ar`, `description_en`
  - `icon`
  - `color`
  - `image = ImageField(upload_to="service_categories/images/")`
  - `display_order`, `sort_order`
  - `parent`
  - `is_active`
  - `show_on_public_site`
  - soft delete fields inherited from `SoftDeleteModel`

Public category API:

- `backend/services/urls.py`
  - `/api/public-site/service-categories/`
  - `/api/public-site/service-categories/<slug>/services/`
- `ServiceCategorySerializer` includes read-only `image`.
- It does not expose a separate `image_url`; frontend defensively reads `category.image_url || category.image`.

Admin category API/form:

- API viewset: `CategoryAdminViewSet` in `backend/services/views.py`.
- Admin serializer: `AdminCategoryRuleSerializer` in `backend/services/serializers.py`.
- Admin UI pages:
  - `frontend/src/pages/shared/ServiceCategoryManagementPage.jsx`
  - `frontend/src/pages/admin/ServicesManagementPage.jsx` also contains category management modal state.
- Current admin category form does not include an image upload field.
- Current admin category serializer does not include `image`, so the existing model image is not controllable through this admin UI/API path.

Frontend category UI:

- `frontend/src/components/CategoryCard.jsx` uses `category.image_url || category.image` as a low-opacity background image.
- `frontend/src/pages/public/HomePage.jsx` uses dynamic category image when available, otherwise hardcoded matched fallback images from `/images/homepage/`.
- `frontend/src/pages/public/ServicesPage.jsx` renders featured categories through `CategoryCard`.
- `frontend/src/pages/public/ServiceCategoryPage.jsx` renders related categories through `CategoryCard`.

## 6. Current Service Implementation

Backend model:

- `backend/services/models.py`
- `Service` includes:
  - category and organization scope fields
  - `name_ar`, `name_en`
  - `slug`
  - `short_description_ar`, `short_description_en`
  - `description_ar`, `description_en`
  - `image = ImageField(upload_to="services/images/")`
  - `required_information_schema`
  - price fields and public price visibility flags
  - duration/delivery fields
  - terms and workflow flags
  - `is_online`, `is_featured`, `is_active`, `show_on_public_site`

Public service API:

- `backend/services/urls.py`
  - `/api/services/`
  - `/api/services/<slug>/`
- `ServiceListSerializer` does not include `image` or `image_url`.
- `ServiceDetailSerializer` extends the list serializer and also does not include service image.
- Related-service serializers also omit image.

Admin service API/form:

- API viewset: `ServiceAdminViewSet` in `backend/services/views.py`.
- Admin serializer: `AdminServiceRuleSerializer` in `backend/services/serializers.py`.
- Admin UI: `frontend/src/pages/admin/ServicesManagementPage.jsx`.
- Current admin service form does not include service image upload.
- `servicesApi.createAdminService` and `updateAdminService` send plain JSON payloads, not `FormData`.

Frontend service UI:

- `frontend/src/components/ServiceCard.jsx` is icon-led, not image-led.
- `frontend/src/pages/public/ServiceDetailsPage.jsx` has no service hero/media area.
- Service cards show category, duration, price, a generic trust note, and a CTA.
- Service detail repeats duration and price in main stats and again in the sticky summary.

## 7. Current Image/Media Architecture

Static frontend images:

- `frontend/public/images/homepage/`
  - `hero-property.jpg`
  - category fallback images
  - `custom-request.jpg`
- These are hardcoded in `HomePage.jsx` and used as fallback imagery.

Backend uploaded media:

- `MEDIA_URL = "/media/"`
- `MEDIA_ROOT = BASE_DIR / "media"`
- Default storage uses local filesystem unless `AWS_STORAGE_BUCKET_NAME` is set, then S3-compatible storage is used.
- `backend/config/urls.py` serves uploaded media through `re_path("^media/...")` for all environments.

Public site media already supported:

- `public_site.SiteTheme.logo`, `favicon`
- `public_site.PublicPageContent.hero_image`
- `public_site.Advertisement.image`
- Public-site serializers build absolute URLs through `build_media_url`.
- Admin public-site forms use multipart `FormData` via `frontend/src/api/publicSiteApi.js`.

Category/service media gap:

- Category and service models already have image fields.
- Category public serializer returns `image`, but admin serializer/form cannot upload it.
- Service serializers/forms do not expose or use the existing `Service.image`.
- Therefore "dynamic Category and Service images controlled by Admin" is partially model-backed but not fully API/UI-backed.

## 8. Current Responsive/Mobile Architecture

Public layout:

- Desktop nav appears at `min-[700px]`.
- Mobile nav uses a top-right menu button, inline expanded menu, and body overflow lock.
- Floating contact action is fixed at bottom-left.
- Header is sticky with `bg-white/95` and border.

Public pages:

- Responsive grids use Tailwind breakpoints such as `sm`, `md`, `lg`, `xl`.
- Many panels are stacked with `space-y-6`.
- Some horizontally scrolling controls exist:
  - service category filter chips in `ServicesPage.jsx`
  - service pills in `HomePage.jsx`
- Cards generally stack well, but nested cards can create visually heavy mobile pages.

Customer portal:

- `DashboardLayout` uses a mobile sidebar overlay and switches to sticky sidebar at `xl`.
- `DataTable` switches from table to card layout using `matchMedia('(min-width: 1024px)')`.
- Customer create-order uses a two-column sticky summary at `xl`, stacked below that.

Potential mobile concerns:

- `PublicLayout.jsx` breakpoint at `700px` is custom and can create crowded nav around tablet widths.
- Several CTAs use long Arabic labels inside fixed-height buttons.
- Many cards use fixed/min heights (`min-h-44`, `min-h-[14rem]`, `min-h-32`) that may create excessive vertical length on mobile.
- Fixed floating contact button may overlap content or sticky submit controls on mobile customer pages.
- Directional positioning classes (`right-*`, `left-*`) are used in search inputs and floating actions.

## 9. Current RTL/Localization Architecture

RTL implementation:

- `LanguageProvider` sets `document.documentElement.lang` and `document.documentElement.dir`.
- `PublicLayout` also sets `dir={direction}` on the public shell.
- `DataTable` sets `dir={direction}` around desktop table region.
- Core helpers are in `frontend/src/utils/i18n.js`.

Localization implementation:

- Locale dictionaries exist:
  - `frontend/src/locales/ar.json`
  - `frontend/src/locales/en.json`
- Many public pages also define local inline `copy` objects.
- Many customer pages have hardcoded Arabic copy and do not fully use `t(...)` or bilingual dictionaries.
- Service/category names and descriptions use localized field helpers in `frontend/src/utils/servicePresentation.js`.

RTL risks:

- Many components force `text-right` even in English views.
- Several controls use physical classes instead of logical direction-aware styling:
  - search icon `right-4`
  - loading icon `left-4`
  - floating contact action `left-5`
  - some `justify-end` contact rows
- Icons are not consistently mirrored:
  - `HomePage.jsx` handles hero CTA direction with `ArrowIcon`.
  - `PublicLinkButton` always appends `ArrowUpRight`.
  - Service/category cards use `ArrowUpRight`.
- RTL is mostly shell-level and utility-level, not fully component-system-level.

## 10. Visual Problems By Severity

### CRITICAL

- Service images are not exposed to public UI despite existing `Service.image` model field.
  - Affects `ServiceCard`, `ServiceDetailsPage`, public service API serializers, admin service form, and admin service API.
  - Blocks the approved "image-led Service cards" direction.
- Admin cannot manage Category or Service images from the relevant catalog admin forms.
  - Category model has `image`, but admin serializer/form omit it.
  - Service model has `image`, but admin serializer/form/public serializers omit it.
- Source contains workflow-sensitive customer request pages with many visual surfaces mixed directly into business logic.
  - Visual changes to `CustomerCreateOrderPage.jsx`, `CustomerOrderDetailsPage.jsx`, and `MissingDocumentsResponsePage.jsx` must preserve FormData keys, required-document mapping, redirects, allowed actions, and status gates.
- Public screenshot evidence shows legacy dark-blue homepage/services states in root screenshots.
  - If deployed output matches those screenshots rather than current source/final screenshots, the public site violates the approved light/premium direction immediately.

### HIGH

- Public service cards are metadata-heavy and box-in-box.
  - `ServiceCard.jsx` has header box, icon chip, category pill, two inner stat boxes, trust note box, and CTA.
  - This reduces marketplace polish and makes cards tall.
- `ServicesPage.jsx` nests `PublicCard` counters inside a bordered action block inside `PublicHero`, creating boxes inside boxes.
- `ServiceDetailsPage.jsx` repeats price and duration in overview stats, pricing detail strip, and sticky side summary.
- `HomePage.jsx` still contains hardcoded category image matching/fallback logic.
  - Dynamic category image is supported, but static category imagery remains tightly coupled to the page.
- Category images in `CategoryCard.jsx` are rendered as very low-opacity backgrounds.
  - This does not create a truly image-led marketplace card.
- Inconsistent radius scale across public/customer UI.
  - Public shared components use `radius-lg/xl`.
  - Customer dashboard pages frequently use `rounded-[2rem]`, `rounded-3xl`, and nested rounded panels.
- RTL/LTR implementation is inconsistent because many components force right alignment and physical icon positions.
- The footer is now light in source, but legacy screenshots show a large dark footer. Verify actual runtime before implementation.

### MEDIUM

- Too much gray/slate is used for secondary surfaces (`bg-slate-50`, `text-slate-*`) across public cards, tables, and detail panels.
- Card heights are inconsistent:
  - `CategoryCard` has `min-h-[14rem]`.
  - FAQ cards use `min-h-44`.
  - service detail stat cards use `min-h-32`.
  - service cards grow based on description and metadata.
- Image ratios are not centralized.
  - Home category sections use `min-h-48` image columns.
  - CategoryCard uses full-card background.
  - Service cards have no image ratio.
- Search UI is split between homepage custom combobox and `PublicSearchInput`.
  - This creates inconsistent behavior and styling between home and services pages.
- Button styling is duplicated in page files instead of consistently using `PublicButton`/`PublicLinkButton`.
- Public/auth pages are visually clean but still rely on boxed heroes and boxed panels, which can feel more admin-like than marketplace-like.
- Customer dashboard pages visually differ from the public pages and use larger radii/shadows.
- Floating contact action may conflict with mobile content and customer sticky submit actions.

### LOW

- `frontend/src/App.css` contains unused starter/demo CSS and tokens unrelated to Khalsni.
- `frontend/src/assets/vite.svg` and `frontend/src/assets/react.svg` remain in the repo.
- `frontend/README.md` is still Vite template text.
- Some component labels are inline/hardcoded rather than centralized localization keys.
- `PublicHero` always renders as a card-like box; acceptable for inner pages but less premium if overused.
- `PublicLoading` and empty states use card/border styles that add more repeated boxes.

## 11. Exact Files/Components Requiring Modification

Primary public/customer visual files:

- `frontend/src/index.css`
  - Public/customer tokens, component utility classes, radius/shadow/card normalization.
- `frontend/tailwind.config.js`
  - Tailwind color/radius/shadow token alignment.
- `frontend/src/layouts/PublicLayout.jsx`
  - Public navbar, mobile menu, footer, floating action, RTL-aware positioning.
- `frontend/src/components/public/PublicPage.jsx`
  - Public shell, hero, panel, card, buttons, inputs, loading/empty states.
- `frontend/src/components/CategoryCard.jsx`
  - Image-led category card ratio, hierarchy, hover, fallback handling.
- `frontend/src/components/ServiceCard.jsx`
  - Image-led service card, metadata simplification, height consistency.
- `frontend/src/pages/public/HomePage.jsx`
  - Home hero, search, category/service sections, hardcoded fallback visuals, special request block, mobile spacing.
- `frontend/src/pages/public/ServicesPage.jsx`
  - Search/filter area, category sections, result cards, summary block.
- `frontend/src/pages/public/ServiceCategoryPage.jsx`
  - Category hero/detail layout and related categories.
- `frontend/src/pages/public/ServiceDetailsPage.jsx`
  - Service hero image, summary hierarchy, duplicated metadata, sticky aside.
- `frontend/src/pages/public/AboutPage.jsx`
  - Box density and card hierarchy.
- `frontend/src/pages/public/FaqPage.jsx`
  - FAQ card heights and hierarchy.
- `frontend/src/pages/public/ContactPage.jsx`
  - Contact form/card balance and actual submission caveat.
- `frontend/src/pages/public/PrivacyPolicyPage.jsx`
  - Dense card/list presentation.
- `frontend/src/pages/public/LoginPage.jsx`
- `frontend/src/pages/public/RegisterPage.jsx`
- `frontend/src/pages/public/ForgotPasswordPage.jsx`
- `frontend/src/pages/public/ResetPasswordPage.jsx`
  - Auth-page polish while preserving redirects, next params, and form behavior.

Customer request-related visual files:

- `frontend/src/layouts/DashboardLayout.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/Topbar.jsx`
- `frontend/src/components/DataTable.jsx`
- `frontend/src/components/FileUploader.jsx`
- `frontend/src/components/ApplicationStepper.jsx`
- `frontend/src/components/PageHeader.jsx`
- `frontend/src/pages/customer/CustomerDashboardHome.jsx`
- `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`
- `frontend/src/pages/customer/MyOrdersPage.jsx`
- `frontend/src/pages/customer/CustomerOrderDetailsPage.jsx`
- `frontend/src/pages/customer/MissingDocumentsResponsePage.jsx`

Category/service image control files:

- `backend/services/models.py`
  - Existing image fields are present; avoid model changes unless migration/state proves fields are insufficient.
- `backend/services/serializers.py`
  - Add URL-safe image fields for public list/detail and writable admin image fields.
- `backend/services/views.py`
  - Add multipart parsers to service/category admin viewsets if image upload goes through those endpoints.
- `backend/services/urls.py`
  - Existing routes likely sufficient.
- `frontend/src/api/servicesApi.js`
  - Convert category/service create/update to `FormData` when image file is present.
- `frontend/src/pages/shared/ServiceCategoryManagementPage.jsx`
  - Add category image upload/preview control.
- `frontend/src/pages/admin/ServicesManagementPage.jsx`
  - Add service image upload/preview control and possibly category image if this page remains an alternate category editor.
- `frontend/src/components/publicSite/PublicSiteFormFields.jsx`
  - Reuse `ImageUploadField` if suitable.

Public-site media/theme files:

- `frontend/src/context/PublicSiteContext.jsx`
- `frontend/src/utils/publicSiteDefaults.js`
- `frontend/src/api/publicSiteApi.js`
- `backend/public_site/models.py`
- `backend/public_site/serializers.py`
- `backend/public_site/views.py`

Tests to update/add:

- `frontend/src/pages/public/ServicesPage.test.jsx`
- `frontend/src/pages/public/ServiceCategoryPage.test.jsx`
- `frontend/src/pages/public/ServiceDetailsPage.test.jsx`
- `frontend/src/pages/public/LoginPage.test.jsx`
- `frontend/src/pages/public/RegisterPage.test.jsx`
- `frontend/src/pages/public/CreateOrderPage.test.jsx`
- `frontend/src/pages/public/TrackOrderPage.test.jsx`
- `frontend/src/pages/customer/MyOrdersPage.test.jsx`
- `frontend/src/pages/customer/MissingDocumentsResponsePage.test.jsx`
- `frontend/src/pages/admin/ServicesManagementPage.test.jsx`
- `backend/services/tests.py`
- `backend/public_site/tests.py`
- `backend/orders/tests.py`
- `backend/orders/test_end_to_end.py`

## 12. Proposed Implementation Order

1. Establish public visual tokens and component rules.
   - Update `index.css`, `tailwind.config.js`, and `PublicPage.jsx`.
   - Keep existing route/component APIs stable.

2. Add safe image plumbing for catalog records.
   - Expose service/category image URLs in serializers.
   - Add admin upload support without changing category/service workflow fields.
   - Reuse existing media storage and validators where possible.

3. Polish public layout.
   - Navbar, mobile menu, footer, floating contact action.
   - Fix RTL/LTR physical positioning.

4. Polish public marketplace pages.
   - Home page first.
   - Services directory.
   - Category detail.
   - Service detail.
   - Search/filter presentation.

5. Polish public business/auth pages.
   - About, FAQ, Contact, Privacy.
   - Login/register/forgot/reset pages.
   - Preserve `next` redirects and auth flow.

6. Polish customer request pages.
   - Customer dashboard.
   - Create-order form.
   - My orders.
   - Order detail.
   - Missing-documents response.
   - Avoid behavior changes to FormData keys, allowed actions, and status gates.

7. Verify across desktop/mobile and Arabic/English.
   - Add/update automated tests.
   - Run manual browser smoke checks and capture screenshots.

## 13. Regression Risks

- Service request creation can break if `CustomerCreateOrderPage.jsx` FormData keys change:
  - `service`
  - `full_name`
  - `phone`
  - `national_id`
  - `city`
  - `notes`
  - `consent`
  - `document_types`
  - `documents`
- Missing-document upload can break if document type mapping or file field names change.
- Public `/create-order?service=ID` must continue redirecting to `/customer/orders/new?service=ID` after registration/login.
- Price visibility must continue respecting:
  - `show_total_price_public`
  - `show_government_fee_public`
  - `show_company_fee_public`
  - public price notes
  - partner/custom price logic in `_public_total_price`
- Service duration display must continue using `delivery_time` payloads and duration/date-range modes.
- Public APIs must continue hiding inactive, deleted, or non-public categories/services.
- Customer/provider/admin authorization must not be touched by visual changes.
- `DataTable` is shared by admin/employee/provider/customer screens; broad style changes can affect internal workflows.
- `StatusBadge` and `OrderTimeline` are shared across public tracking and internal portals; visual-only edits should not alter status interpretation.
- Adding multipart uploads to service/category admin APIs can accidentally change JSON update behavior if not handled carefully.
- RTL fixes can break English layout if physical classes are blindly swapped.
- Floating mobile actions can overlap with sticky submit areas on customer flows.

## 14. Tests That Must Be Run After Implementation

Frontend:

- `cd frontend && npm run lint`
- `cd frontend && npm test`
- Focused public/customer tests:
  - `npm test -- ServicesPage.test.jsx ServiceCategoryPage.test.jsx ServiceDetailsPage.test.jsx`
  - `npm test -- LoginPage.test.jsx RegisterPage.test.jsx CreateOrderPage.test.jsx TrackOrderPage.test.jsx`
  - `npm test -- MyOrdersPage.test.jsx MissingDocumentsResponsePage.test.jsx`
- Add tests for:
  - service/category image rendering fallbacks
  - RTL/LTR search icon and nav behavior
  - service price hidden/shown labels
  - service duration labels for duration and duration range
  - create-order redirect with `service` query param

Backend:

- `cd backend && python manage.py test services`
- `cd backend && python manage.py test public_site`
- `cd backend && python manage.py test orders`
- `cd backend && python manage.py test orders.test_end_to_end`
- Add/extend tests for:
  - public service list/detail returns service image URL when present
  - public category list returns category image URL when present
  - admin service/category image upload works with multipart
  - JSON-only service/category updates still work
  - public price visibility remains unchanged
  - public category/service hiding rules remain unchanged

Manual/browser checks:

- Desktop and mobile screenshots for:
  - `/`
  - `/services`
  - `/services?search=...`
  - `/services/category/:slug`
  - `/services/:slug`
  - `/track-order`
  - `/login`
  - `/register`
  - `/customer`
  - `/customer/orders/new`
  - `/customer/orders`
  - `/customer/orders/:id`
  - `/customer/orders/:id/missing-docs`
- Viewports:
  - 320px
  - 360px
  - 390px
  - 430px
  - 768px
  - 1440px
- Languages:
  - Arabic RTL
  - English LTR
- Interaction smoke:
  - public mobile menu open/close
  - homepage search suggestions
  - services filter chips
  - auth `next` redirect
  - customer order draft save
  - required document upload
  - missing document upload
  - public tracking form

