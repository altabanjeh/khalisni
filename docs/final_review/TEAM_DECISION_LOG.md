# TEAM DECISION LOG — authoritative product decision register (MVP release)

Last updated: 2026-11-01

**Sources:**
- **Owner decisions** issued with the total-closure instruction of 2026-11-01. These take precedence over earlier open questions.
- **The 2026-10-16 owner-decision implementation** (`docs/audit/KHALSNI_OWNER_DECISIONS_IMPLEMENTATION_REPORT.md`).
- **The behaviour the product actually ships.** Used only where it is unambiguous and invents no business or legal fact.

**Statuses:**
- **Decided (owner):** a decision the owner issued.
- **Decided (implemented):** the shipped behaviour, adopted as the rule.
- **Needs owner input:** an external fact the team cannot supply.

## A. Owner decisions

| ID | Decision | Final rule | Decided by | Status |
|---|---|---|---|---|
| B05 | Payments | An online or customer payment gateway is out of the MVP. Staff and internal payment records stay. Customer payment-write endpoints are closed (`POST /api/customer/payments/` → 405). | Owner | Decided (owner); NOT_APPLICABLE by product decision |
| F04 | Rejected documents | The customer who owns the order sees the exact staff rejection reason. The staff input is labelled as customer-visible. Never shown to other users or on public tracking. | Owner | Decided (owner) |
| B04 | Account activation | No mandatory activation step in this release; accounts are usable immediately. Password reset and recovery need working production email. No SMS verification. | Owner | Decided (owner) |
| B06 | Provider identity | The assigned provider stays hidden from customers. Customer API responses carry no provider identity fields. | Owner | Decided (owner) |
| D02 | Public wording | The approved customer wording from the owner-decision implementation is used. No public text refers to an internal admin panel. | Owner | Decided (owner) |
| B10-1/2/3 | Parcel/basin | The yes/no question «هل تعرف رقم القطعة والحوض؟» ("do you know the parcel and basin numbers?") is a real yes/no choice in every land or property service that collects these numbers. Yes: parcel and basin are shown and required, client- and server-side. No: not required. Never a numeric input for a yes/no question. | Owner | Decided (owner) |
| B10-4 | Additional notes | Optional by default; required only where a service sheet explicitly requires them. | Owner | Decided (owner) |
| B10-7 | Counts | Public and admin counts may differ when hidden or inactive services exist. Every count is labelled with what it measures. | Owner | Decided (owner) |
| B10-8 | `is_verified` | Not a business, KYC or workflow gate in the MVP. The field is kept, but is reserved/deprecated: no editing or presentation in the normal product UI, and it never blocks orders, downloads or provider work. `is_active`, email-verified and phone-verified stay separate facts. | Owner | Decided (owner) |
| B10-9 | Document definitions | Low-risk duplicates are merged (equivalent wording, punctuation, reversed order). Legally different documents stay separate. Historical orders keep their frozen requirements. «تفويض إن وجد» ("authorization, if any") is never globally required. Merges are idempotent and auditable. | Owner | Decided (owner) |
| B10-10 | Pricing display | Fixed price: the public site shows the total only, unless the shown components sum exactly to the total. Quotation: the approved "confirmed after review" wording, never an invented number. The order freezes the authoritative price. Invariant: `displayed_total == sum(displayed_components)`. | Owner | Decided (owner) |
| BRAND | Brand | Visible brand «خلصني» / "Khalsni"; production domain `khalisni.com`. Visible variants "Khalisni" and «خلّصني» are removed except in immutable historical or user content. Database identifiers are not renamed. Production mail uses a real domain, never `.local`. | Owner | Decided (owner) |
| PHONE | Phone policy | Canonical E.164 storage, default country Jordan (+962). Equivalent forms are one identity for uniqueness, registration, profile, guest reuse, tracking, final-result lookup and contact inquiries. The production migration runs as dry-run → collision report → manual resolution → apply → dry-run. Users are never merged silently. | Owner | Decided (owner) |
| CN-ACT-04 | Categories | The client's 8 categories in this order: العقارات والأراضي، خدمات الأعمال، الضرائب والرسوم، المركبات والنقل، العمالة والإقامة، الوثائق والتصديقات، الخدمات الدولية، طلب خاص (real estate and land, business services, taxes and fees, vehicles and transport, labour and residency, documents and attestations, international services, special request). Services are re-mapped; IDs and history are preserved. | Client note (2026-08-15) applied by the owner instruction | Decided (owner) |
| NOTIF | Notification scope (B08) | In-app notifications only for workflow events in the MVP. Email only for password reset and password changed. No SMS/WhatsApp gateway. | PRD constraint + owner instruction | Decided (owner) |

## B. Team decision log rows (closed from the implemented product)

| Decision needed | Final decision | Basis | Status |
|---|---|---|---|
| Who can assign a provider? | Admin and employee | `workflow/rules.py` assign_provider: internal roles | Decided (implemented) |
| Can an employee complete an order? | Only when the final result is verified; the override is admin-only | `orders/services.py` complete_order | Decided (implemented) |
| Can an admin reopen a completed order? | Yes, admin only, with a reason | `reopen_order` | Decided (implemented) |
| Can a client cancel an order? | Only while the order is NEW, with a reason | `workflow/transition_permissions.py` | Decided (implemented) |
| Which documents are required per service? | A per-service list from the master document definitions (normalized under B10-9) | `ServiceRequiredDocument` | Decided (implemented) |
| Should the provider see the client name? | No direct name: the provider screens show «غير متاح» ("not available") | provider serializers | Decided (implemented) |
| Should payment be required before completion? | No. Payment is outside this release (B05). | B05 | Decided (owner) |
| Who can cancel active orders? | Employee or support during the review stages; admin at any non-final stage; client only while NEW | `transition_permissions.py` | Decided (implemented) |
| Should support act like an employee? | A limited subset: it shares the employee portal; service categories and relations are support-only; no price changes or deletes | routes + permissions | Decided (implemented) |
| Should the emergency completion override remain? | Yes, admin-only, with confirmation, audited | `complete_order(admin_confirmation)` | Decided (implemented) |
| Should provider reassignment be allowed? | Yes, by staff with the assign permission, with a required reason, while the order is ASSIGNED or IN_PROGRESS. The order returns to ASSIGNED, the previous provider loses access, the new provider is notified, and history and audit are kept. | `orders/reassignment.py`, `POST /api/admin/orders/<id>/reassign-provider/` | Decided (implemented, 2026-11-01) |
| Customer ↔ support messages | A thread per order (customer-visible notes). Staff identity is not shown. Staff are notified. | `orders/messages.py` | Decided (implemented, 2026-11-01) |
| Customer complaints | A complaint is an issue on the customer's own order. Staff list and resolve it with a note sent to the customer. | `orders/complaints.py` | Decided (implemented, 2026-11-01) |
| Late-order alert | A daily command alerts the supervisors (assigned employee and admins), the customer and the assigned provider. Each gets its own wording, once per order and expected date. Orders with no promised date are never "late". | `orders/overdue.py`, `notify_overdue_orders` | Decided (implemented, 2026-11-01) |
| Paper delivery | Staff record electronic, paper pickup or paper courier, with customer-visible instructions. No partner or fee is assumed. | `orders/delivery.py` | Decided (implemented, 2026-11-01) |
| Should the provider see client documents? | Only the documents of the orders assigned to them, through `can_user_download_document` | documents permissions | Decided (implemented) |
| Should completed orders be editable directly? | No; finalized orders are blocked from direct edits | `orders/views.py` | Decided (implemented) |
| Should audit logs ever be deletable? | Never through the business UI (read-only API) | audit app | Decided (implemented) |
| Should more business settings be editable by admin? | Only whitelisted safe settings | safe-settings model | Decided (implemented) |
| Who reads the document verification note (OD-16)? | The owning customer and staff; nobody else. This is the same boundary as the rejection reason (F04). | `documents/serializers.py` | Decided (owner F04, applied) |
| National ID format (OD-17) | Free text, because the client sheets accept a national number or a passport number. It is stored in one form (spaces removed, Arabic-Indic digits converted, upper case) and is unique per account. | `accounts/validators.py` normalize_national_id | Decided (implemented, 2026-11-01) |
| Success metrics (PRD) | The operational summary reports the five PRD metrics from recorded data. Form timing is measured by the client and is never part of the idempotency fingerprint. | `reports/views.py` _success_metrics | Decided (implemented, 2026-11-01) |
| Report export | Admins only. Monthly and weekly CSV with operational columns only: no customer name, phone, national ID or notes. | `reports/views.py` ReportExportAPIView | Decided (implemented, 2026-11-01) |

## C. Facts only the owner can supply (not decided by the team)

These are external values. The code supports them, but they cannot be invented. Tracking is in `docs/audit/KHALSNI_TOTAL_CLOSURE.md` §F.

- the company-type list and the governorate/municipality list for 5 business services;
- real support contact values (phone, email, WhatsApp, address, hours);
- legal approval of the privacy policy and terms drafts;
- retention periods;
- confirmed fixed prices if a breakdown is ever to be shown;
- the English wording of the slogan;
- the real SMTP mailbox;
- the production API host for the mobile build;
- the provider-compensation rule, if a provider earnings view is wanted (CN-MAP-04).
