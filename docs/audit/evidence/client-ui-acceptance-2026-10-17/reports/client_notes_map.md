# Khalsni: map of client notes and requirements (read-only acceptance audit)

Date: 2026-10-17. Repo: `D:\ghassan` @ `main` (f396575, clean). No repository file was modified.
Scope: every requirement or note that came from the client (or was written for the client), **excluding** the 26 client-audit items F01–F06 / U01–U04 / D01–D06 / B01–B10, which another reviewer covers. Where a note here overlaps one of those items, the overlap is listed (see §3).

**Status labels.** Every "STATUS (code-inspection-only)" value comes from reading source code alone. Nothing was run at runtime in this pass.
- LIKELY-MET: code for the behaviour exists.
- PARTIAL: part of the behaviour exists.
- NOT-FOUND: no code was found.
- DATA-DEP: the result depends on the deployed catalogue or CMS data.
- SUPERSEDED: a later decision replaced the requirement.

The "RUNTIME CHECK" column says what has to be shown in the browser to prove the row: route · role · state · viewport · language.

Text was extracted from the binary documents with stdlib zip/XML parsing (docx) and `pdftotext` (pdf). The extracted copies are in `...\scratchpad\extract\` (outside the repo).

---

## 0. Key findings

1. **Two client note documents sit outside the repository, and no repo document cites them.** Both are in `D:\ghassam moblie\`:
   - `Khalsni_Developer_Final_Action_Notes_AR_v2.docx`, dated 2026-08-15. It has 14 numbered items, P0/P1.
   - `Khalsni_Visual_Design_Notes_20.docx`, dated 2026-08-30. It has 20 items.

   A grep of `docs/` finds no reference to either filename. Only `Khalsni_Website_Audit_AR.docx`, the source of F/U/D/B, is cited. Several features clearly come from these notes and are in the code: the slogan, «حالة طلبك الآن», search suggestions with a no-result special-request option, and service rails. They have never been traced formally. Rows CN-ACT-* and CN-VIS-* below are the first trace.
2. **The client resolves conflict C-VIS1 in writing.** CN-VIS-09 (2026-08-30) says not to use dark blue as a large background, and to stay Light/Premium. This post-dates the single dark-navy mockup `image/WhatsApp Image 2026-08-05…`. The mockup the client sent with that note (`D:\ghassam moblie\WhatsApp Image 2026-08-24…`) is light. `docs/audit/KHALSNI_VISUAL_CONFORMANCE_MATRIX.md` still lists C-VIS1 as "product confirmation recommended". That evidence should now be cited.
3. **The client's category list does not match the code or seed data.** CN-ACT-04 names 8 categories: Real estate, Business, Taxes & fees, Vehicles & transport, Labour & residency, Documents & attestations, International, Special request. None of «المركبات والنقل / الخدمات الدولية / العمالة والإقامة / الوثائق والتصديقات / الضرائب والرسوم» appears anywhere in the repo. The import (`docs/service-import/IMPORT-REPORT.md`) created 2 categories, and `seed_initial_data.py` seeds 7 different categories that predate this list. Whether the list is met depends on production data (DATA-DEP), and the code-level likelihood is low.
4. **Some client asks were superseded by owner decisions** in `docs/audit/KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md` (2026-10-16):
   - The «الدفع الآن» pay-now action (CN-ACT-10) and the payment channel / gateway asks in the proposals were superseded by **B05 = payment out of release**.
   - The external SMS/WhatsApp/Email notification asks (sitemap, system flow, daily ops) were superseded by **PRD constraint + B08 NOT_IN_RELEASE_SCOPE**.
   - "Provider identity / name in order" was superseded by **B06 = hidden from customers**.
5. **The client sitemap asks for a Terms & Conditions page («الشروط والأحكام»), and none exists.** There is no `/terms` route in `frontend/src/routes/AppRoutes.jsx`, and `PrivacyPolicyPage.jsx` contains no terms text. This was never recorded as out of scope.
6. **The TEAM_DECISION_LOG is still undecided.** All 15 rows of `docs/final_review/TEAM_DECISION_LOG.md` have an empty "Final Decision" column. The dossier confirms this. The code has an implicit answer for each row (see §2-J). None of these answers is a client-approved rule.
7. **Help and manual content is mixed-language.** Seeded `HelpGuide` rows are Arabic only, because the model has single-language fields. The fallback field guides (`backend/help_guides/fallbacks.py`) are English only. The mobile app is Arabic only. This conflicts with CN-ACT-13 ("Arabic fully Arabic, English fully English").

---

## 1. Client-originated source inventory

| # | Source (path) | Date | Origin | Nature | Cited in repo docs? |
|---|---|---|---|---|---|
| S1 | `D:\ghassam moblie\Khalsni_Developer_Final_Action_Notes_AR_v2.docx` (+ `WhatsApp Image 2026-08-14 at 11.43.14 PM.jpeg`) | 2026-08-15 | Client | 14 finishing/handover actions, P0/P1 | **No** |
| S2 | `D:\ghassam moblie\Khalsni_Visual_Design_Notes_20.docx` (+ `WhatsApp Image 2026-08-24 at 12.38.54 PM.jpeg`) | 2026-08-30 | Client | 20 visual-polish notes for the customer UI | **No** (only indirectly, as the "2026-08-30" findings in the visual matrix) |
| S3 | `D:\ghassam moblie\Khalsni_Website_Audit_AR.docx` + `Khalsni_Audit_Evidence(.zip)` | 2026-10-01 | Client | F/U/D/B audit (26 items). **Out of scope here** | Yes |
| S4 | `D:\ghassam moblie\servese\*.docx` (22 files: `Khalsni_Business_Services_Fields_and_Documents_Final.docx` + 21 real-estate service sheets `خدمة_NN_…`) | ~2026-06-29 | Client | Field/document/question specification per service | Yes (`docs/service-import/*`, `data/service-import/normalized-services.json`) |
| S5 | `Khalasni_SiteMap_Explanation_AR.pdf` (repo root) | 2026-04 | Client | Sitemap: public, customer, admin, provider, notifications, workflow | Partly (B7 user-guide set) |
| S6 | `khalesni_system_flow.pdf` (repo root) | 2026-04 | Client | Customer, order, admin and provider journeys; related services; notifications | No |
| S7 | `Khalasni_Daily_Operations_AR.pdf` (repo root) | 2026-04 | Client | Daily operating plan, statuses, roles, reports | No |
| S8 | `Khalasni_Detailed_Services_AR.pdf` (repo root) | 2026-04 | Client | Original 31-service catalogue in 8 groups, including special request | Named as import source in Source-of-Truth B9 (the import actually used S4) |
| S9 | `Khalasni_Service_Ordering_Website_Proposal.docx/.pdf` | 2026-04 | Developer → client | Website proposal (scope, success criteria) | No |
| S10 | `Khalasni_Mobile_App_Proposal.docx/.pdf` | 2026-04 | Developer → client | Customer mobile app proposal | No |
| S11 | `Khalasni_Production_Modules_Architecture.docx` | 2026-04 | Developer blueprint | 30-module aspirational architecture | No |
| S12 | `docs/PRD.md` | 2026-04-24 | Baseline spec | Goal, MVP scope, 5 journeys, metrics, constraints | Yes |
| S13 | `docs/SRS.md` | 2026-05-11 (FR2 edited in Gate 2) | Baseline spec | FR1–10, NFR1–6, BR1–8 | Yes |
| S14 | `khalisni_service_catalog_enhancement_codex_prompt.md` (A1) | 2026-06-29 | Owner prompt | Catalog / doc definitions / price visibility / delivery / soft delete / simplification | Yes |
| S15 | `khalisni_soft_delete_ui_fix_prompt.md` (A2) | 2026-06-30 | Owner prompt | Visible Delete/Restore UX | Yes |
| S16 | `docs/fixes/KHALSNI_FORCED_VISUAL_UI_OVERHAUL_PROMPT.md`, `KHALSNI_PUBLIC_HOMEPAGE_FORCED_REDESIGN_PROMPT.md`, `KHALSNI_UI_TRANSFORMATION_IMPLEMENTATION_PROMPT.md`, `KHALSNI_SAAS_UIUX_PROMPT_PACK/00–03` (A4) | 2026-07-26/27 | Owner prompts | Visual language, homepage, wizard, portal, admin UX | Yes |
| S17 | `docs/final_review/TEAM_DECISION_LOG.md` | 2026-05 | Team/owner | 15 business-rule decisions (all blank) | Yes |
| S18 | `docs/audit/KHALSNI_OWNER_DECISION_DOSSIER.md` → `KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md` | 2026-10-16 | Owner decisions | Decided: B05, F04, B04, B06, D02, B10-1/2/3/4/7, phone. Open: D05, D06, B10-8/9/10, brand | Yes |
| S19 | `docs/audit/KHALSNI_CLIENT_DECISIONS_REQUIRED.md` | 2026-10-04 | Pending client decisions | B10-1..8 | Yes |
| S20 | `docs/b2b2c_architecture.md` (A3), `docs/service_categories.md`, `docs/service_dependency_rules.md` (B3) | 2026-05-16 | Architecture | Tenancy, relations | Yes (traceability §F/§G) |
| S21 | Superseded UI specs: `khalasni_design_system.html` (2026-05-11), `khalsni_ui_screen_standardization.xlsx` (2026-05-04), `permission_matrix.xlsx`, `production_permission_matrix.xlsx`, `khalsni_system_build_steps_checklist*.xlsx`, `khalasni_project_audit_2026-05-05.xlsx` | 2026-05 | Early specs | Tokens, screens, permissions | Source-of-Truth says the UI ones are superseded by A4 |
| S22 | Root test/audit prompts: `khalsni_full_system_audit_test_enhancement_prompt.md`, `khalsni_full_system_test_enhancement_prompt.md`, `khalsni_services_platform_full_test_enhancement_prompt.md` (2026-06-08) | 2026-06-08 | Owner prompts | Process (audit/test/manual validation). The only product intent is "guide/manual must match the system" (see HELP rows) | — |

---

## 2. Requirement table

Column key:
- SUP = superseded? If yes, the cell gives "superseded by → why → final rule".
- Paths were verified to exist at HEAD.

### A. Developer Final Action Notes v2 (S1, 2026-08-15)

| REQ ID | SOURCE | ORIGINAL CLIENT INTENT | IMPLEMENTED AREA (verified paths) | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| CN-ACT-01 [P0] | S1 §1 | Do not rebuild. Keep the backend, portal, workflow and forms, and improve the UI on top | Whole repo; `backend/workflow/rules.py` kept | No | LIKELY-MET (same domain apps; UI-only passes) | n/a (process) |
| CN-ACT-02 [P0] | S1 §2 | One Khalsni identity everywhere: Light & Clean, white dominant, Khalsni blue for CTAs, limited navy, soft borders and shadows, uniform radius/icons/buttons, Apple-like simplicity, never dark | `frontend/src/index.css` tokens, `frontend/src/layouts/PublicLayout.jsx`, `DashboardLayout.jsx`, `components/public/PublicPage.jsx` | No | LIKELY-MET public; PARTIAL staff (visual matrix: radius/shadow mismatch between public and customer) | `/`, `/services`, `/customer`, `/admin` · each role · 1440 + 390 · AR: compare tokens, no dark large areas |
| CN-ACT-03 [P0] | S1 §3 | Simple homepage order: Hero + search → categories/services → short "how it works" → special request/help → footer. No duplicate sections | `frontend/src/pages/public/HomePage.jsx` (hero, rails, category rows, `#special-request`), CMS `HomepageContentEditorPage.jsx` | No | LIKELY-MET (verify no duplicate CMS sections) | `/` · anon · published CMS · 1440/390 · AR+EN: section order and no repeats |
| CN-ACT-04 [P1] | S1 §4 | Categories as "service worlds": panoramic image + light Khalsni overlay + slider of that category's services. **Keep the 8 categories**: العقارات والأراضي، خدمات الأعمال، الضرائب والرسوم، المركبات والنقل، العمالة والإقامة، الوثائق والتصديقات، الخدمات الدولية، طلب خاص | `HomePage.jsx` `categoryRows` + `components/ServiceRail.jsx`, `CategoryCard.jsx`; `ServiceCategory.image` (`backend/services/models.py:42`) | No | Presentation PARTIAL (rows show 6 services each; panoramic overlay not confirmed). **Category set: DATA-DEP / likely NOT met.** 5 of the 8 names do not exist in the repo; the import created 2 categories; the seed has 7 legacy ones | `/` and `/services` · anon · production catalogue · AR: count the categories and match the names |
| CN-ACT-05 [P0] | S1 §5 | Hero search really searches service and category names, shows live suggestions, and offers "طلب خدمة غير موجودة / طلب خاص" when nothing matches | `HomePage.jsx` (`suggestions`, `noResults` «طلب خدمة غير موجودة»), `ServicesPage.jsx` | No. Overlaps U02 | LIKELY-MET | `/` · anon · type a known name, then gibberish · 390 + 1440 · AR+EN: suggestions, keyboard navigation, no-result CTA goes to the missing-service form |
| CN-ACT-06 [P1] | S1 §6 | A light service intro page before the form: name, short description, required docs, expected duration, price or how it is calculated, «ابدأ الطلب» | `pages/public/ServiceDetailsPage.jsx` («ابدأ الطلب»), `ServiceDurationDisplay.jsx`, `ServicePriceDisplay.jsx` | No. Overlaps D01/D02 | LIKELY-MET | `/services/:slug` · anon · service with hidden price · 390 · AR: all 5 elements present, CTA visible |
| CN-ACT-07 [P0] | S1 §7 | Improve "New request" without rebuilding it: fewer boxes, more spacing, clearer stepper, one primary CTA. **Arriving from a service must not re-ask category/service** | `pages/customer/CustomerCreateOrderPage.jsx` (`startedFromService`, `get('service')`), `components/ApplicationStepper.jsx`, `pages/public/CreateOrderPage.jsx` | No | LIKELY-MET | `/customer/orders/new?service=<slug>` · customer · new draft · 390 · AR: step 0 skipped, one primary button per step |
| CN-ACT-08 [P0] | S1 §8 | Clear upload on mobile and desktop: per-file status, **preview, replace, delete**. Before submit, a summary of data, docs, price and duration, with edit per section | `components/FileUploader.jsx` (remove), `CustomerCreateOrderPage.jsx` (review step, `edit` labels, `setStep`) | No | PARTIAL: status/remove and review-with-edit found. **No preview or explicit replace action found in `FileUploader.jsx`** | `/customer/orders/new` · customer · 2 docs uploaded · 390 (real device: B09) · AR: preview, replace, delete each file; edit from review |
| CN-ACT-09 [P0] | S1 §9 | Order detail: «حالة طلبك الآن» + timeline as the main visual element (received → docs reviewed → in progress → completed/ready) | `pages/customer/CustomerOrderDetailsPage.jsx:166`, `components/OrderTimeline.jsx`, `StatusBadge.jsx` | No | LIKELY-MET | `/customer/orders/:id` · customer · states NEW, WAITING_CUSTOMER, IN_PROGRESS, COMPLETED · 390 · AR+EN: status above the fold |
| CN-ACT-10 [P0] | S1 §10 | Show any required customer action (document / **payment** / information) with a direct button («رفع الوثيقة» / «الدفع الآن»). Always make clear whether the ball is with Khalsni or the customer | `CustomerOrderDetailsPage.jsx` (responsibilityTitle/Text), `CustomerDashboardHome.jsx`, `TrackOrderPage.jsx`, `MissingDocumentsResponsePage.jsx` | **Partly.** Payment part superseded by → B05 owner decision (2026-10-16) → online payment not approved → no customer payment action in this release | Document/info: LIKELY-MET. Payment: NOT-FOUND (expected, per B05) | `/customer/orders/:id` · customer · WAITING_CUSTOMER with a missing doc · 390 · AR: banner + «رفع الوثيقة» goes to the missing-docs page; the "with Khalsni" label shows in other states |
| CN-ACT-11 [P1] | S1 §11 | Same typography, colours, buttons, cards, icons, spacing, header and logo across the public site and the customer portal | `PublicLayout.jsx`, `DashboardLayout.jsx`, `components/brand/KhalsniLogo.jsx` | No | PARTIAL (visual matrix notes larger radii/shadows in the portal) | `/` vs `/customer` · customer · 1440 + 390 · AR: side-by-side comparison |
| CN-ACT-12 [P0] | S1 §12 | Admin can add/edit/hide/reorder categories and services, change price, duration, docs and fields, and **move a service between categories** without code | `pages/admin/ServicesManagementPage.jsx` (`sort_order`, category select, `required_information_schema`), `pages/shared/ServiceCategoryManagementPage.jsx`, `AdminRuleManagementPage.jsx` (doc rules) | No | LIKELY-MET | `/admin/services`, `/admin/service-categories` · admin · edit a service's category, price, duration and fields, then reorder · 1440 · AR: change reflected on `/services` |
| CN-ACT-13 [P0] | S1 §13 | Arabic fully Arabic and English fully English, no mixing in menus or fields. Correct RTL/LTR. AR+EN name and description for every service and category | `components/LanguageSwitcher.jsx`, locale dictionaries, `services` `name_ar/name_en`, `services/management/commands/audit_public_catalog_locale.py` | No. Overlaps D03 | PARTIAL: public catalogue audited (D03). **Help guides are Arabic-only and fallback field guides English-only. The mobile app is Arabic-only. Staff free text keeps the language it was written in** | Every public and portal route · each role · EN mode · 1440: no Arabic leaks; AR mode: no English leaks (incl. `/customer/manual`, help panel) |
| CN-ACT-14 [P0] | S1 §14 | Test the whole journey on a real phone: Home → Search/Category → Service → Start → Data → Upload → Review → Submit → My Orders → Tracking (fonts, dropdowns, upload, RTL, sticky) | `frontend/e2e/*.spec.js` (Chromium emulation only) | No. Overlaps **B09** (BLOCKED_EXTERNAL) | NOT met as written (no real device) | Full journey · customer · real iOS Safari + Android Chrome · AR |

### B. Visual Design Notes, 20 items (S2, 2026-08-30), customer UI only, "visual polish only"

| REQ ID | SOURCE | ORIGINAL CLIENT INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| CN-VIS-01 | S2 §1 | Keep structure and workflow. Visual change only | — | No | LIKELY-MET | n/a |
| CN-VIS-02 | S2 §2 | Stronger identity: white/off-white ground, Khalsni blues for key elements, light navy text, less grey and heavy feel | `frontend/src/index.css` (`--khalsni-public-*`) | No | PARTIAL (D-A11Y-1 grey label contrast was flagged in Gate 1R) | `/` · anon · 1440 · AR: background and text colours |
| CN-VIS-03 | S2 §3 | Use **only the original logo**: «خلّصني» + blue tick, same shape and proportions, no redraw | `components/brand/KhalsniLogo.jsx`, `frontend/public/brand/khalsni-wordmark.png`, `khalsni-app-icon*.png`; `SiteTheme.logo` override | No. Brand spelling overlaps **D04** and the open owner "Brand/domain" decision (UI uses خلصني, catalogue خلّصني) | LIKELY-MET for the asset; the spelling decision is open | Header/footer every public page + portal · 390/1440: logo not stretched; matches `D:\ghassam moblie\WhatsApp Image 2026-09-06*.jpeg` |
| CN-VIS-04 | S2 §4 | Simple, strong hero. **Approved slogan «ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.»**, a very short description, clear search, one CTA | `pages/public/HomePage.jsx` (slogan string present) | No | LIKELY-MET (unless CMS overrides it, see F06) | `/` · anon · published CMS · 390/1440 · AR: exact slogan text |
| CN-VIS-05 | S2 §5 | Category cards show a clear image | `components/CategoryCard.jsx`, `ServiceCategory.image` | No | LIKELY-MET (DATA-DEP on uploaded images) | `/` · anon · categories with and without image · 1440 |
| CN-VIS-06 | S2 §6 | Admin can upload or change an image per category and per service, without code. Optional, with a default card fallback | `ServiceCategory.image` / `Service.image` (`backend/services/models.py:42,214`); upload in `ServiceCategoryManagementPage.jsx`, `ServicesManagementPage.jsx`; `services/management/commands/seed_catalog_images.py` | No | LIKELY-MET (traceability UI6 PASS) | `/admin/service-categories` · admin · upload, then remove the image · then `/` anon: image, then fallback |
| CN-VIS-07 | S2 §7 | Service cards show an image while keeping name, duration, price/pricing method and CTA uncluttered | `components/ServiceCard.jsx` | No | LIKELY-MET | `/services` · anon · 390 · AR |
| CN-VIS-08 | S2 §8 | Browse as successive rows with sliders/cards (Apple/Netflix ease, in Khalsni identity) | `components/ServiceRail.jsx` (snap-x), `HomePage.jsx` rails + category rows | No | LIKELY-MET | `/` · anon · 1440 (arrows) + 390 (swipe) |
| CN-VIS-09 | S2 §9 | **No dark blue as a large background.** Rely on images, white and blue accents (Light/Premium) | `index.css`, `PublicLayout.jsx` (light footer) | **Resolves C-VIS1** in favour of LIGHT (newer, written client note > undated 2026-08-05 dark mockup) | LIKELY-MET | `/`, `/track-order` · anon · 1440: no large navy blocks |
| CN-VIS-10 | S2 §10 | Fewer boxes inside boxes. Must not look like a dashboard or transactions portal | Public pages | No | PARTIAL (visual matrix: "box-in-box counters inside hero" on `/services` still open at Gate 1R) | `/services`, `/login` · anon · 1440 |
| CN-VIS-11 | S2 §11 | Uniform card radius, shadow, padding, image aspect ratio and info/CTA placement across category and service cards | `CategoryCard.jsx`, `ServiceCard.jsx`, `ServiceRail.jsx` | No | LIKELY-MET | `/`, `/services`, `/services/category/:slug` · 1440/390 |
| CN-VIS-12 | S2 §12 | Clear visual hierarchy (section title → content → next section), not equal weight everywhere | Public pages | No | LIKELY-MET (judgement) | Visual review `/` 1440 |
| CN-VIS-13 | S2 §13 | Important/newest service cards are more attractive (image, name, duration, price, CTA), with less small secondary text | `HomePage.jsx` featured `ServiceRailItem size="featured"` | No | LIKELY-MET | `/` · anon · 1440/390 |
| CN-VIS-14 | S2 §14 | "How Khalsni works" stays light inside the page flow (4 short steps), not a big separate box | `HomePage.jsx` («كيف تعمل»), CMS `HomepageContentEditorPage.jsx` | No | LIKELY-MET (check styling) | `/` · anon · 1440/390 · AR |
| CN-VIS-15 | S2 §15 | Reduce excess vertical spacing so the page is shorter and faster to scan | `HomePage.jsx` (`py-8 sm:py-11`, etc.) | No | LIKELY-MET (judgement) | Measure page height at 390/1440 |
| CN-VIS-16 | S2 §16 | Light, clear navbar: logo, essentials, account/login CTA, no clutter or duplication | `PublicLayout.jsx` | No. Overlaps U01 (staff mobile header) only loosely | LIKELY-MET | Public header · anon and logged-in customer · 390/1440 |
| CN-VIS-17 | S2 §17 | Mobile is its own experience: horizontal swipe for cards, right-sized images, shorter text | `ServiceRail.jsx`, `PublicPage.jsx` (snap-x) | No | LIKELY-MET (emulated only) | `/` · anon · real phone 390/430 |
| CN-VIS-18 | S2 §18 | Unified art direction: clean, realistic, consistent images per category and service, optional light blue overlay | `frontend/public/images/khalsni/*` (22 files), `seed_catalog_images.py`, `docs/BRANDING_AND_SERVICE_IMAGES.md` | No | DATA-DEP / PARTIAL | `/` · anon · production catalogue: every category has a consistent image |
| CN-VIS-19 | S2 §19 | Subtle desktop hover (slight lift or image zoom), no heavy animation | `ServiceRail.jsx`/`HomePage.jsx` (`hover:-translate`/`scale`), `index.css` `prefers-reduced-motion` | No | LIKELY-MET | `/` · 1440 · hover a card; reduced-motion OS setting |
| CN-VIS-20 | S2 §20 | Overall impression: a modern, easy, premium services platform, not a government portal or dashboard | — | No | Judgement only | Client walk-through |

### C. Client sitemap, system flow, daily operations, detailed services (S5–S8)

| REQ ID | SOURCE | ORIGINAL CLIENT INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| CN-MAP-01 | S5 §1 | Public pages: home (top services + offers), all services by category, single service (description, docs, cost, expected duration), order form, missing-service request, about, contact, tracking, FAQ, **privacy + terms** | Routes `/`, `/services`, `/services/category/:slug`, `/services/:slug`, `/create-order`, `/track-order`, `/about`, `/contact`, `/faq`, `/privacy`; `public_site.MissingServiceRequest`; offers via `public_site.Advertisement` | Privacy text overlaps **D06** | All LIKELY-MET **except Terms & Conditions: NOT-FOUND** (no route, no CMS page) | Visit each route · anon · AR+EN · 390; search for a terms link in the footer |
| CN-MAP-02 | S5 §2 | Customer dashboard: all current/past orders, stage tracking, upload extra files and receive final files, **message support**, edit account | `/customer`, `/customer/orders`, `/customer/orders/:id`, `/customer/orders/:id/missing-docs`, `/customer/profile`; final download `documents` | No | PARTIAL: everything except a customer → support messaging channel (no ticket/chat model; the UI-transformation prompt §20 itself says to use an "Updates" panel instead of fake chat). `/contact` + `ContactInquiry` is the nearest substitute | `/customer/orders/:id` · customer · COMPLETED with final doc · download; look for a message-support entry point |
| CN-MAP-03 | S5 §3 | Admin: daily KPIs dashboard, order management (assign, change status, close), customers, services and prices, **providers and their rating**, notifications (Email/SMS/WhatsApp), finance and payments | `/admin`, `/admin/orders(/:id)`, `/admin/users`, `/admin/services`, `/admin/providers`, `/admin/notifications`, `/admin/payments`; `ProviderProfile.rating` | External channels superseded by → PRD MVP constraint + B08 NOT_IN_RELEASE_SCOPE → in-system notifications only | LIKELY-MET (in-system); external channels intentionally absent | `/admin/*` · admin · 1440 · AR |
| CN-MAP-04 | S5 §4 | Provider panel (accountant, surveyor, clearance staff): assigned orders, status update, final docs, **own rating, earnings and reports** | `/provider`, `/provider/orders(/:id)`; `payment.ProviderPayout`/`CommissionRule` models (`backend/payment/models.py:299,325`) | No | PARTIAL: orders/status/final doc yes. Provider-facing earnings/rating view not confirmed (no provider earnings route) | `/provider` · provider · 1440/390: look for rating/earnings |
| CN-MAP-05 | S5 §5, S6 §6, S7 §1 | Notifications: customer on status change, provider on new assignment, supervisor on late or problem orders. Channels SMS/WhatsApp/Email | `backend/notifications/event_map.py`, `services.py`; in-app bell `components/NotificationPanel.jsx` | Channels superseded (PRD constraint; B08). Overlaps F01 | In-system: LIKELY-MET. **Late-order supervisor alert: NOT confirmed** (only report-level handling) | Trigger assign/status · provider, customer · bell shows the event; leave an order overdue: is an admin alert raised? |
| CN-MAP-06 | S5 §6, S7 §5, S6 §2 | 10-step workflow: submit → order number → reception review → ops assigns provider → execute → status update → deliver → close → **rate** → **archive** | `backend/workflow/rules.py` (11 statuses incl. WAITING_GOVERNMENT, READY_FOR_DELIVERY, ARCHIVED), `orders/services.py`, `CustomerOrderRatingAPIView` | No | LIKELY-MET | J01–J20 journey with an archive step · admin |
| CN-FLOW-01 | S6 §1 | Customer journey: browse → read requirements/cost/duration → form → upload → submit → confirmation notice → track → completion notice | Public + customer routes; `notifications` | No | LIKELY-MET (in-system notice) | Full journey · customer · AR · 390 |
| CN-FLOW-02 | S6 §3–4 | Admin and provider flows (view docs, assign, status, notify; provider downloads docs, executes, notes to admin, informs completion) | `EmployeeOrderReviewPage.jsx`, `AdminOrderDetailsPage.jsx`, `ProviderOrderDetailsPage.jsx` | No. Overlaps B01 | LIKELY-MET | Provider receipt → progress → final · provider/admin |
| CN-FLOW-03 | S6 §5 | After completion, suggest related services, configured from the admin panel | `backend/services/order_completion.py`, `service_relations.py`, `/admin/service-relations` (SR1–SR4) | No | LIKELY-MET (SR4 PARTIAL in traceability) | Complete an order whose service has a "recommended" relation · customer bell shows the suggestion, no duplicate |
| CN-OPS-01 | S7 §1–2 | Review data completeness, image clarity, match to service; request missing docs | `EmployeeVerifyDocumentsPage.jsx`, missing-document flow | No. Overlaps F02–F04 | LIKELY-MET | `/employee/documents/verify` · employee |
| CN-OPS-02 | S7 §3 | Assign the right provider, set execution time, record provider name on the order | `assign_provider_to_order` (`orders/services.py:493`) | Provider name **to the customer** superseded by → B06 (hidden). Internal record remains | LIKELY-MET internally | `/employee/orders/:id` · employee · assign |
| CN-OPS-03 | S7 §4 | Provider reports each step (submitted / awaiting approval / **paid** / ready) | Provider status actions; WAITING_GOVERNMENT, READY_FOR_DELIVERY | "Paid" step not a status (B05) | PARTIAL | `/provider/orders/:id` · provider · step through |
| CN-OPS-04 | S7 §5 | Statuses: new, under review, waiting customer, in progress, done, **rejected with reason** | `core/choices.py` OrderStatus; BR3 reason required | No | LIKELY-MET | Reject an order · employee · reason mandatory |
| CN-OPS-05 | S7 §6 | Delivery: PDF or tracking link if electronic; courier or partner office if paper; thank-you + rating request | Final document upload/download, rating | Courier/partner-office logistics not in scope (not documented as out of scope) | PARTIAL (electronic yes; paper logistics NOT-FOUND) | COMPLETED order · customer · download + rating prompt |
| CN-OPS-06 | S7 §7 | Daily: archive completed, review late orders, daily order-count report, complaints. Weekly: provider performance, top services, suggested services, weekly revenue | `reports/urls.py` (`admin/reports/daily/`, `weekly/`, `reports/summary/`), `average_completion_time_hours`; `MissingServiceRequest` ≈ suggested services | No | PARTIAL (no complaints module; provider performance/revenue depth unverified) | `/admin/reports` · admin · daily + weekly tabs, export |
| CN-OPS-07 | S7 roles | Roles: reception, operations, providers, technical support | `core/choices.UserRole` (customer/employee/support/provider/admin) + B2B2C memberships | No | LIKELY-MET (mapped as employee/admin/support) | Role login matrix |
| CN-SVC-01 | S8 | Original 31-service catalogue in 8 groups (passports/civil, social security, tax, labour, Amman/municipal, real estate/survey, quick public services, **special request**) | `seed_initial_data.py` (7 categories, 7 sample services); real catalogue from S4 import | **Superseded in practice** by S4 service sheets (2026-06-29) and CN-ACT-04 category list (2026-08-15). Not formally recorded | DATA-DEP | `/services` · anon · production catalogue vs client list |
| CN-SVC-02 | S8 §31 | Special request: ask for any unlisted service; the team replies with feasibility, cost and duration | `public_site.MissingServiceRequest` (`backend/public_site/models.py:241`), `/employee/missing-service-requests`, `/admin/missing-service-requests`, `pages/shared/MissingServiceRequestsPage.jsx` | No | LIKELY-MET | `/` "special request" CTA → submit · anon; staff sees it, changes status |

### D. Business service field/document specification (S4, plus `docs/service-import/DEVELOPER-NOTES-MAPPING.md`)

| REQ ID | SOURCE | ORIGINAL CLIENT INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| CN-BIZ-00 | S4 (22 docx) | Import 30 service definitions (9 business + 21 real estate, 27 canonical) with fields, documents, dynamic questions and descriptions | `backend/services/service_import.py`, `management/commands/import_production_services.py`, `data/service-import/normalized-services.json`; reports `docs/service-import/IMPORT-REPORT.md` (311 fields, 137 docs, 79 questions) | Duplicates merged (`SOURCE-CONFLICT-REPORT.md`, 3 merges) | LIKELY-MET in import (DATA-DEP for production) | `/services` · anon · count 27 imported services; open 3 samples vs source docx |
| CN-BIZ-01 | Dev note, company registration | Repeater fields (e.g. multiple partners) | Imported as textarea/metadata | No | **NOT-FOUND (documented platform gap: no repeater/group field)** | `/customer/orders/new?service=business_company_registration` · customer |
| CN-BIZ-02 | Dev note, ownership transfer | Admin-configurable dynamic questions (seller/buyer in Jordan? legal power of attorney?), extensible without code | `Service.required_information_schema` + editor in `ServicesManagementPage.jsx`; `visible_when` conditional (`frontend/src/utils/serviceForms.js`, `components/DynamicServiceFields.jsx`, `mobile/src/utils/serviceForms.ts`) | Overlaps B10-1/2/3 (conditional gate implemented for parcel/basin) | LIKELY-MET (questions editable); conditional docs NOT (no condition engine for documents) | `/admin/services` · admin · add question; then `/customer/orders/new` |
| CN-BIZ-03 | Dev note, subdivision | Fields, docs and questions editable from admin | As CN-BIZ-02 + `AdminRuleManagementPage.jsx` | No | LIKELY-MET | as above |
| CN-BIZ-04 | Dev note, consolidation | Plot-number fields addable dynamically (more than 2 plots) | — | Overlaps B10-2 | **NOT-FOUND (no repeater)** | consolidation service form · customer |
| CN-BIZ-05 | Dev note, boundary demarcation | Notes or location coordinates for the provider; attach site photos | Dynamic fields + optional docs | No | PARTIAL (free-text yes; coordinates/map picker NOT-FOUND) | boundary service form |
| CN-BIZ-06 | Dev note, zoning certificate | Keep "قيد المراجعة" until approved or merged with the zoning-plan service | Import marks 1 service under review/inactive | No | LIKELY-MET (service hidden) | `/services` anon: not listed; `/admin/services`: inactive |
| CN-BIZ-07 | Dev note, mortgage | Mortgagee data, mortgage value, financing documents | Dynamic fields/docs | No | LIKELY-MET (DATA-DEP) | mortgage service form |
| CN-BIZ-08 | Dev note, mortgage release | Upload release letter, record approval issue date | Dynamic fields (date) + doc | No | LIKELY-MET (DATA-DEP) | release service form |
| CN-BIZ-09 | Dev note, building permit | Upload engineering drawings / **large files**; link engineering office; track approval stages | `max_file_size` default 10 MB (`services/models.py:507`), `FILE_UPLOAD_MAX_SIZE` 10 MB (`config/settings.py:359`) | No | PARTIAL (large files capped at 10 MB unless configured; engineering-office link / approval sub-stages NOT-FOUND) | Upload a 25 MB PDF on the building-permit form |
| CN-BIZ-10 | S4 / IMPORT-PLAN §5 | Prices unknown in source → kept non-public `quotation` | `price_type=quotation`, `show_total_price_public=False` | Overlaps D02, B10-8/10 (pricing model undecided) | LIKELY-MET | `/services/:slug` · anon: no fake price, wording approved per D02 |
| CN-BIZ-11 | S4 / IMPORT-PLAN §6 | Conditional ("if applicable") documents | Imported as optional with source instruction | Overlaps B10-3 | PARTIAL by design | order create without a conditional doc succeeds |

### E. Developer proposals delivered to the client (S9–S11)

| REQ ID | SOURCE | ORIGINAL INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| PROP-WEB-01 | S9 §5 | Django Templates + Django Admin as the UI | React SPA `frontend/`, DRF | **Superseded** by → actual architecture (React 19 + DRF, A1 §0 / Source-of-Truth §4) → richer portal → React SPA is the product UI | SUPERSEDED | n/a |
| PROP-WEB-02 | S9 §4.2 | Admin service management: categories, name/description/**image**/price, enable/disable, order, public visibility | `ServicesManagementPage.jsx`, `ServiceCategoryManagementPage.jsx` | No | LIKELY-MET | `/admin/services` · admin |
| PROP-WEB-03 | S9 §4.4 | Admin order mgmt: review, status, internal notes, search/filter. Statuses New/Confirmed/In Progress/Completed/Cancelled | `OrdersManagementPage.jsx`, `OrderNote.visibility` | Status set superseded by → `workflow/rules.py` 11-status machine (PHASE_1–5 specs) | LIKELY-MET | `/admin/orders` · admin · filter by status |
| PROP-WEB-04 | S9 §4.5 | Manual payment tracking: amount, method (Cash/CliQ/Bank/Card/Other), status (Pending/Paid/Partial/Failed/Refunded), reference, receipt, filters | `backend/payment/*`, `/admin/payments` `PaymentsManagementPage.jsx` | Admin manual ledger kept by B05; customer payment create removed | LIKELY-MET (admin) | `/admin/payments` · admin · create, change status |
| PROP-WEB-05 | S9 §4.6 | Reports: daily/monthly orders, by status/service, paid/pending, by method, revenue, service performance, **CSV/Excel export** | `backend/reports/*`, `ReportsPage.jsx`, `EmployeeReportsPage.jsx` | No | PARTIAL (daily/weekly/summary; monthly and payment-method reports not confirmed; export UI text found, unverified) | `/admin/reports` · admin · try export |
| PROP-WEB-06 | S9 §4.7 | CMS: site name, phone, **WhatsApp**, email, address, social links, banner, static content | `public_site.SiteTheme`, `PublicPageContent`, `Advertisement`; `/admin/public-site/*`, `/admin/cms` | Contact values overlap **D05** (CLIENT_INPUT_REQUIRED). WhatsApp rendering was removed with the dead component (owner report §11-D) | PARTIAL | `/admin/public-site/content` · admin · set WhatsApp/social links → footer shows them? |
| PROP-WEB-07 | S9 §10 | Security: HTTPS, protected uploads, input validation, env secrets, backups, upload type/size limits | `config/settings.py`, documents download view, `scripts/backup_scheduled.sh`, `verify_backup.sh` | No | LIKELY-MET (traceability NFR6 PASS) | n/a (security audit) |
| PROP-MOB-01 | S10 §5 | Flutter customer app | Expo/React Native `mobile/` (a Flutter app exists only at `D:\ghassam moblie\mobile`, outside the repo) | **Superseded** by → A1 §0 states Expo/RN is the mobile client | SUPERSEDED | n/a |
| PROP-MOB-02 | S10 §4/§10 | Mobile: home/categories/services/details/order form/payment channel/success/my orders/details/contact | `mobile/src/features/client/screens/*` (ServiceList, ServiceDetail, CreateOrder, MyOrders, ClientOrderDetail, FinalDocument, Missing docs) | Payment channel superseded by B05. Arabic+English optional → app is Arabic-only (`mobile/src/api/client.ts:9`) | PARTIAL (no contact/support screen; no payment screen by decision) | Mobile build on device · customer |
| ARCH-01 | S11 | 30-module production blueprint (dispatch, scheduling, wallet, payouts, chat, tickets, disputes, fraud, Celery…) | Partially: workflow state machine, providers, payment models, notifications, audit, CMS, search | Not contractual; bounded by PRD MVP scope (S12) | Most modules intentionally absent | n/a |

### F. PRD (S12)

| REQ ID | SOURCE | INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| PRD-G | PRD Goal | One request channel, secure doc exchange, transparent tracking, managed execution (Jordan) | Whole system | No | LIKELY-MET | — |
| PRD-S1..S6 | PRD MVP Scope | Public site + catalogue; order creation/tracking; customer, admin and provider dashboards; reporting, notification log, audit log | Routes in `AppRoutes.jsx`; `reports/`, `notifications/`, `audit/` | No (traceability PRD1/PRD2) | LIKELY-MET | Route matrix per role |
| PRD-J1 | Journey 1 | Customer selects service, submits docs, gets order number, tracks | Create order + `/track-order` | No | LIKELY-MET | J01–J08 |
| PRD-J2 | Journey 2 | Admin reviews, requests missing docs, assigns provider | Employee/admin review | No. Overlaps F02/F03 | LIKELY-MET | J11–J14 |
| PRD-J3 | Journey 3 | Provider executes, updates, uploads final output | Provider pages | Overlaps B01 | LIKELY-MET | J15 |
| PRD-J4 | Journey 4 | Admin verifies and completes | `complete_order` | No | LIKELY-MET | J17 |
| PRD-J5 | Journey 5 | Customer downloads final document and rates | Final download + rating | No | LIKELY-MET | J19 + rating submit |
| PRD-M1..M5 | Success metrics | Time to create, % without manual follow-up, avg processing duration by service, provider throughput/completion, satisfaction | `reports/views.py` (`average_completion_time_hours`) | No | PARTIAL (only avg completion time found; no time-to-create, follow-up %, throughput, CSAT metric) | `/admin/reports` · admin |
| PRD-C1 | Constraint | In-system notifications only, no gateway | `notifications/services.py` | Confirms B08 scope | LIKELY-MET | bell; no SMS/email delivery claimed |
| PRD-C2 | Constraint | Support role backend-enabled, UI focused on customer/admin/provider | Support shares the employee shell (`/employee/*`) | **Evolved** (C6): code exposes more support UI. Not a defect | LIKELY-MET (evolved) | Support login: routes visible |

### G. SRS (S13). Status per traceability Gate 1R in brackets; IDs reused

| REQ ID | INTENT (short) | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) [traceability] | RUNTIME CHECK |
|---|---|---|---|---|---|
| FR1 | Public browse of active categories/services | `services` public views; `ServicesPage`, `ServiceCategoryPage`, `ServiceDetailsPage` | No | LIKELY-MET [PASS] | `/services*` anon AR/EN |
| FR2 | Request created by an authenticated customer (or provisioned guest) | `CreateOrderAPIView` `IsAuthenticated+IsCustomerRole`; `_get_or_create_public_customer` | **Yes**: original "public users can create" superseded by → C1 (2026-06 auth hardening) → final rule: authenticated or guest-account customer only | LIKELY-MET [PASS] | anon POST denied; `/create-order` funnels to auth |
| FR3 | Track by order number + phone | `TrackOrderAPIView`, `TrackOrderPage.jsx`; phone normalised E.164 (owner phone decision) | Phone policy refined (E.164, +962) | LIKELY-MET [PASS] | `/track-order` anon with `079…` and `+962…` formats |
| FR4 | Customer auth, orders, missing docs, rating | `pages/customer/*` | No | LIKELY-MET [PASS] | J06–J13 |
| FR5 | Admin manages services, categories, providers, orders, reports, notifications, audit | `pages/admin/*` | No | LIKELY-MET [PASS] | admin routes |
| FR6 | Provider: assigned orders only, notes, progress, final docs | `pages/provider/*`, `transition_permissions` | No | LIKELY-MET [PASS] | provider opens another provider's order → 404 |
| FR7 | Support views orders and adds customer-visible messages; no price change or delete | `IsSupportRole`, delete guard | No | LIKELY-MET [PASS] | support tries delete/price edit |
| FR8 | Every status change logged | `OrderStatusLog` | No | LIKELY-MET [PASS] | timeline |
| FR9 | Sensitive operations audited | `audit.utils.create_audit_log` | No | LIKELY-MET [PASS] | `/admin/audit` |
| FR10 | Upload type/size validated | serializers + magic-byte sniff | No | LIKELY-MET [PASS] | upload `.exe` renamed `.pdf` |
| NFR1 | Arabic-first RTL (+ English LTR) | `LanguageContext`, `LanguageSwitcher.jsx` | No. See CN-ACT-13 | PARTIAL (help/manual and mobile language gaps) | EN mode on all routes |
| NFR2 | Responsive | Tailwind; e2e responsive specs | Overlaps B09 | LIKELY-MET (emulated) | 390/430/768/1366 |
| NFR3 | JWT | simplejwt + token-version revocation | No | LIKELY-MET [PASS] | — |
| NFR4 | PostgreSQL in prod | `docker-compose.yml` | No | LIKELY-MET | prod env check |
| NFR5 | Dockerized | `backend/Dockerfile`, compose | No | LIKELY-MET | — |
| NFR6 | Protected doc downloads | `DocumentDownloadAPIView`, nginx deny | No | LIKELY-MET [PASS] | anon `/media/secure_orders/...` → 404 |
| BR1–BR8 | Order number `KH-YYYY-######`; no assign while NEW; reject needs reason; completion needs final doc or admin confirm; internal notes hidden; customer cannot mutate status; provider cannot assign or see finance; logical archive only | `orders/models.py`, `workflow/rules.py`, `orders/services.py` | No | LIKELY-MET (BR5/BR7 PARTIAL in traceability) | J-suite + authz matrix |

### H. Owner prompts A1/A2 (S14/S15). IDs reused from traceability §D/§E

| REQ ID | INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|
| CE1–CE3 | Master required-document table; services pick from it; create the definition first | `services.RequiredDocumentDefinition`, `ServiceRequiredDocument.document_definition`, `AdminRuleManagementPage.jsx` | Near-duplicate cleanup overlaps B10-9 (open) | LIKELY-MET / PARTIAL (legacy text columns kept) | `/admin/rules` · admin · create definition → link |
| CE4 | Delivery: duration OR date range | `Service.delivery_time_mode` (+ `duration_range` extra) | Exceeds spec (accepted) | LIKELY-MET | service with date range shows label |
| CE5 | Field-by-field public price visibility | `show_*_public` + `_public_pricing_payload` | Overlaps D02, B10-10 | LIKELY-MET | toggle flags → public detail and related services |
| CE6 | Category cards → category services | `/services/category/:slug` | No | LIKELY-MET | click a card |
| CE7 / SD5 / SD7 | System soft delete, hidden from public, never hard-delete, audit immutable | `core.SoftDeleteModel`, `AdminDeleteGuardMixin` | No | LIKELY-MET | J19 |
| CE8 | Simplify UI; backend computes derived values; grouped service form | `ServicesManagementPage.jsx` | No | PARTIAL (judgement) | `/admin/services` form sections |
| CE9 | Snapshot delivery config on the order | `Order` snapshot fields | No | LIKELY-MET | change service duration → old order unchanged |
| CE10 | Validate docs by definition ID/code | `orders/serializers.py` | No | PARTIAL (D6 legacy path) | — |
| A1-PUB | Public service detail shows only customer-relevant fields | `ServiceDetailsPage.jsx` | Overlaps D01 | LIKELY-MET | — |
| SD1–SD4, SD6, SD8 | Visible Delete; confirmation modal (name, impact, reason, password); Active/Deleted/All tabs (default Active); Restore; audit; related-data protection | `components/AdminSoftDeleteModal.jsx`, `restore` actions on ~14 viewsets, `filterSoftDeleted` in `api/services.js` | No | PARTIAL (per-screen wiring unverified in traceability) | Each admin list screen named in A2 §7 · admin · delete → Deleted tab → restore · AR+EN |
| SD-MOB | Same delete/restore on mobile admin screens | `mobile/src/features/admin/screens/*` | No | NOT confirmed | Mobile admin manage-services screen |

### I. Visual / UX prompts A4 (S16). Grouped; each is a distinct intent

| REQ ID | INTENT | IMPLEMENTED AREA | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|
| UI-HP-01 | Rebuild the **actual** `/` homepage: header, hero, real search → `/services?search=`, image category cards with overlay + fallback, reusable ServiceCard, How-it-works, missing-service CTA, help/FAQ CTA, footer | `HomePage.jsx`, `PublicLayout.jsx`, `CategoryCard.jsx`, `ServiceCard.jsx` | No | LIKELY-MET | `/` 1440/390 AR/EN vs `docs/khalsni-public-homepage/after/*` |
| UI-HP-02 | Tokens ≈ bg `#F7F9FC`, navy `#0A2A66`, blue `#1261E8`, 12–18 px radius, Lucide icons, no dark/orange | `index.css` | Agrees with CN-VIS-09 | LIKELY-MET | computed styles |
| UI-HP-03 | Real data only; `/` stays public | `HomePage.jsx` API calls | No | LIKELY-MET | anon load |
| UI-TR-01 | Central status presentation (label, badge, icon, customer-safe text); no fake progress % | `components/StatusBadge.jsx`, `OrderTimeline.jsx` | No | LIKELY-MET | every status |
| UI-TR-02 | Wizard steps derived from the service (info → documents → review → [payment only if real] → confirmation with real order number) | `CustomerCreateOrderPage.jsx`, `ApplicationStepper.jsx` | Payment step correctly omitted (B05) | LIKELY-MET | create order; confirmation shows `KH-…` |
| UI-TR-03 | Tracking shows customer-safe data only; secure lookup kept | `TrackOrderPage.jsx` | Overlaps U03 | LIKELY-MET | `/track-order` |
| UI-TR-04 | Customer shell, dashboard, My Requests, request workspace, Updates panel instead of fake chat | `DashboardLayout.jsx`, `CustomerDashboardHome.jsx`, `MyOrdersPage.jsx`, `CustomerOrderDetailsPage.jsx` | No | LIKELY-MET | `/customer*` 390/1440 |
| UI-TR-05 | Missing-document flow inside the workspace (what, why, deadline, formats, status, upload) | `MissingDocumentsResponsePage.jsx`, `components/MissingRequestRecovery.jsx` | Overlaps F02 | LIKELY-MET | WAITING_CUSTOMER order |
| UI-TR-06 | Employee/support/provider/admin restyled; workflow rules stay server-side; service config in logical sections | `pages/employee|provider|admin/*` | No | PARTIAL | staff routes 1440/390 |
| UI-TR-07 | Delete UX only for permitted roles; password only if backend requires it | `AdminSoftDeleteModal.jsx` | Same as SD1–SD4 | PARTIAL | — |
| UI-TR-08 | Images: aspect ratio, lazy load, alt text, branded fallback, no private docs as decoration | `CategoryCard.jsx`, `ServiceCard.jsx` | No | LIKELY-MET | — |
| UI-TR-09 | Loading/empty/error/permission states everywhere; subtle motion; reduced motion | `EmptyState.jsx`, `LoadError.jsx`, `LoadingSpinner.jsx`, `RouteErrorBoundary.jsx`, `index.css` | No | LIKELY-MET | throttle network / API error |
| UI-TR-10 | A11y: keyboard navigation, accessible form errors, WCAG AA | `a11y.p2.test.jsx`, `e2e/p2-accessibility.spec.js` | No | PARTIAL (keyboard walk was owed at Gate 1R) | keyboard-only journey |

### J. TEAM_DECISION_LOG (S17). Every "Final Decision" cell is blank; the code answer is shown

| REQ ID | Decision | Recommended | Current code answer (verified) | SUP | STATUS (code-inspection-only) | RUNTIME CHECK |
|---|---|---|---|---|---|---|
| TDL-01 | Who can assign a provider? | Admin + Employee | `assign_provider` rule `allowed_roles=INTERNAL_ROLES` (`workflow/rules.py:59-60`) | Undecided | Code = recommendation | employee assigns |
| TDL-02 | Can an employee complete? | Only with verification | `final_document_verified_or_admin_override` check (`rules.py:197`) | Undecided | Code = recommendation | — |
| TDL-03 | Admin reopen completed? | Yes with reason | `reopen_order` admin-only, reason required (`orders/services.py:1095`) | Undecided | Code = recommendation | — |
| TDL-04 | Client cancel? | Early stage only | Customer may cancel only `NEW` (`workflow/transition_permissions.py:42-47`) | Undecided. Overlaps B05 cancellation | Code = recommendation | customer cancels NEW vs UNDER_REVIEW |
| TDL-05 | Required docs per service? | Per service list | `ServiceRequiredDocument` per service | Undecided | Code = recommendation | — |
| TDL-06 | Provider sees client name? | No direct name | Provider serializers limited | Undecided (B06 is the reverse direction) | Unverified field set | provider order detail |
| TDL-07 | Payment before completion? | Selected services only | Completion not blocked by payment | Effectively superseded by B05 (no payment in release) | — | — |
| TDL-08 | Who cancels active orders? | Admin only later stages | Employee/support may cancel UNDER_REVIEW/WAITING_CUSTOMER; admin any non-final (`transition_permissions.py:49-60`) | Undecided | Code ≈ recommendation | — |
| TDL-09 | Support acts like employee? | Limited subset | Support shares the employee shell, partly read-only | Undecided | — | support login |
| TDL-10 | Emergency completion override? | Keep, controlled | Admin-only override (`orders/services.py:706`) | Undecided | Code = recommendation | — |
| TDL-11 | Provider reassignment? | Yes with reason | No dedicated reassignment flow found | Undecided | NOT-FOUND | — |
| TDL-12 | Provider sees client docs? | Allowed service docs only | Limited provider file visibility | Undecided. Overlaps B06 | Code = recommendation | — |
| TDL-13 | Completed orders editable? | No | Protected flow | Undecided | Code = recommendation | — |
| TDL-14 | Audit logs deletable? | Never via UI | No write API | Undecided | Code = recommendation | — |
| TDL-15 | More admin-editable settings? | Whitelisted only | Safe-settings model | Undecided | Code = recommendation | — |

### K. Owner/client decisions that supersede earlier client asks (S18; decided 2026-10-16)

| Decision | Supersedes | Final rule | Evidence path |
|---|---|---|---|
| B05: payment out of release | CN-ACT-10 (pay now), PROP-MOB-02 payment channel, UI-TR-02 payment step, CN-OPS-03 "paid" step, TDL-07 | Customer `POST /api/customer/payments/` → 405. Admin manual ledger kept | `backend/payment/views.py`, `payment/tests_owner_decisions.py` |
| B06: provider identity hidden from customers | CN-OPS-02 (as seen by the customer) | Customer order/notification payloads carry no provider data | `backend/orders/serializers.py`, `notifications/serializers.py` |
| F04: exact staff rejection reason shown to the customer | — (refines CN-ACT-10) | Document `rejection_reason` returned to the owner | `backend/documents/serializers.py`, `components/DocumentList.jsx` |
| B04: no activation | Blueprint "phone/email verification" (ARCH-01) | Accounts active on registration | — |
| D02: approved catalogue wording | CN-BIZ-10 public notes | Migration `services/migrations/0014_apply_owner_catalogue_decisions.py` | `backend/services/catalogue_rules.py` |
| B10-1/2/3: parcel/basin yes/no gate; B10-4 notes optional; B10-7 labelled counts | CN-BIZ-02/04 (partly) | `visible_when` conditional fields; `/api/admin/services/counts/` | `frontend/src/utils/serviceForms.js`, `backend/services/selectors.py` |
| Phone: E.164, default +962 | FR3 matching | Normalised identity for tracking/uniqueness | `backend/accounts/fields.py`, `validators.py` |
| **Still open:** D05 contact data, D06 privacy text, B10-8 verified-user meaning, B10-9 merges, B10-10 pricing model, **Brand/domain spelling** | CN-VIS-03 spelling, PROP-WEB-06 contact, CN-MAP-01 privacy | Current behaviour kept | `docs/audit/KHALSNI_OWNER_DECISION_DOSSIER.md` |

---

## 3. Overlap of client notes with the 26 audit items (for the other reviewer)

| Client note | Audit item(s) |
|---|---|
| CN-ACT-05 search with suggestions | U02 |
| CN-ACT-06 service intro page, CN-BIZ-10 price notes, A1-PUB | D01, D02 |
| CN-ACT-08 upload/review | B02, B07 (draft / double submit) |
| CN-ACT-09/10 status and customer action | F04, U03, F01 (bell) |
| CN-ACT-13 AR/EN purity | D03 |
| CN-ACT-14 real-phone journey, CN-VIS-17 | B09 |
| CN-VIS-03 original logo / spelling | D04 + open Brand decision |
| CN-VIS-04 slogan / homepage content via CMS | F06 (preview vs published) |
| CN-VIS-16 navbar | U01 (staff mobile header, loosely) |
| CN-MAP-01 privacy/contact, PROP-WEB-06 | D05, D06 |
| CN-MAP-03/05 external notification channels | B08 |
| CN-ACT-10 pay now, PROP-WEB-04, PROP-MOB-02 | B05 |
| CN-OPS-01 doc review, PRD-J2 | F02, F03, F04 |
| CN-FLOW-02, PRD-J3 | B01 |
| CN-BIZ-02/04/11 dynamic/conditional fields | B10-1/2/3 |
| Account creation (sitemap) | B04 |

---

## 4. Supersession and conflict summary (explicit or documented only)

| Item | Superseded by | Why | Final rule |
|---|---|---|---|
| SRS FR2 "public users create requests" | C1 / SRS edit | 2026-06 auth hardening | Authenticated or guest customer only |
| SRS BR8 orders-only archive | A1/A2 | Newer owner prompts | All admin records soft-deleted, with Restore |
| PRD C2 support UI-light | Code evolution (C6) | Support given employee shell | Not a defect; PRD text stale |
| C-VIS1 dark 2026-08-05 mockup vs light chain | **CN-VIS-09 (client, 2026-08-30)** + 2026-08-24 light mockup | Newer written client note | LIGHT direction. Recommend updating `KHALSNI_VISUAL_CONFORMANCE_MATRIX.md` |
| Payment ask (CN-ACT-10, PROP-*) | B05 | No approved online payment | Out of release |
| External notifications (S5–S7) | PRD constraint + B08 | MVP scope | In-system only |
| Proposal tech (Django Templates, Flutter) | Actual architecture (React SPA, Expo) | Product evolved | n/a |
| Original 31-service / 7–8-group catalogue (S8, seed) | S4 sheets → **CN-ACT-04 8-category list** | Newer client notes | **Not reconciled in data.** Needs a client/data check |
| `khalasni_design_system.html`, `khalsni_ui_screen_standardization.xlsx` | A4 prompts | Source-of-Truth rank | A4 governs |
| Ambiguity A-1 duration range | Accepted | Exceeds spec | three modes |

**Not superseded and not met, with no out-of-scope record:**
- Terms & Conditions page (CN-MAP-01).
- Customer → support messaging (CN-MAP-02).
- Provider earnings/rating view (CN-MAP-04).
- Late-order supervisor alert (CN-MAP-05).
- Paper delivery logistics (CN-OPS-05).
- Complaints follow-up (CN-OPS-06).
- Repeater fields, coordinates, large-file uploads (CN-BIZ-01/04/05/09).
- Upload preview/replace (CN-ACT-08).
- The 8-category set (CN-ACT-04).
- Help/manual language purity (CN-ACT-13).
- Provider reassignment (TDL-11).

---

## 5. Accepted UI screenshots, mockups and visual references

**Client mockups and brand (authoritative visual intent):**
- `D:\ghassam moblie\WhatsApp Image 2026-08-14 at 11.43.14 PM.jpeg`. Light homepage. Sent with S1. Shows the 8 numbered category "worlds" with panoramic images and service chips, «كيف تعمل خلصني؟» 4 steps, app-download section, light footer.
- `D:\ghassam moblie\WhatsApp Image 2026-08-24 at 12.38.54 PM.jpeg`. Sent with S2. Desktop + mobile, light, photographic skyline hero, approved slogan, 4 trust badges, category image carousel (Real estate 36 / Business 25 / Vehicles 18 / Documents 14), «أحدث الخدمات» cards, mobile bottom tab bar (Home / Favourites / Services / My Requests / Account).
- `D:\ghassam moblie\WhatsApp Image 2026-09-06 at 8.25.44 AM.jpeg` and `…8.26.02 AM.jpeg`. Official logo and app icon (blue rounded square with white tick). Used to derive `frontend/public/brand/*` per `frontend/index.html` comment.
- `image/2.jpeg`, `3.jpeg`, `4.jpeg`, 5× `WhatsApp Image 2026-07-26 …`. Light-direction references.
- `image/WhatsApp Image 2026-08-05 at 12.29.32 PM.jpeg`. Dark-navy homepage outlier (C-VIS1; now overridden by CN-VIS-09).
- `imges/` (7 JPEGs, 2026-04/05, older). Repo root `WhatsApp Image 2026-04-23…`, `…2026-05-13…` (×2).
- `KHALASNI_LOGO.pdf`. `frontend/public/brand/` (wordmark png/jpg, app icons, `source/`, `README.md`).
- Note: the mobile mockup's "Favourites" tab has no implementation in `mobile/src` (no favourites screen). It is a visual reference only and was never stated as a requirement.

**Before/after and acceptance evidence (developer-captured):**
- `docs/khalsni-public-homepage/{before,after}/` (desktop-1440, mobile-390) + `visual-comparison.md`.
- `docs/khalsni-ui-overhaul/{before(6),after(8)}/`.
- `docs/khalsni-saas-uiux-audit/screenshots` (14), `-enhancement/{before 15, after 18}`, `-validation/screenshots` (24).
- `docs/ui/screenshots/` (166, incl. final-acceptance).
- `docs/audit/evidence/` (U01-mobile-header, U02-search-first, U03-tracking-action, U04-contact-required, F04/F05/F06, B09-* at 390/430/768/1366, plus dated folders up to `client-ui-acceptance-2026-10-17`, `release-unblocking-2026-10-17`). About 499 images. Chromium emulation only.
- Repo root `homepage-corrected-*.png` (6), `homepage-current*.png`, `public-*-verify.png` (4).
- Client audit evidence: `D:\ghassam moblie\Khalsni_Audit_Evidence\evidence\E01–E14, E01A/B/C, M01/M02`.
- Manual screenshots: `user image/` (69 PNG, 2026-06), `frontend/public/manual/screenshots/` (55).
- Empty folders: `docs/khalsni-ui-transformation/screenshots/`, `docs/khalsni-system-discovery/runtime-screenshots/`, `docs/khalsni-final-acceptance/screenshots/` (0 image files).

---

## 6. Help and manual content relevant to screens (language coverage)

| Asset | Path | Content | AR | EN |
|---|---|---|---|---|
| HelpGuide model (single-language fields: title, purpose, steps, errors…) | `backend/help_guides/models.py` | Per-screen guide, keyed by `screen_key`/`route_path`/role; soft-delete | as authored | as authored (no paired field) |
| Seeded guides | `backend/help_guides/migrations/0002_seed_help_guides.py` (34 screen keys), `0004_manual_guide_library.py` (21) | Customer/employee/provider/admin screen guides | **Yes** | **No** |
| Fallback field/action guides | `backend/help_guides/fallbacks.py` (e.g. `customer_create_order` fields) | Generated when no DB guide exists | **No** | **Yes** |
| Screen registry | `backend/help_guides/screen_registry.py`; `frontend/src/help/screenRegistry.js`, `frontend/src/help/manualAssets.js` | Route → screen key → manual screenshots | labels mixed | partial (55 `en:` keys in manualAssets) |
| Help UI | `frontend/src/components/HelpGuidePanel.jsx`, `InlineHelp.jsx`, `ContextHelpButton.jsx`, `context/HelpGuideContext.jsx`, `pages/admin/HelpGuideManagementPage.jsx` (`/admin/help-guides`) | In-app help panel + admin CRUD with delete/restore | UI strings localised | UI strings localised |
| Manual launch routes | `pages/shared/ManualLaunchPage.jsx` at `/customer/manual`, `/employee/manual`, `/provider/manual`, `/admin/manual` | Launch page + tips | Yes | via `t()` keys |
| Draft registry | `docs/help_guide/draft_help_registry.json` (85 KB) | Generated help registry draft (`help_guides/management/commands/generate_help_registry.py`) | mostly | only a few `_en` keys |
| Help docs | `docs/help_guide_system.md`, `help_guide_admin_usage.md`, `help_guide_developer_usage.md`, `help_guide_data_model.md` | Developer/admin docs | — | EN |
| Operating guides | `docs/final_review/EMPLOYEE_WORK_GUIDE.md`, `ADMIN_SETTINGS_SIMPLE_GUIDE.md`, `ORDER_STATUS_FLOW_SIMPLE.md`, `ROLE_ACTION_TABLE.md`, `FLOW_REVIEW_FOR_TEAM.md`; `docs/OPERATIONS_MANUAL.md` | Team guides | — | EN |
| User manuals (deliverables) | `Khalisni_User_Manual_AR.md` (95 KB, 2026-06-10, most current readable), `Khalisni_User_Manual_AR(.pdf, _fixed, _fixed_with_images).pdf`, `Khalisni_User_Manual.docx/.pdf` (EN v2.0, June 2026, "Comprehensive User Manual"), `Khalasni_User_Admin_Guide_AR.docx/.pdf` | End-user and admin guides with screenshots (`user image/`) | Yes | Yes (EN manual) |
| Manual generators | `generate_manual.py`, `generate_arabic_pdf.py` (repo root) | Build PDFs | — | — |

Coverage risk: the manuals predate the July–September UI redesign (2026-06). Their screenshots (`user image/`, June) no longer match the current UI. Runtime check: open `/customer/manual` and the help panel on `/customer/orders/new`, `/employee/orders/:id`, `/admin/services`, in both AR and EN. Confirm the language matches the UI and the steps match the current screens.
