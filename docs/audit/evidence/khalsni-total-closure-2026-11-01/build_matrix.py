"""Builds docs/audit/KHALSNI_TOTAL_CLOSURE_MATRIX.csv (total-closure pass, 2026-11-01).

Input: the 189-row client/UI acceptance matrix (KHALSNI_FINAL_CLIENT_UI_MATRIX.csv) and the
original 26-item audit (KHALSNI_ORIGINAL_AUDIT_CLOSURE.csv). Every row ends as PASS,
NOT_APPLICABLE or EXTERNAL_EVIDENCE_REQUIRED. Rows that were PASS stay PASS with their earlier
evidence plus the regression of this pass; every other row is re-decided below with its
implementation, tests and evidence. New rows (TC-*) cover the closure-pass gates.

Run from the repository root: python docs/audit/evidence/khalsni-total-closure-2026-11-01/build_matrix.py
"""

import csv
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
AUDIT = ROOT / "docs" / "audit"
E = "docs/audit/evidence/khalsni-total-closure-2026-11-01"
EV = E + "/evidence"
OLD_EV = "docs/audit/evidence/client-ui-acceptance-2026-10-17"
AUTHZ = "backend/config/tests_total_closure_authz.py"
SVC = "backend/services/tests_total_closure.py"
REPEATER = "backend/services/tests_repeater_fields.py"
TDL = "docs/final_review/TEAM_DECISION_LOG.md"
REGRESSION = "Full regression of this pass (KHALSNI_TOTAL_CLOSURE.md §H)"
ENG_OK = "Engineering verification 2026-11-01"

PASS, NA, EXT = "PASS", "NOT_APPLICABLE", "EXTERNAL_EVIDENCE_REQUIRED"
COLUMNS = [
    "requirement_id", "source_document", "original_requirement", "authoritative_final_interpretation",
    "implementation", "automated_test", "manual_test", "screenshot_evidence", "current_status", "reason",
    "external_dependency", "final_approval_evidence",
]


def row(interp, impl, auto, manual, evidence, status, reason="", ext="", approval=ENG_OK):
    return dict(interp=interp, impl=impl, auto=auto, manual=manual, evidence=evidence, status=status,
                reason=reason, ext=ext, approval=approval)


def owner(decision):
    return f"Owner decision {decision} ({TDL} §A)"


DEVICE = "Physical-device run (iOS Safari, Android Chrome, Expo app on a phone): owner/QA with devices; evidence = dated screen recordings or a signed device checklist"

O = {
    # ---------------- original audit items ----------------
    "F02": row("Missing-document request names configured documents; legacy invalid requests are recovered; an incomplete resubmission is refused. Production must run the recovery once.",
               "orders missing-document validation (earlier passes); recovery command rehearsed on a production-shaped copy", "orders/tests.py missing-document suite; " + AUTHZ,
               "F02 recovery rehearsal: KH-2026-000001 returned to review", E + "/ops/rehearsal_f02_recovery.log", EXT,
               "Code and rehearsal PASS; the production recovery itself needs production access, which this pass does not have",
               "Operator with production access runs the recovery per docs/operations/PRODUCTION_RELEASE_RUNBOOK.md after a verified backup; evidence = command output + order status"),
    "D03": row("Arabic UI is fully Arabic (catalogue, system messages, notifications); identifiers and file types allowed; technical abbreviations only with their Arabic explanation (e.g. «عنوان بروتوكول الإنترنت (IP)»).",
               "core/errors.py localized handler; services/catalogue_translations.py; migrations services 0020/0022, help_guides 0007; notifications localized_content.py",
               SVC + " (EnglishCatalogueContentTests, EnglishTermsAndHelpTests); backend/notifications/tests.py",
               "AR pass over 48 public pages: only the legal version identifier and IP/SMS remain", EV + "/EN-PURITY-results.json; " + EV + "/TC-home-ar-1440.png", PASS,
               "Closed by the purity probe; remaining Latin tokens are identifiers or technical abbreviations in legal drafts"),
    "D04": row("One visible brand: «خلصني» / Khalsni; khalisni.com stays as the domain.",
               "services/catalogue_rules.py normalize_brand; migrations services 0021, help_guides 0008, public_site 0010", AUTHZ + " BrandSpellingTests",
               "closure_ui: brand variants 0 on AR/EN 1440/390", EV + "/CLOSURE-UI-results.json", PASS, approval=owner("BRAND")),
    "D05": row("Real support contact values are published; until then the site says contact details are not published and never shows placeholders.",
               "public_site 0009/0010 (placeholders removed), PublishedContactDetails, ContactPage not-published state, deploy check khalsni.E002/check_public_content",
               "frontend ContactPage.published.test.jsx, PublicLayout.contact.test.jsx; backend/public_site/tests_total_closure.py",
               "closure_ui: notPublished=true, no .local address, form present", EV + "/TC-contact-ar-1440.png", EXT,
               "The contact values are owner facts; publishing invented contact data is forbidden",
               "Owner supplies phone, email, WhatsApp, address and hours and enters them in /admin/public-site; evidence = published contact page screenshot"),
    "D06": row("Approved privacy policy and terms, versioned, with consent tied to the published versions.",
               "public_site LegalDocument (0009/0011), legal API + admin publish, orders 0020 consent privacy/terms versions, consent.py v2", "backend/public_site/tests_total_closure.py; backend/orders/tests_consent_v2.py; LegalDocumentsEditorPage.test.jsx; PrivacyPolicyPage.test.jsx",
               "closure_ui: draft banner on /privacy and /terms (AR/EN)", E + "/legal/privacy_draft.md; " + E + "/legal/terms_draft.md; " + EV + "/TC-privacy-ar-1440.png", EXT,
               "Drafts are written and the versioning works; legal approval cannot be supplied by engineering",
               "Owner/legal counsel approves (or edits) the drafts and publishes the version in /admin/public-site/legal; evidence = published version id + approval record"),
    "B04": row("No activation step (owner B04); password reset/recovery mail works through the configured SMTP.",
               "accounts password reset; Django email backend via env; ops SMTP sink proof (AR/EN)", "backend/accounts/tests.py (password reset)",
               "SMTP sink proof AR + EN", E + "/ops/smtp/", EXT,
               "Mail flow proven against a local SMTP sink; a real mailbox/domain needs the owner's SMTP credentials",
               "Owner provides production SMTP credentials; operator sends a reset to a real mailbox; evidence = received message headers", owner("B04")),
    "B05": row("Payment gateway out of the MVP; staff-recorded payments remain; customer payment writes refused.",
               "payment views (customer POST 405), admin payment ledger", "backend/payment/tests_owner_decisions.py; admin_flows step 5b (405)", "admin_flows steps 5/5b", EV + "/ADMIN-FLOWS-results.json", NA,
               "Out of scope by owner decision B05", approval=owner("B05")),
    "B08": row("External notifications: in-app only for workflow events; email only for password reset/changed; no SMS/WhatsApp gateway.",
               "notifications channels SYSTEM; email for password reset", "backend/notifications/tests.py", "-", "-", NA, "Out of scope by owner decision (NOTIF)", approval=owner("NOTIF")),
    "B09": row("Real iOS Safari / Android Chrome devices and the full viewport set.",
               "Responsive web (5 Playwright viewports), Expo app", "Playwright 5 viewports (incl. mobile-390 touch)", "Emulated viewports only", "frontend/playwright-report (local)", EXT,
               "Physical devices are not available to this pass", DEVICE),
    "B10": row("Form/admin data rules: parent of B10-1..10, all decided by the owner and implemented.", "see B10-1..B10-10", "see sub-rows", "see sub-rows", "see sub-rows", PASS,
               "All sub-items PASS", approval=owner("B10-1..10")),
    "B10-3": row("Yes/no parcel gate on ALL land services; parcel and basin required only when yes, server- and client-side.",
                 "services/catalogue_rules.py apply_schema_rules(gate_all_parcel_fields); migration services 0018; schema_rules validate_answers; web/mobile visible_when",
                 SVC + " ParcelGateTests", "closure_ui: request-property-ownership-transfer gate=select yes/no, parcel visible_when=yes", E + "/catalogue/parcel_gate_before_after.txt", PASS, approval=owner("B10-1/2/3")),
    "B10-8": row("is_verified is not a gate and is not shown or edited in the product UI.", "accounts/serializers.py read-only; UI controls removed", "AdminUsersRolesPage.verification.test.jsx; accounts tests",
                 "-", OLD_EV + "/screens", PASS, approval=owner("B10-8")),
    "B10-9": row("Low-risk duplicate document definitions merged; «تفويض إن وجد» never globally required; history frozen.",
                 "services/document_merges.py; normalize_document_definitions command; migration services 0019", SVC + " DocumentMergeTests",
                 "dry-run then apply on the real catalogue copy", E + "/catalogue/document_merges.md; " + E + "/catalogue/document_merges_dry_run.txt", PASS, approval=owner("B10-9")),
    "B10-10": row("Fixed price: total only unless the shown components sum exactly; quotation wording otherwise; displayed_total == sum(displayed_components).",
                  "services/pricing.py public_pricing; orders ServiceBriefSerializer uses public_pricing", SVC + " PublicPricingInvariantTests; " + AUTHZ + " OrderPricingLeakTests",
                  "closure_ui: 0 invariant violations across the public list; ٣٦٫٠٠ د.أ / JOD 36.00 total only", E + "/catalogue/pricing_before_after.txt; " + EV + "/TC-fixed-price-en-1440.png", PASS,
                  approval=owner("B10-10")),
    # ---------------- client notes ----------------
    "CN-ACT-01": row("Improve the UI of the existing system; no rebuild.", "kept stack", "-", "-", "-", NA, "Process instruction, not a product feature (followed)"),
    "CN-ACT-03": row("Simple homepage order with no duplicate sections.", "HomePage.jsx (single category-worlds section, compact special-request card, slogan h1)", "frontend/src/pages/public/HomePage.test.jsx; CategoryWorlds.test.jsx",
                     "Home headings (AR): slogan, 4 value points, latest services, service sections, how it works, not found? — no duplicates", EV + "/EN-PURITY-results.json (homeHeadings); " + EV + "/TC-home-ar-1440.png", PASS),
    "CN-ACT-04": row("The client's 8 categories in the given order as category worlds; IDs and history preserved.", "services/client_categories.py; migration services 0017; CategoryWorlds component", SVC + " ClientCategoryWorldsTests",
                     "closure_ui: 8/8 worlds on AR 1440/390", EV + "/TC-home-ar-390.png; " + E + "/catalogue/public_categories_after.txt", PASS, approval=owner("CN-ACT-04")),
    "CN-ACT-12": row("Admin manages categories, services, prices, documents and fields without code.", "admin services/categories/document-definitions viewsets; ServicesManagementPage", "backend/services/tests.py; backend/services/tests_remediation.py",
                     "admin_flows: service edit reflected publicly, category image upload, document definition create/delete/restore", EV + "/ADMIN-FLOWS-results.json; " + EV + "/AF-admin-services.png", PASS),
    "CN-ACT-13": row("Arabic fully Arabic, English fully English (content that is user-entered or an identifier excepted).", "see D03", SVC + " English content tests",
                     "EN pass: 48 pages, 0 Arabic runs; AR pass: identifiers/IP/SMS only", EV + "/EN-PURITY-results.json", PASS),
    "CN-ACT-14": row("Whole journey tested on a real phone.", "responsive web + Expo app", "mobile harness; Playwright mobile-390", "-", E + "/mobile/mobile_harness_output.json", EXT, "No physical device available", DEVICE),
    "CN-VIS-01": row("Visual change only; workflow kept.", "-", "-", "-", "-", NA, "Process instruction (followed)"),
    "CN-VIS-06": row("Admin uploads category and service images.", "CategoryAdmin/ServiceAdmin image fields with optimize_image_upload", "backend/services/tests.py (image); backend/config/tests_hardening.py", "admin_flows step 2 (category image 200)", EV + "/ADMIN-FLOWS-results.json", PASS),
    "CN-VIS-10": row("Fewer boxes in boxes; not a dashboard look. Objective part: no card-like box nests more than two levels deep on /, /services and /login (1440 and 390).", "UI P3 pass (OrderTimeline filler removed, compact cards)", "OrderTimeline.test.jsx; " + "vis_assertions.mjs (real catalogue copy)", "nesting depth: / 2, /services 1, /login 1 (both widths)", EV + "/VIS-ASSERTIONS-results.json" + "; " + EV + "/VIS-home-ar-1440.png", PASS, "Runtime assertion added; the remaining look-and-feel is judged on the screenshots"),
    "CN-VIS-15": row("Less vertical spacing so pages are shorter. Objective part: section vertical padding at most 96px (1440) / 64px (390); page heights recorded.", "UI P3 pass (compact special-request card, tightened sections)", "vis_assertions.mjs (real catalogue copy)", "max section padding: / 56px@1440, 40px@390; /services and /login 28/20px", EV + "/VIS-ASSERTIONS-results.json" + "; " + EV + "/TC-home-ar-1440.png", PASS, "Runtime assertion added"),
    "CN-VIS-17": row("Mobile has its own experience with swipe.", "Expo app: horizontal category/service lists (ClientDashboardScreen, ServiceListScreen); web mobile layouts", "mobile harness", "Emulated", E + "/mobile/mobile_harness_output.json", PASS,
                     "Feature present; feel on a real device is covered by B09/CN-ACT-14"),
    "CN-VIS-18": row("Unified art direction: consistent images per category. Objective part: every category image loads (categories without a photo show the branded fallback) and all render in one aspect ratio.", "single theme tokens, CategoryWorlds imagery and fallback", "CategoryWorlds.test.jsx; " + "vis_assertions.mjs (real catalogue copy)", "8/8 category images loaded, one rendered ratio (media served as nginx does)", EV + "/VIS-ASSERTIONS-results.json" + "; " + EV + "/VIS-home-ar-1440.png", PASS, "Runtime assertion added; photos for the two categories without one are owner content (fallback shown)"),
    "CN-VIS-19": row("Subtle desktop hover (slight lift or image zoom), no heavy animation; respects reduced motion.", "card hover classes + prefers-reduced-motion rule (index.css)", "vis_assertions.mjs (real catalogue copy)", "hover lift 4px, transition 0.22s; reduced motion: 0px", EV + "/VIS-ASSERTIONS-results.json", PASS, "Behaviour proven by runtime assertion, not by screenshot"),
    "CN-VIS-20": row("Overall impression: a modern, easy, premium services platform (purely visual).", "UI passes", "-", "screenshot set", EV + "/TC-home-ar-1440.png; " + EV + "/VIS-home-ar-1440.png", PASS, "Purely visual requirement: screenshot evidence is sufficient; owner visual sign-off is part of overall release acceptance"),
    "CN-MAP-01": row("Public pages include privacy and terms pages.", "PrivacyPolicyPage, TermsPage, footer links, legal API", "PublicLayout.legal.test.jsx", "closure_ui privacy/terms AR/EN", EV + "/TC-terms-en-1440.png", PASS,
                     "Pages exist and render the versioned documents; their legal approval is D06"),
    "CN-MAP-02": row("Customer dashboard includes message support.", "orders/messages.py (customer thread, staff notified, staff identity hidden); OrderMessages component; mobile messages card", AUTHZ + " CustomerMessagingTests",
                     "journey step 22", EV + "/REAL-CATALOGUE-JOURNEY-results.json", PASS, approval=f"{TDL} §B (customer ↔ support messages)"),
    "CN-MAP-04": row("Provider panel shows the provider's own rating and completed work; earnings need payout semantics.", "ProviderDashboardHome rating + completed count", "frontend/src/pages/provider/ProviderDashboardHome.test.jsx; backend/config/tests_total_audit.py",
                     "-", OLD_EV + "/screens", EXT, "Rating PASS; an earnings figure needs the owner's provider-compensation rule (payments are out of the MVP and inventing payout semantics is forbidden)",
                     "Owner defines provider compensation (per order fee or share); evidence = written rule, then an earnings view is built"),
    "CN-MAP-05": row("Late orders notify the customer, the provider and the supervisor.", "orders/overdue.py + notify_overdue_orders (daily); events order_overdue, order_overdue_customer, order_overdue_provider; dedupe per order and expected date",
                     AUTHZ + " OverdueAndComplaintTests", "-", "-", PASS, approval=f"{TDL} §B (late-order alert)"),
    "CN-MAP-06": row("10-step workflow including rating and archive.", "workflow/rules.py; rating API/UI; admin archive", "backend/orders/tests_journeys.py; backend/orders/tests_owner_decisions.py", "journey steps 1-20 + 24 (rating UI) + 25 (archive)", EV + "/REAL-CATALOGUE-JOURNEY-results.json; " + EV + "/RJ24-rated.png", PASS),
    "CN-FLOW-03": row("Suggest related services after completion.", "services/order_completion.py recommendation notifications (Arabic relation messages fixed)", "backend/orders/tests.py; backend/services/tests.py (relations)",
                      "journey step 3b (admin rule) + 21 (suggestion notification)", EV + "/REAL-CATALOGUE-JOURNEY-results.json", PASS),
    "CN-OPS-03": row("Provider reports workflow steps (in progress, waiting government, ready for delivery); a 'paid' step is excluded by B05.", "provider status API/UI", "ProviderOrderDetailsPage.test.jsx; backend/orders/tests_journeys.py", "journey step 13", EV + "/REAL-CATALOGUE-JOURNEY-results.json", PASS,
                     "The 'paid' step is out of scope by owner decision B05", approval=owner("B05")),
    "CN-OPS-04": row("Statuses include rejected, with a reason the owning customer sees.", "AdminOrderRejectAPIView; rejection_reason boundary (F04)", "backend/config/tests_hardening.py (reject); " + AUTHZ,
                     "admin_flows step 6/6b", EV + "/AF06-customer-rejected-reason.png", PASS, approval=owner("F04")),
    "CN-OPS-05": row("Electronic and paper delivery recorded on the order; customer rating.", "orders/delivery.py (electronic / paper pickup / paper courier + instructions); OrderDelivery components; rating", AUTHZ + " DeliveryMethodTests",
                     "journey step 24 (rating)", EV + "/RJ24-rated.png", PASS, approval=f"{TDL} §B (paper delivery)"),
    "CN-OPS-06": row("Daily/weekly/monthly reports and complaints handling.", "reports daily/weekly/monthly + CSV; orders/complaints.py", AUTHZ + " OverdueAndComplaintTests, MonthlyReportAndExportTests",
                     "journey steps 23 (complaint) and 26 (CSV)", EV + "/AF-admin-reports.png", PASS),
    "CN-SVC-01": row("The catalogue is the client's later canonical service sheets, grouped into the client's 8 categories (supersedes the original 31-item list).", "service_import + client_categories",
                     SVC + " ClientCategoryWorldsTests, ImporterAgreementTests", "-", E + "/catalogue/public_categories_after.txt", PASS, "Superseded list recorded; 8 groups match CN-ACT-04"),
    "CN-BIZ-00": row("Import the 27 canonical service definitions; every imported service either submits end to end or shows an honest not-available notice.", "service_import; catalogue validation",
                     SVC + " ImporterAgreementTests; catalogue validator", "real-catalogue journey on business_trademark_services", E + "/catalogue/after.txt", EXT,
                     "5 business services wait on the owner's company-type and municipality lists (not invented)",
                     "Owner supplies the company-type list and the governorate/municipality list; evidence = the lists, then the 5 services are made orderable"),
    "CN-BIZ-02": row("Admin-configurable dynamic questions; 'if applicable' documents optional (B10-9).", "services schema + DynamicServiceFields; schema_rules", SVC, "-", E + "/catalogue/after.txt", PASS, approval=owner("B10-9")),
    "CN-BIZ-03": row("Fields and documents editable from admin.", "ServicesManagementPage field builder; document definitions", "backend/services/tests.py; AdminRuleManagementPage.services.test.jsx", "admin_flows steps 1/3", EV + "/ADMIN-FLOWS-results.json", PASS),
    "CN-BIZ-11": row("'If applicable' documents are optional, never globally required.", "document_merges (تفويض إن وجد optional)", SVC + " DocumentMergeTests", "-", E + "/catalogue/document_merges.md", PASS, approval=owner("B10-9")),
    "PROP-WEB-01": row("Django templates UI.", "-", "-", "-", "-", NA, "Superseded by the React SPA"),
    "PROP-WEB-02": row("Admin service management incl. image, order and visibility.", "ServiceAdmin viewset + page", "backend/services/tests.py", "admin_flows steps 1-2", EV + "/AF-admin-services.png", PASS),
    "PROP-WEB-04": row("Manual payment tracking by staff.", "admin payments API + page", "backend/payment/tests.py", "admin_flows step 5", EV + "/AF-admin-payments.png", PASS, approval=owner("B05")),
    "PROP-WEB-05": row("Reports incl. monthly, payment method and CSV export.", "reports MonthlyReportAPIView, payments_by_method, ReportExportAPIView (no personal data); ReportsPage monthly section + export buttons",
                       AUTHZ + " MonthlyReportAndExportTests; ReportsPage.monthly.test.jsx", "journey step 26", EV + "/AF-admin-reports.png", PASS),
    "PROP-WEB-06": row("CMS incl. WhatsApp/social links.", "public_site CMS fields; PublishedContactDetails renders WhatsApp/social when published", "ContactPage.published.test.jsx", "-", "-", PASS,
                       "Rendering proven by tests; the actual WhatsApp number is a D05 owner value"),
    "PROP-MOB-01": row("Flutter app.", "-", "-", "-", "-", NA, "Superseded by the Expo app"),
    "PROP-MOB-02": row("Customer app: services, order, my orders, details, contact.", "mobile client screens", "mobile harness; npm run typecheck", "-", E + "/mobile/mobile_harness_output.json", PASS,
                       "Device run tracked in B09/CN-ACT-14"),
    "ARCH-01": row("30-module architecture blueprint.", "-", "-", "-", "-", NA, "Not contractual (PRD scope)"),
    "PRD-J5": row("Customer downloads the final result and rates.", "documents download; rating", "backend/orders/tests_journeys.py; backend/documents/tests_remediation.py", "journey steps 18 (byte-identical) and 24", EV + "/RJ18-customer-completed.png", PASS),
    "PRD-M": row("The five PRD success metrics are reported.", "reports _success_metrics; Order.form_duration_seconds (orders 0022, excluded from the idempotency fingerprint); ReportsPage success metrics",
                 AUTHZ + " SuccessMetricsTests; ReportsPage.metrics.test.jsx", "admin_flows step 4 (form timing recorded)", EV + "/AF-admin-reports.png", PASS),
    "FR7": row("Support role: limited actions.", "routes + permissions", "backend/config/tests_authz_matrix.py; backend/config/tests_hardening_closure.py", "-", "-", PASS, approval=f"{TDL} §B (support)"),
    "NFR1": row("Arabic-first RTL + English LTR.", "LanguageContext sets lang/dir/title", "vitest", "purity probe", EV + "/EN-PURITY-results.json", PASS),
    "NFR2": row("Responsive.", "responsive layouts", "Playwright 5 viewports; overflow checks", "closure_ui overflow 0", EV + "/CLOSURE-UI-results.json", PASS, "Real devices tracked in B09"),
    "CE1-CE3": row("Master document definitions; services pick from them.", "RequiredDocumentDefinition + merges", SVC + " DocumentMergeTests", "admin_flows step 3", E + "/catalogue/document_merges.md", PASS, approval=owner("B10-9")),
    "CE5": row("Per-field public price visibility, bounded by B10-10.", "show_*_public flags through public_pricing", SVC + " PublicPricingInvariantTests", "-", E + "/catalogue/pricing_before_after.txt", PASS, approval=owner("B10-10")),
    "CE7/SD5/SD7": row("Soft delete, hidden from public, never hard delete.", "core SoftDeleteModel + delete guard", "backend/config/tests_hardening_access.py; backend/orders/tests_journeys.py", "admin_flows step 3", EV + "/ADMIN-FLOWS-results.json", PASS),
    "CE8": row("Simplified grouped service form.", "ServicesManagementPage sections", "vitest", "screenshot set", EV + "/AF-admin-services.png", PASS),
    "CE9": row("Delivery snapshot on the order.", "Order snapshot fields", "backend/orders/tests.py; backend/config/tests_contract.py (snapshot)", "-", "-", PASS),
    "CE10": row("Validate documents by definition.", "orders serializers", "backend/orders/tests.py", "-", "-", PASS),
    "SD1-SD8": row("Delete/restore UX on admin lists: confirmation (name, impact, reason, password), Active/Deleted/All, restore, audit.", "AdminSoftDeleteModal; restore actions", "frontend/src/components/AdminSoftDeleteModal.test.jsx; backend/config/tests_hardening_access.py; backend/accounts/tests.py (delete guard)",
                   "admin_flows step 3 (guard without password = 400)", EV + "/ADMIN-FLOWS-results.json", PASS),
    "UI-TR-06": row("Staff/admin restyled with sections; one language per page.", "admin pages; localized names (getAdminName), audit presentation", "adminCatalogNames.test.jsx", "screenshot set", EV + "/AF-admin-services.png", PASS),
    "UI-TR-07": row("Delete UX role-gated.", "role checks + delete guard", "backend/config/tests_acceptance_adversarial.py; backend/accounts/tests.py (delete guard); AdminSoftDeleteModal.test.jsx", "-", "-", PASS),
    "OD-16": row("verification_note: owning customer and staff read it; nobody else (decided with F04).", "documents/serializers.py boundary", AUTHZ + " TotalClosureAuthorizationTests", "-", "-", PASS, approval=owner("F04")),
    "OD-17": row("National ID / passport number: free text (the sheets accept either), stored in one form (spaces removed, Arabic-Indic digits, upper case), unique per account.",
                 "accounts/validators.py normalize_national_id; register, profile and order paths", AUTHZ + " NationalIdNormalizationTests, ProfileAndEnglishNameTests", "-", "-", PASS),
    "OD-19": row("Retention periods for orders, documents and logs.", "core/retention.py + retention_report command (report only, nothing deleted)", "backend/public_site/tests_total_closure.py (retention)", "-", "-", EXT,
                 "Tooling ready; the periods are a legal/owner decision", "Owner/legal sets retention periods; evidence = written periods, then configured and reported"),
    "OD-20": row("Consent wording approved; web and mobile show the same versioned text.", "orders/consent.py v2 (web-v2/mobile-v2 same AR/EN)", "backend/orders/tests_consent_v2.py", "-", "-", EXT,
                 "Wording unified and versioned; legal approval is external (with D06)", "Legal counsel approves the consent text; evidence = approval record"),
}
for tdl, note in {
    "TDL-01": "Admin and employee assign providers", "TDL-02": "Employee completes only with a verified final result; override admin-only",
    "TDL-03": "Admin reopens with a reason", "TDL-04": "Client cancels only while NEW", "TDL-05": "Per-service list from master definitions",
    "TDL-06": "Provider screens show no client name", "TDL-07": "Payment not required before completion (B05)", "TDL-08": "Cancellation rights by stage",
    "TDL-09": "Support = limited subset", "TDL-10": "Emergency completion override admin-only, audited", "TDL-11": "Reassignment by staff with reason (orders/reassignment.py)",
    "TDL-12": "Provider sees only assigned orders' documents", "TDL-13": "Finalized orders not directly editable", "TDL-14": "Audit logs never deletable via UI",
    "TDL-15": "Only whitelisted safe settings editable",
}.items():
    tests = AUTHZ + " ProviderReassignmentTests" if tdl == "TDL-11" else "backend/config/tests_authz_matrix.py; backend/orders/tests.py; backend/config/tests_release_closure.py"
    O[tdl] = row(note + ".", "see " + TDL + " §B", tests, "-", TDL, PASS, "Decision recorded and implemented",
                 approval=owner("B05") if tdl == "TDL-07" else f"{TDL} §B")
MOB = {
    "MOB-01": "Login / forgot password", "MOB-02": "Order flow with consent (mobile-v2) and idempotency", "MOB-03": "Conditional parcel/basin rule",
    "MOB-04": "Missing-document response", "MOB-05": "Notifications", "MOB-06": "Order detail incl. timeline, rejection reason, delivery, messages, complaints",
    "MOB-07": "Final document download", "MOB-08": "Language behaviour (Arabic only, RTL lock)", "MOB-09": "Logout and profile reachable",
}
for key, note in MOB.items():
    O[key] = row(note + ".", "mobile/src (Expo)", "mobile harness (" + E + "/mobile/mobile_harness_output.json); npm run typecheck", "-", E + "/mobile/mobile_harness_output.json", PASS,
                 "Implemented and harness-verified; the physical-device run is tracked in B09/CN-ACT-14")

# Rows decided by the background implementation agents (filled in from their reports).
AGENT_ROWS = {}
agent_file = pathlib.Path(__file__).with_name("agent_rows.py")
if agent_file.exists():
    namespace = {"row": row, "PASS": PASS, "NA": NA, "EXT": EXT, "E": E, "EV": EV, "REPEATER": REPEATER, "AUTHZ": AUTHZ, "SVC": SVC}
    exec(agent_file.read_text(encoding="utf-8"), namespace)
    AGENT_ROWS = namespace["AGENT_ROWS"]
O.update(AGENT_ROWS)

NEW = [
    ("TC-LEGAL", "Total-closure instruction §D06", "Privacy policy and terms pages with versioned documents and an admin publish flow",
     row("Versioned legal documents; drafts flagged as requiring approval; admin publishes a version.", "public_site LegalDocument + API + LegalDocumentsEditorPage", "backend/public_site/tests_total_closure.py; LegalDocumentsEditorPage.test.jsx",
         "closure_ui draft banners", EV + "/TC-privacy-en-1440.png", PASS, "Approval itself is D06")),
    ("TC-CONSENT", "Total-closure instruction §D06", "Versioned consent recorded per order",
     row("Consent records type and the privacy/terms versions shown; immutable (SQLite/PG triggers).", "orders 0020; consent.py v2", "backend/orders/tests_consent_v2.py", "restore drill: trigger enabled", E + "/ops/drill_07_db_roles_and_consent_trigger.log", PASS)),
    ("TC-RETENTION", "Total-closure instruction", "Retention tooling", row("Report-only retention tooling.", "core/retention.py; retention_report", "backend/public_site/tests_total_closure.py (retention)", "-", "-", PASS, "Periods: OD-19")),
    ("TC-PHONE", "Owner phone policy", "E.164 phone identity with +962 default",
     row("Canonical E.164 everywhere; equivalent forms are one identity.", "accounts/validators.py; migration rehearsal tooling", "backend/accounts/tests_phone_normalization.py", "rehearsal: 14 normalized, 0 collisions, second dry-run 0", E + "/ops/rehearsal_phones_normalize.log", PASS, approval=owner("PHONE"))),
    ("TC-PHONE-PROD", "Owner phone policy", "Production phone migration: dry-run → collision report → apply → dry-run",
     row("Run on production data with manual collision resolution.", "runbook steps", "-", "rehearsal only", E + "/ops/rehearsal_phone_equivalence.log", EXT, "Needs production access and a verified backup",
         "Operator runs dry-run, resolves collisions with the owner, applies, re-runs dry-run; evidence = the four outputs")),
    ("TC-DEMO", "Total-closure instruction", "Demo data cleanup", row("audit_demo_data reports and (with --apply) removes demo/QA records, guarded in production.", "core audit_demo_data + production_guard", SVC + " DemoDataAuditTests, SeedProductionGuardTests", "demo audit on the real copy", E + "/catalogue/demo_audit.txt", PASS)),
    ("TC-DEMO-PROD", "Total-closure instruction", "Run demo cleanup on production", row("audit_demo_data --apply on production after backup.", "-", "-", "-", "-", EXT, "Needs production access", "Operator runs audit_demo_data then --apply; evidence = both outputs")),
    ("TC-SEC", "Total-closure instruction", "Security/authorization regression",
     row("IDOR, internal notes, provider identity, tracking, notifications, staff/admin APIs, anonymous access, soft-deleted documents, download tokens.", "permissions across apps", AUTHZ + " TotalClosureAuthorizationTests", "-", "-", PASS)),
    ("TC-DBROLES", "Total-closure instruction", "Database owner/app role split", row("App connects with a non-owner role; migrations with the owner role.", "db-init service; compose", "-", "restore drill", E + "/ops/drill_07_db_roles_and_consent_trigger.log", PASS)),
    ("TC-BACKUP", "Total-closure instruction", "Backups and a restore drill", row("backup/verify/restore scripts; drill restores counts and 22 media files byte-identical.", "scripts/backup*.sh, verify_backup.sh, restore.sh", "-", "full drill", E + "/ops/drill_05d_restore_final.log; " + E + "/ops/drill_05e_timings.txt", PASS)),
    ("TC-BACKUP-PROD", "Total-closure instruction", "Production backup schedule and off-site copy", row("Cron + off-site copy on the production host.", "backup_scheduled.sh; backup_status_check.sh", "-", "-", "-", EXT, "Needs the production host", "Operator installs cron and off-site target; evidence = backup_status_check JSON from production")),
    ("TC-SMTP", "Total-closure instruction", "Mail delivery", row("Password reset mail renders AR/EN and is delivered to the SMTP server.", "Django email via env", "backend/accounts/tests.py (password reset)", "sink proof", E + "/ops/smtp/", PASS, "Real mailbox: B04")),
    ("TC-DEPLOY-SHA", "Total-closure instruction", "Deployed SHA verification", row("/api/health/version/ + frontend version.json report BUILD_SHA; release_gate.sh refuses a wrong SHA.", "core/version.py; compose BUILD_SHA; release_gate.sh", "backend/core/tests_version.py", "release gate runs incl. negative; 2026-11-02 run at a998b0a: 7/8 PASS, content needs owner input (D05/D06)", E + "/ops/release_gate_run2_PASSED.log; " + E + "/ops/release_gate_run_wrong_sha_negative.log; " + E + "/ops/release_gate_2026-11-02_a998b0a.log", PASS)),
    ("TC-DEPLOY-PROD", "Total-closure instruction", "Deploy the approved SHA and verify it in production", row("Production serves the final SHA.", "runbook", "-", "-", "-", EXT, "No production access in this pass", "Operator deploys the final SHA and runs release_gate.sh against production; evidence = gate output")),
    ("TC-PRICES", "Owner decision B10-10", "Confirm the 8 fixed prices whose base equals government + service fee", row("Display is total-only, so the invariant holds; the amounts themselves are owner facts.", "-", "-", "-", E + "/catalogue/pricing_before_after.txt", EXT, "Price amounts cannot be invented or corrected by engineering", "Owner confirms or corrects the 8 prices in admin; evidence = confirmation")),
    ("TC-SLOGAN", "Owner brand/homepage", "Homepage slogan replaces the demo headline", row("Arabic slogan as h1; demo headline replaced only where it was the demo text.", "public_site 0012", AUTHZ + " SloganOverDemoHeadlineTests", "closure_ui h1", EV + "/TC-home-ar-1440.png", PASS)),
    ("TC-SLOGAN-EN", "Owner brand/homepage", "English wording of the slogan", row("EN h1 is a team translation.", "-", "-", "-", EV + "/TC-home-en-1440.png", EXT, "Owner approval of brand wording", "Owner approves or replaces the English slogan; evidence = approval")),
    ("TC-MOB-HOST", "Mobile release", "Production API host for the mobile build", row("Mobile build reads the API host from config.", "mobile config", "-", "-", "-", EXT, "Host is an owner/infra fact", "Owner provides the production API host; build and smoke-test; evidence = build config + smoke log")),
    ("TC-A11Y", "Total-closure instruction", "Accessibility", row("axe on public/auth pages in 5 viewports; keyboard: skip link, focus management, Escape; 32px inline help targets.", "components", "Playwright a11y, axe-auth, p2-accessibility", "keyboard + off-canvas probes", EV + "/KEYBOARD-results.json; " + EV + "/OFFCANVAS-results.json", PASS)),
    ("TC-JOURNEY", "Total-closure instruction §25", "Real-catalogue journey", row("Registration to byte-checked download on a real imported service, plus message, complaint, rating, suggestion, archive and CSV.", "-", "-", "real_catalogue_journey.mjs", EV + "/REAL-CATALOGUE-JOURNEY-results.json", PASS)),
    ("TC-PURITY", "Total-closure instruction", "AR/EN purity of public pages", row("No Arabic in English pages; no unexplained Latin words on Arabic pages (abbreviations only next to their Arabic explanation).", "translations + migrations; displayLegalVersion", SVC, "en_purity.mjs: 48 pages, 0 findings both ways", EV + "/EN-PURITY-results.json", PASS)),
    ("TC-LEGAL-AR-TERMS", "Loose-end closure 2026-11-02 §4", "Arabic privacy/terms/consent: no raw technical English abbreviations without context",
     row("First occurrence explained: «عنوان بروتوكول الإنترنت (IP)», «الرسائل النصية القصيرة (SMS)»; the Arabic version label reads «(مسودة)» instead of '-draft' (stored id unchanged); legal meaning unchanged; still an unapproved draft.",
         "public_site 0011 seed text (unreleased draft), LegalDocumentContent + mobile LegalDocumentScreen (displayLegalVersion), admin channel label", "backend/public_site/tests_total_closure.py ArabicLegalTerminologyTests; PrivacyPolicyPage.test.jsx",
         "en_purity AR pass on /privacy and /terms: 0 findings", E + "/legal/privacy_draft.md; " + EV + "/EN-PURITY-results.json", PASS, "Legal approval of the text remains D06")),
    ("TC-MOB-PAGING", "Loose-end closure 2026-11-02 §2", "Mobile admin/staff lists reach the complete dataset",
     row("Paged lists load more on demand with a 'showing X of Y' footer (services, users, advertisements, admin orders, employee tasks/review, provider assigned orders); id pickers (prices, permissions, provider assignment) read every page.",
         "mobile hooks/usePagedList, utils/pagination (pagedListQueryOptions), components/LoadMoreFooter; api getAllAdminServices/getAllUsers, getProviders via fetchAllPages",
         "mobile pagination harness 8/8 (rows beyond page 1 reachable, internal-host next links, pickers complete); npm run typecheck", "-", E + "/mobile/mobile_pagination_harness_output.json", PASS, "Device run tracked in B09")),
    ("TC-REASSIGN", "TEAM_DECISION_LOG", "Provider reassignment", row("Staff reassign ASSIGNED/IN_PROGRESS orders with a reason; old provider loses access.", "orders/reassignment.py; ReassignProviderPanel", AUTHZ + " ProviderReassignmentTests; AdminOrderDetailsPage.conversation.test.jsx", "-", "-", PASS)),
    ("TC-REGRESSION", "Total-closure instruction", "Full test suites", row("Backend SQLite + PostgreSQL, vitest, lint, mobile typecheck, Playwright 5 viewports.", "-", REGRESSION, "-", "KHALSNI_TOTAL_CLOSURE.md §H", PASS)),
]


def main():
    old = list(csv.DictReader(open(AUDIT / "KHALSNI_FINAL_CLIENT_UI_MATRIX.csv", encoding="utf-8-sig")))
    out_rows = []
    missing = []
    for r in old:
        rid = r["ID"]
        if rid in O:
            d = O[rid]
        elif r["Status"] == "PASS":
            impl = "; ".join(f"{k}: {r[k]}" for k in ("Backend", "Frontend", "Mobile", "Data/content") if r[k] and r[k] not in ("-", "n/a"))
            d = row(r["Client requirement"], impl or "-", REGRESSION, r["Runtime proof"] or "-", r["UI proof"] or "-", PASS,
                    "PASS in the 2026-10-17 acceptance; unchanged behaviour re-verified by the regression of this pass")
        else:
            missing.append(rid)
            continue
        out_rows.append({
            "requirement_id": rid, "source_document": r["Source"], "original_requirement": r["Client requirement"],
            "authoritative_final_interpretation": d["interp"], "implementation": d["impl"], "automated_test": d["auto"],
            "manual_test": d["manual"], "screenshot_evidence": d["evidence"], "current_status": d["status"], "reason": d["reason"],
            "external_dependency": d["ext"], "final_approval_evidence": d["approval"],
        })
    for rid, source, requirement, d in NEW:
        out_rows.append({
            "requirement_id": rid, "source_document": source, "original_requirement": requirement,
            "authoritative_final_interpretation": d["interp"], "implementation": d["impl"], "automated_test": d["auto"],
            "manual_test": d["manual"], "screenshot_evidence": d["evidence"], "current_status": d["status"], "reason": d["reason"],
            "external_dependency": d["ext"], "final_approval_evidence": d["approval"],
        })
    if missing:
        sys.exit(f"Rows without a decision: {missing}")
    bad = [r["requirement_id"] for r in out_rows if r["current_status"] not in (PASS, NA, EXT)]
    assert not bad, bad
    ext_without_action = [r["requirement_id"] for r in out_rows if r["current_status"] == EXT and not r["external_dependency"]]
    assert not ext_without_action, ext_without_action
    with open(AUDIT / "KHALSNI_TOTAL_CLOSURE_MATRIX.csv", "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(out_rows)
    counts = {}
    for r in out_rows:
        counts[r["current_status"]] = counts.get(r["current_status"], 0) + 1
    print("rows", len(out_rows), counts)
    print("EXTERNAL:", [r["requirement_id"] for r in out_rows if r["current_status"] == EXT])


if __name__ == "__main__":
    main()
