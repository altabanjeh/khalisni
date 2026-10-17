# Khalsni mobile app: read-only acceptance audit (customer focus)

Date: 2026-10-17. Scope: `D:\ghassan\mobile` (Expo SDK 54, RN 0.81.5, TS), compared against `D:\ghassan\backend` and `D:\ghassan\frontend\src`. No repository files were modified. All artifacts are in this scratchpad.

## 0. What counts as evidence here

| Evidence | Status |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **PASS**, exit 0, no diagnostics. |
| Expo web export | **NOT POSSIBLE.** `npx expo export --platform web` gave `CommandError: ... install react-dom@19.1.0, react-native-web@^0.21.0`. Neither package is in `mobile/node_modules`, and installing them was out of scope, so no screen was rendered and there are **no screenshots**. |
| Device or simulator run | **None.** No Android or iOS run took place, and no backend was reachable (127.0.0.1:8000 and 192.168.1.10:8000 both refused the connection). |
| Node harness (my own, scratchpad `harness/`) | Bundled the mobile `api/client.ts`, `orders.api.ts`, `notifications.api.ts`, `utils/serviceForms.ts` and `utils/status.ts` with esbuild, with the storage, store and query-client modules stubbed out, and ran them against a local echo server. Output: `harness/harness_output.json`. It ran under the **Node axios adapter, not the React Native XHR adapter**, so it proves the client logic only, not how multipart uploads, the file system or the UI behave on a device. |
| Prior evidence in repo | `docs/audit/evidence/final-pre-release-hardening-2026-10-16/mobile-harness/*` showed earlier, by a similar Node harness, that `Accept-Language: ar` is sent on the first request, the refresh and the retry. |

**Every finding below about screens, layout and UX comes from reading the code. None of it is runtime proof.** Only the harness rows marked [H] were actually executed.

### Harness results [H]
- A 401 triggers a refresh (`POST /auth/token/refresh/`, `Accept-Language: ar`) and a retry with the new token, and the request then succeeds. When the refresh itself is rejected (401), the session store is cleared, along with the query cache.
- Every request carried `Accept-Language: ar`. The order POST carried the `Idempotency-Key`.
- A 400 with `{phone:[..], documents:"..", document_errors:{national_id:".."}}` was normalized to `message = first phone error`. `fieldErrors` contained phone and documents; **`document_errors` (an object) was dropped**.
- A 429 showed the server's `detail` text. There is no retry-after handling and no special UI.
- **HTML 500 became the English text "Request failed with status code 500". A closed port gave the raw English "connect ECONNREFUSED ..."** (on React Native this is "Network Error"; a timeout gives "timeout of 20000ms exceeded").
- `getCustomerOrders()` against a paginated response (`count: 45`) returned **20 items. There is no next-page handling.**
- Dynamic form: the parcel and basin fields are hidden until the controlling answer is `yes`, are shown on `yes`, and their hidden values are left out of the notes. **This matches the web rule.** A field that has only `label_en` is labelled **"Field 4"** in English.
- Uploads: `.exe` and files with no extension are rejected; >10 MB is rejected; **a file whose size is unknown passes**.
- **Document statuses `pending_review`, `approved`, `rejected` and `uploaded` display in English** ("pending review", "approved" and so on). Order statuses display in Arabic.

### API base URL configuration
- `mobile/src/config/env.ts:3-9`: `EXPO_PUBLIC_API_BASE_URL`, default `http://127.0.0.1:8000`, with `/api` appended automatically.
- `mobile/.env` (not tracked by git): `http://192.168.1.10:8000`, a LAN IP over HTTP.
- `mobile/eas.json`: preview uses `http://127.0.0.1:8000`, which cannot work on a physical device. **Production uses the placeholder `https://api.example.com`.** See finding M-01.

---

## 1. Findings

Severity: P0 = security or data loss; P1 = a major requirement is missing; P2 = important UX or content; P3 = polish. Type: CODE / UI / CONTENT / OWNER DECISION.

| ID | File:line | Sev | Type | Finding |
|---|---|---|---|---|
| M-01 | `mobile/eas.json` (build.production.env) | P1 | OWNER DECISION / CODE | The production build points at `https://api.example.com`, and preview points at `127.0.0.1`. No store or internal build can reach a real backend until the owner supplies the HTTPS API host. Android release builds also block cleartext `http://` by default. |
| M-02 | `navigation/ClientNavigator.tsx:63-64` (also Admin:48-49, Employee:40-41, Provider:36-37); `screens/shared/SettingsScreen.tsx:17` | P1 (security-adjacent) | CODE | **Logout and Profile cannot be reached.** The `Settings` screen holds the only sign-out button, and `Profile` is the only profile editor, but no code calls `navigate('Settings')` or `navigate('Profile')` (I grepped every navigate/push/replace), and no tab or drawer entry exists. A customer cannot sign out, which matters on shared devices, and cannot edit their profile. This applies to every role. |
| M-03 | `features/client/screens/ClientOrderDetailScreen.tsx:51-89` | P1 | CODE / UI | **There is no status timeline.** `status_logs` is fetched (backend `CustomerOrderStatusLogSerializer`) but never rendered. Because the backend delivers the customer-facing rejection or cancellation reason as the timeline `note` (with `system_event`), **a customer whose order is REJECTED never sees why on mobile.** The web shows it in `OrderTimeline` (`frontend/src/pages/customer/CustomerOrderDetailsPage.jsx:240-244`). `order.rejection_reason` is in the type definition (`types/order.ts:65`) but is not displayed either. |
| M-04 | `features/documents/DocumentUploadWidget.tsx:136-142`; `RespondToMissingDocumentScreen.tsx:167-186` | P1 | CODE / UI | **To answer a missing-document request, the customer must type the internal document-type code** (the hint reads "اكتب القيمة كما يعتمدها النظام مثل passport أو national_id"). There is no list of the requested documents. The web offers a select built from `missing_document_types`, labelled through `required_documents` (`CustomerOrderDetailsPage.jsx:262-272`, `MissingDocumentsResponsePage.jsx:202`). Per-requirement rules (allowed extensions and maximum size) are also ignored: a fixed list of PDF/JPEG/PNG up to 10 MB is used (`utils/file.ts:6-25`), so **DOC/DOCX files that the backend accepts (`config/settings.py:342-357`) cannot be picked** in this flow. |
| M-05 | `navigation/AuthNavigator.tsx:9-12` | P1 | OWNER DECISION | **There is no registration screen** (the web has `/register`), so new customers must sign up on the web. The owner needs to confirm this is acceptable. |
| M-06 | `api/orders.api.ts:21-23`, `api/notifications.api.ts:6-8`, `api/client.ts:179-183` | P2 | CODE | Customer orders and notifications are paginated server-side (`PAGE_SIZE 20`, `config/settings.py:282-283`), but **mobile reads page 1 only** [H]. Orders beyond 20 are invisible, and the dashboard metrics (active orders, waiting documents, unread count; `ClientDashboardScreen.tsx:64-68`) and the "missing docs" list are computed from 20 items. The backend endpoints `notifications/unread-count` and `mark-all-read` exist but are not used. The web paginates and filters on the server (`MyOrdersPage.jsx:18-36`). |
| M-07 | `constants/statuses.ts:17-33`, `utils/status.ts:4-7`, `features/documents/DocumentList.tsx:31,34` | P2 | CONTENT | Document statuses use lowercase backend values (`uploaded`, `pending_review`, `approved`, `rejected` and others) that have no Arabic label, so **the badge shows English** [H]. Document rows also show the raw `document_type` code instead of the `document_type_label` the backend already sends (`documents/serializers.py:14,56`). |
| M-08 | `ClientOrderDetailScreen.tsx:59-61`, `MissingDocumentRequestsScreen.tsx:31` | P2 | CONTENT | The missing documents are listed as raw codes (`missing_document_types.join('، ')`). The names in `required_documents` are not used. |
| M-09 | `api/client.ts:139-161`; `CreateOrderScreen.tsx:190-198,405` | P2 | CODE / UI | Server validation errors on order submission show as **one message above the submit button**. Nothing is placed on the field it belongs to, and `document_errors` (backend `orders/serializers.py`, PublicOrderCreateSerializer.validate) is dropped [H]. The web uses `applyServerFieldErrors` to highlight fields and jump to the right step (`CustomerCreateOrderPage.jsx:334-352`). Several backend messages are hardcoded English ("Consent is required.", "Missing required documents: ...", "Each uploaded file must have a matching document type."), so Arabic users see English. That part is a backend issue that also affects the web. |
| M-10 | `api/client.ts:156,165` | P2 | CONTENT | **Network failures, timeouts and non-JSON 5xx responses show axios's English text** ("Network Error", "timeout of 20000ms exceeded", "Request failed with status code 500") [H]. The Arabic fallback `حدث خطأ غير متوقع.` is never reached because `error.message` is always set. |
| M-11 | `utils/file.ts:27-35`; `DocumentList.tsx:43-46` | P2 | CODE | Final-document download uses `FileSystem.downloadAsync` with the in-memory access token and **does not go through the axios 401 refresh. It never checks the HTTP status.** An expired token or a 403 or 404 saves the JSON error body under the document's filename and opens the share sheet with it as if it were the document. `original_filename` is put into the cache path without sanitizing (relying on the backend to sanitize). The unused `getDownloadToken` (`documents.api.ts:27-29`) would be a safer path. |
| M-12 | `CreateOrderScreen.tsx:57,159,283`; backend `orders/services.py:219-224` | P2 | CODE (backend + mobile) | The national ID field is optional with no format check, which matches the backend (`CharField(max_length=32, required=False)`). However, **the backend writes the submitted value over `customer.national_id` even when it is blank**, so clearing the prefilled field on mobile (or on the web) erases the stored national ID, a data-loss risk. `accounts/models.py` also has a unique constraint on non-empty national IDs (`unique_non_empty_user_national_id`). From reading the code, entering another user's ID would hit the `IntegrityError` path in `CreateOrderAPIView.create` (`orders/views.py:124-130`), which re-raises it when there is no replay, likely an HTTP 500. **This is unverified at runtime.** |
| M-13 | `utils/orderConsent.ts:5-7`; `CreateOrderScreen.tsx:105,162-165,387-395`; backend `orders/consent.py:20-23`, `orders/serializers.py:414-454` | P2 | OWNER DECISION / CONTENT | **Consent is captured and sent correctly**: the switch is required client-side, and the request sends `consent=true`, `consent_version=order-consent-mobile-v1` and `consent_source=mobile`. The backend rejects `consent=false` and unknown versions, and stores an `OrderConsent` row (migration 0018, made append-only by 0019). The mobile text is byte-identical to the backend's `CONSENT_TEXTS` (I checked with a script). It does differ from the web statement: the mobile text lacks "وإشعاري بأي نواقص" (and being notified of missing items). There is no privacy-policy link on mobile. Both points are legal/content decisions (D06). Mobile has only an Arabic text, which is consistent with the app being Arabic-only. |
| M-14 | `features/client/screens/*` (no tracking screen); `ClientDashboardScreen.tsx:90-93` | P2 | CODE | Public order tracking (web `/track-order`) is missing. `ordersApi.trackOrder` exists but nothing calls it, and the dashboard sends `/track-order` links to MyOrders. |
| M-15 | `ClientOrderDetailScreen.tsx` (no rating UI); `api/orders.api.ts:30-32` | P2 | CODE | Rating a completed order is missing from the UI. The web has it (`CustomerOrderDetailsPage.jsx:302-325`), and `submitRating` exists but nothing calls it. |
| M-16 | `ClientOrderDetailScreen.tsx:53-62` | P2 | UI | The order detail screen also leaves out the expected delivery date, customer notes and customer-visible order notes (`order.notes`), all of which the web shows. |
| M-17 | `components/AppScreen.tsx:33-56`; `app.json` (`android.edgeToEdgeEnabled: true`) | P2 | UI | No safe-area insets are applied (no SafeAreaView or `useSafeAreaInsets` anywhere), and every stack sets `headerShown:false`. With edge-to-edge on, screen titles are likely to sit under the status bar or notch. There is also no visible back button; the app relies on the Android back button or the iOS swipe. **This needs a device check.** |
| M-18 | `CreateOrderScreen.tsx:33-38,318-328`; `utils/serviceForms.ts:17,119` | P3 | UI | `date` fields are free-text inputs with no picker or format check. The web uses a date input. The label fallback is English `Field N`, where the web uses `معلومة مطلوبة N` [H]. The placeholder reads `placeholder`, not `placeholder_ar`. Raw string options are shown as-is, where the web masks English codes as `خيار N`. Field types are otherwise equal to the web (text, textarea, number, email, tel, date, select, checkbox), and so are required flags, `visible_when` and `buildDynamicNotes` (`frontend/src/utils/serviceForms.js:96-185`). |
| M-19 | `CreateOrderScreen.tsx` (whole) | P3 | UI | Compared with the web form, mobile has no draft saving, no review step and no handling of `warnings` in the response. The form is a single long page. |
| M-20 | `CreateOrderScreen.tsx:72-80` | P3 | CODE | Opened without `serviceId` or a slug, the screen silently preselects the first service. Every current entry point passes `serviceId`, so the risk is low. |
| M-21 | `utils/serviceForms.ts:221-223`; `CreateOrderScreen.tsx:201-206` | P3 | CODE | A file whose size is unknown skips the size check [H], leaving it to the server. The order form's picker accepts `*/*`. |
| M-22 | `screens/auth/LoginScreen.tsx:33`; `ClientDashboardScreen.tsx:125`; `SplashScreen.tsx:8`; `app.json` name "Khalsni Mobile" | P3 | CONTENT | **The brand is spelled inconsistently**: "Khalsni / خلّصني" (login), "**Khalisni** / خلصني" (dashboard hero) and "Khalsni" (splash). The web uses "خلصني \| Khalsni" (`frontend/index.html:19`). |
| M-23 | `SettingsScreen.tsx:15-16`; `LoginScreen.tsx:41`; `ProfileScreen.tsx:29`; `CreateOrderScreen.tsx:254`; `ClientDashboardScreen.tsx:197-207`; `ServiceListScreen.tsx:41` | P3 | CONTENT | **Developer and placeholder copy appears in the customer UI**: the API base URL and "docs/mobile" (Settings), "المصادقة تستخدم JWT من نفس واجهات الويب الحالية" (login), "...لا تملك endpoint مخصصاً بعد" (profile error), and "بنفس منطق نموذج الموقع، لكن بترتيب مناسب للجوال" / "نفس منطق الموقع..." / "بدون تغيير في القواعد" (create order and dashboard). |
| M-24 | `ProfileScreen.tsx:81` | P3 | CONTENT | The role field shows the internal code `client` in English. The profile cannot edit email or national ID (the web can; `ProfilePage.jsx:90-98`). |
| M-25 | `NotificationsScreen.tsx:36-38`; `NotificationBell.tsx` | P3 | UI | Notification `title` is not shown, only `message`. The backend localizes both from `Accept-Language` (`notifications/serializers.py:38-47`), so the mobile copy is Arabic. `NotificationBell` is never mounted. There is no mark-all-read. Push notifications are not implemented: `expo-notifications` is installed but unused, and Settings says so. |
| M-26 | `features/client/screens/UploadOrderDocumentsScreen.tsx:41` | P3 | CODE | This screen cannot be reached (dead code). Its second widget would send `document_type=customer_upload`, but the backend constant is `CUSTOMER_UPLOAD` (`core/choices.py`). `MissingDocumentRequestsScreen` also cannot be reached. |
| M-27 | `api/client.ts:9-13`; no `I18nManager` anywhere; `components/KeyValueRow.tsx:16,31`; `AppScreen.tsx:76` | P3 (risk) | UI / OWNER DECISION | **The app is Arabic-only.** There is no AR/EN switch (the 2026-10-16 commit records this decision), so the web's language switch is missing. RTL is imitated inside an LTR layout: `textAlign:'right'` on every Text, `row-reverse` in places, and the label placed last in `KeyValueRow`. Nothing locks the direction (`I18nManager.allowRTL/forceRTL`, Expo `supportsRTL`). If native RTL is ever enabled, every hardcoded right/left and row-reverse flips the wrong way. Some Text has no alignment (`SettingsScreen.tsx:15-16`, `permissions/guards.tsx:10`). This needs a device check on an Arabic-locale phone. |
| M-28 | `utils/format.ts:30-34` | P3 | CONTENT | Currency is formatted with `en-JO`, giving "JOD 12.00" in Latin text in an Arabic UI. `ServiceDetailScreen.tsx:84` builds step numbers as `0{index+1}`, which yields "010" for step 10. "الرسوم التفصيلية مخفية" (detailed fees hidden) reads oddly to customers (`ServiceDetailScreen.tsx:54`). |
| M-29 | `constants/roles.ts:11-23` | P3 | CODE | Any unknown or missing role string falls back to `client` and gets the customer UI. The backend still enforces permissions. |
| M-30 | `ClientDashboardScreen.tsx:37-56` | P3 | CODE | The dashboard errors out completely if the public-site homepage endpoint fails, even when orders loaded. |

**Confirmed correct by reading the code (not proven at runtime):**
- **Provider identity stays hidden from the customer.** The backend drops `assigned_provider` and nulls `assigned_employee` for customers (`orders/serializers.py:196-203`), and no client screen renders provider or employee fields.
- **`verification_note` and the document `rejection_reason` are displayed** (`DocumentList.tsx:37-38`). The backend sends them only to the owning customer, and localizes the verification note by `Accept-Language`.
- **Cancellation works as on the web**: a reason is required and it is gated by `allowed_actions.can_cancel`.
- **Idempotent order submission** uses a UUID key per form fingerprint and handles the 409 `submission_key_conflict`.
- **Tokens are stored in SecureStore**, with permissions stripped.
- **Refresh-token rotation is handled.**

Searches for `????`, `.local` emails, `lorem`, `TODO` and `console.` in the mobile source found nothing.

---

## 2. Web customer features vs mobile

Web customer routes are in `frontend/src/routes/AppRoutes.jsx:106-112,170-195`.

| Web feature (route / page) | Mobile | Notes |
|---|---|---|
| Login `/login` | Present, consistent | Email and password. Errors appear in an Alert. |
| Forgot password `/forgot-password` | Present, consistent | Sends `Accept-Language: ar`. |
| Reset password `/reset-password/:token` | Missing (by design?) | The email link opens the web page (`accounts/password_reset.py:85`). Owner should confirm. |
| Register `/register` | **Missing** | M-05. |
| Services catalog `/services`, category `/services/category/:slug` | Present, partly inconsistent | Search plus category chips filtered on the client. There is no category landing page. |
| Service details `/services/:slug` | Present, consistent | Shows price, delivery, documents, steps, terms and related services. |
| Public track order `/track-order` | **Missing** | M-14. |
| About / Contact / FAQ / Privacy | Mostly missing | Only contact details on the dashboard. Missing privacy page, see M-13. |
| Customer dashboard `/customer` | Present, inconsistent | Metrics from page 1 only (M-06). No latest-notifications list with titles. Help/manual link missing. |
| New order `/customer/orders/new` | Present, inconsistent | Same schema rules, consent capture and idempotency as web. No field-level server errors (M-09), no drafts or review step (M-19), date as free text (M-18). |
| My orders `/customer/orders` | Present, inconsistent | No search, status filters or pagination (M-06). |
| Order details `/customer/orders/:id` | Present, inconsistent | No timeline or rejection reason (M-03), no rating (M-15), no delivery date or notes (M-16), raw codes and English document statuses (M-07, M-08). Cancel and final-document download are present. |
| Missing-docs response `/customer/orders/:id/missing-docs` | Present, **inconsistent** | Customer must type the internal code; per-requirement rules ignored (M-04). |
| Profile `/customer/profile` | Present but **unreachable** | M-02. No email or national ID editing (M-24). |
| Manual / help guide `/customer/manual`, inline help | Missing | |
| Notifications (header bell / context) | Present, inconsistent | No title, page 1 only, no mark-all, bell unused (M-25). |
| Language switch AR/EN | Missing (owner decision) | M-27. |
| Logout | **Unreachable** | M-02. |

**Other roles on mobile:** employee (backend roles `employee` and `support` both map to it), provider and admin navigators all exist (`navigation/EmployeeNavigator.tsx`, `ProviderNavigator.tsx`, `AdminNavigator.tsx`, plus `features/employee|provider|admin`). They were outside this customer-focused audit apart from M-02, which affects every role.

---

## 3. Suggested next steps for runtime proof
1. Install `react-dom` and `react-native-web` in a branch, or run Expo Go on a device, against a seeded backend. Then screenshot: login, service list, order creation (parcel yes/no), order detail for a REJECTED order, the missing-docs response, the final download with an expired token, and an Arabic-locale device for RTL and safe areas.
2. Against a running backend: submit an order with another user's national ID (M-12) and with a blank national ID (check whether the stored value is erased).
