# KHALSNI — OWNER / CLIENT DECISION DOSSIER

DATE: 2026-10-16
BRANCH / SHA examined: `fix/p2-objective-remediation` @ `f5b98b9`
SOURCES:
- `docs/audit/KHALSNI_ORIGINAL_AUDIT_CLOSURE.md`, `KHALSNI_P1_REMEDIATION_REPORT.md`, `KHALSNI_P2_OBJECTIVE_REMEDIATION_REPORT.md`.
- `docs/PRD.md`, `docs/SRS.md`, `docs/final_review/TEAM_DECISION_LOG.md` (every "Final Decision" cell is still empty).
- Current models, serializers and frontend code.
- A read-only migrated copy of the legacy database (the real 38-service catalogue). Figures below come from that copy.

No code, data or content was changed to produce this document. Nothing here is a decision: every "Recommended" entry is an engineering opinion for the owner to accept or reject. Where no option is objectively better, the table says **Owner choice**.

---

## Decision table

| # | ID | Decision | Current behaviour | Options | Recommended | Owner answer |
|---|----|----------|-------------------|---------|-------------|--------------|
| 1 | D05 | Official support contact data | Live site shows `+962 6 560 9000`, `support@khalisni.local` (undeliverable), an unverified Shmeisani address; WhatsApp stored but shown nowhere; no office-hours field | Fill the form in §1 / leave fields blank | Publish only verified values; clear every placeholder you cannot confirm | Phone: ____ Email: ____ WhatsApp: ____ Address AR/EN: ____ Hours: ____ |
| 2 | D06 | Privacy policy text | Built-in four generic principles; no approved text stored | Supply approved AR+EN text covering §2's sections | Legal team supplies text; engineering adds consent record (see §2) | [ ] Text supplied  [ ] Not yet |
| 3 | B05 | Is payment in this release? | Manual payment *records* only; no gateway, webhook, refund integration or customer UI | A. Out of release / B. In release | **A** (no approved requirement for online payment) | [ ] A  [ ] B |
| 4 | F04 | What the customer sees when a document is rejected | Document reason stored, shown to no one except the verify screen; order-level rejection reason *is* already shown to customers | A. Exact staff reason / B. Separate customer-facing reason / C. Generic message | **A, with the reject box labelled "visible to the customer"** | [ ] A  [ ] B  [ ] C |
| 5 | B04 | Account activation | Account active immediately; reset email exists; no SMS provider | A. None / B. Email verification / C. Phone verification / D. Both or configurable | **A for this release**, B once SMTP is proven | [ ] A  [ ] B  [ ] C  [ ] D |
| 6 | B06 | Provider identity shown to customers | UI shows none; customer API returns provider id, full name, type, city, rating, availability | A. Visible / B. Hidden / C. Limited | **Owner choice**; engineering rule: API returns exactly what the UI shows. Safest default **B** | [ ] A  [ ] B  [ ] C (fields: ____) |
| 7 | D02 | Customer wording that mentions "لوحة الإدارة" | 26 public services show "يحدد بعد المراجعة من لوحة الإدارة." and 9 show "تُحدد من لوحة الإدارة" | Approve the proposed texts in §7 / supply own | Approve §7 proposals (they reuse wording already used on 7 services) | [ ] Approve  [ ] Edit: ____ |
| 8 | B10-1/2/3 | Parcel/basin questions | 17 services require parcel + basin always; 2 also ask "هل تعرف رقم القطعة والحوض؟" typed as a *number*, optional | A. Yes/no gate, conditional / B. Always required / C. Remove the question | **A** (needs a small conditional-field feature) or interim: question as yes/no + fields optional | [ ] A  [ ] B  [ ] C |
| 9 | B10-4 | "ملاحظات إضافية" required? | Required in 17 services; 3 others have an optional notes field | A. Optional / B. Required / C. Per service | **A** unless a service names a reason | [ ] A  [ ] B  [ ] C |
| 10 | B10-7 | Public vs admin counts (32 vs 38) | Difference is explained (6 hidden services) but screens give no label | Adopt count labels in §10 | Adopt labels; do not force counts to match | [ ] Approve labels |
| 11 | B10-8 | Meaning of "verified" user | `is_verified` editable by admin, used by no workflow; email/phone flags set only by seed scripts | Answer the 5 questions in §11 | **Owner choice** | ____ |
| 12 | B10-9 | Near-duplicate document definitions | 69 definitions; at least 9 groups of probable duplicates | KEEP / MERGE / RENAME / OWNER REVIEW per group (§12) | Merge groups 1, 2, 5, 6, 8; review the authorization family | [ ] Approve table  [ ] Edit |
| 13 | B10-10 | Pricing model and display | `total = base_price + government_fee + service_fee`; public breakdown omits `base_price`, so shown parts do not add up to the total | Strategies 1–4 in §13 | Owner defines `base_price`; whatever is shown must add up to the total | [ ] 1  [ ] 2  [ ] 3  [ ] 4 |
| 14 | Brand | Canonical spellings | UI: خلصني / Khalsni; catalogue prose: خلّصني; domain `khalisni.com`; email and DB names `khalisni` | Fill the form in §14 | **Owner choice** | AR: ____ Latin: ____ Domain: ____ Email domain: ____ |
| 15 | Phone | Phone-number policy | International 8–15 digits accepted, stored as typed; tracking compares as typed | A. Permissive / B. Jordan-only / C. Normalize to E.164 | **C**, with the default country chosen by the owner | [ ] A  [ ] B  [ ] C (default country: ____) |

---

## 1. D05 — Support contact information

**Current behaviour**
- The public site reads contact data from the active CMS content row (`PublicPageContent`, row 2 in the live data).

| Field | Stored value | Where it appears |
|---|---|---|
| `contact_phone` | `+962 6 560 9000` | Footer (as a `tel:` link) |
| `email` | `support@khalisni.local` | Footer (as a `mailto:` link). **`.local` cannot receive mail.** |
| `whatsapp_number` | `+962 79 000 0000` | **Nowhere.** The only component that rendered it (`PublicHomepageTemplate.jsx`) is not used by any route. |
| `office_address` / `office_address_en` | "عمان - الشميساني، شارع الملكة نور، مبنى خلصني للخدمات" ("Amman – Shmeisani, Queen Noor Street, Khalsni Services Building") / "Amman - Shmeisani, Queen Noor Street, Khalisni Services Building" | Footer |
| office hours | no field exists | — |

- `/contact` shows only an inquiry form, no contact details.
- A separate admin setting `site.contact` (phone, email) also exists, but no public page reads it. That is two sources for the same fact (see "Items that do not require a decision").

**Why a decision is required:** these are business facts. Publishing an unverified number or address is publishing false contact data.

**Fill-in form**

```
Official phone:           ______________________
Official email:           ______________________  (must be a real, monitored mailbox)
Official WhatsApp:        ______________________  (shown nowhere today; see below)
Arabic address:           ______________________
English address:          ______________________
Office hours (AR / EN):   ______________________  (not supported today; see below)
```

**If fields are left blank**
- Each blank field disappears from the footer.
- If phone, email **and** address are all blank, the footer shows "معلومات التواصل غير منشورة حالياً." / "Contact details are not published yet."
- The `/contact` inquiry form keeps working either way.

**Recommendation:** publish only values someone has verified (call the number, receive mail at the address). Clear any value you cannot confirm before launch so the site shows "not published" instead of a placeholder.

---

## 2. D06 — Privacy policy

**Current behaviour**
- `/privacy` shows approved text from the CMS (`privacy_policy_ar` / `_en`; both must be filled together).
- Neither field is filled, so the page shows four built-in generic sentences.

**What is technically true today** (facts from the code; usable as input for the legal team, not as policy):

| Area | Fact |
|---|---|
| Accounts | Stores name, email, phone, optional national ID, role and password hash. Records last login IP. Registration needs email + phone + password. Accounts are created active immediately. |
| Account deletion | Admin "delete" is a **soft delete**: the row stays, hidden and flagged. Customers have no self-service deletion. Unique values (email, phone, national ID) stay reserved. |
| Uploaded documents | Stored on the server disk or in S3 when `AWS_STORAGE_BUCKET_NAME` is set. Type and size are checked, and the content is sniffed. Downloads need an owner/staff permission check or a signed link that expires in **30 minutes**. Public tracking can download only the *final* result, with order number + phone. Deleting a document is a soft delete; **the file is never removed from storage**. |
| Order data | Orders are never hard-deleted (SRS: "archived logically"). Each status change is logged with actor and time. Internal notes are hidden from customers and providers. |
| Provider data | Providers see only assigned orders and only the documents a service allows them to see. Customers' API currently receives the provider's name, type, city and rating (see B06). |
| Notifications | Stored in-app only. No external email/SMS/WhatsApp channel is enabled (PRD). Password reset/changed emails are the only outbound messages. |
| Audit logs | Sensitive actions are logged with user, action, old/new values, **IP address and user agent**. There is no deletion through the business UI. |
| Consent | The order form **requires** the consent checkbox ("أوافق على استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط…", "I agree that my details and documents are used only to complete this service…"), but **the answer is not stored**: no record, timestamp or text version. |
| Retention | **No automatic retention or purge exists** for accounts, orders, documents, notifications or audit logs. Backups (`scripts/backup.sh`, DB dump + media) are manual and have no rotation. |
| Third parties | Possible S3 storage and an SMTP provider, both configured by deployment; no other processor is integrated. |

**Policy / legal decisions required** (the legal team must supply):
1. Controller identity and a privacy contact channel (links to D05).
2. Purposes of processing and legal basis.
3. Categories of data, including national ID and identity documents.
4. Who receives data: staff, providers, government bodies, hosting/storage/email processors.
5. Retention period per category (accounts, orders, documents, audit logs, backups) and what happens at the end.
6. User rights (access, correction, deletion) and how to request them, given that deletion is soft today.
7. Consent wording and whether consent evidence must be kept.
8. Cross-border storage (if S3 or the hosting is outside Jordan).
9. Security statement, limited to what is true (see table above).
10. Policy version and effective date.

**Recommendation:**
- The legal team supplies the AR + EN text.
- Engineering should not publish retention or deletion promises that the system cannot keep. Today it keeps everything indefinitely and soft-deletes.

---

## 3. B05 — Payment scope

**Current architecture**

| Question | Answer |
|---|---|
| Customer-facing payment today? | **No.** `POST /api/customer/payments/` exists and creates a `pending` record, but **no screen calls it**. |
| Payment / Invoice models functional? | They are records only. `Payment` has methods (cash, bank transfer, card, wallet, gateway), types and statuses. Admins record payments and change status at `/admin/payments`. `Invoice`, `CommissionRule` and `ProviderPayout` exist with no workflow. |
| Gateway? | **No.** Fields `gateway_name`, `gateway_transaction_id` and `gateway_payment_url` exist; no gateway code. |
| Webhook? | **No.** |
| Refund integration? | **No.** Admins can set a status to refunded; no money moves. |
| Sandbox? | **No.** |
| Does payment gate the workflow? | **No.** No order transition reads payment status. Orders freeze `final_price = total` at creation. |
| Approved requirement for online payment? | **None.** The PRD's MVP scope has no payment item; the SRS has none either. The team decision log's row "Should payment be required before completion?" is undecided. |

**Option A — payment out of the current release**
- Engineering:
  - remove or disable `POST /api/customer/payments/` (an unused write path);
  - keep admin manual records as an internal ledger;
  - say on the site that payment is arranged by staff, if that is true.
- Release impact: none on the timeline; audit item B05 becomes NOT_APPLICABLE by recorded decision.

**Option B — payment in the current release**
- Engineering:
  - choose a gateway and contract;
  - checkout flow and UI;
  - webhook endpoint with signature check and idempotency;
  - order/payment state rules (when payment is due, what blocks what);
  - refunds; receipts/invoices;
  - reconciliation report;
  - tests against the gateway sandbox.
- External: merchant account, sandbox and production credentials, PCI scope (hosted page recommended).
- Release impact: a new feature of several weeks, plus a new security review.

**Recommendation: A.** Nothing approved requires online payment for this release. Approving B adds scope, not a fix.

---

## 4. F04 — Customer rejection reason

**Current behaviour**
- **Document rejection:**
  - Staff must type a reason. It is stored in `Document.rejection_reason` and appears only on the staff verify screen ("سبب رفض سابق", previous rejection reason).
  - It is not on the employee order page or any customer page.
  - The customer notification says only that the document "needs correction".
  - The service code's own docstring says the note is "what the customer or provider will use to correct the submission".
- **Order rejection:** the order-level `rejection_reason` **is** already returned to the customer API, and the REJECTED timeline note is customer-visible. So the two kinds of rejection behave differently today.

**Options**

| | A. Exact staff reason | B. Separate customer-facing reason | C. Generic message only |
|---|---|---|---|
| Usefulness to customer | High: says what to fix | High | Low: customer must contact support |
| Accidental internal exposure | Possible if staff write internal remarks there | Low: the internal and customer texts are separate | None |
| Staff behaviour | Must write for the customer | Writes two texts, or picks from a list | No change |
| Auditability | Reason in the audit log already | Both texts auditable | Reason stays internal |
| Localization | Shown in the language staff typed | Can offer AR/EN templates | Fully localized |
| Consistency with order rejection | Same as today's order behaviour | Different | Different (order reason is already shown) |

**Recommendation: A, with the reason box labelled "سيظهر هذا السبب للعميل" ("this reason will be shown to the customer").** Internal remarks keep their existing separate internal-note field. This matches the code's documented intent and the existing order-level behaviour. Option B is the stronger choice if staff frequently write internal remarks in the reason box.

---

## 5. B04 — Account activation

**Current behaviour**
- Registration creates an active customer account immediately.
- Registration is throttled (`auth_register`, 20/hour by default).
- Password reset by email exists for customers and is proven locally.
- Real SMTP delivery has not been verified.
- No SMS provider exists (the SMS channel flag is off and nothing sends SMS).
- Registration reveals that an email or phone is already taken (P2 made the message friendly; hiding the fact requires activation).

| | A. No activation | B. Email verification | C. Phone verification | D. Both / configurable |
|---|---|---|---|---|
| UX | Fastest start | One extra step (click a link) | One extra step (enter a code) | Most friction |
| Abuse prevention | Throttle only; fake emails possible | Real mailbox required | Real phone required (strong for Jordan) | Strongest |
| Account enumeration | "Already registered" answer stays | Can answer "check your email" for every attempt, hiding existence | Same, by SMS | Same |
| Password reset interaction | Reset may go to a mistyped address the customer never owned | Reset goes only to verified addresses | Reset still by email unless SMS reset is added | Consistent |
| Complexity | None | Medium: token model, verify endpoint, resend, blocked-login state, UI | Medium-high: OTP model, rate limits, provider integration | High |
| External dependency | None | **SMTP must work** (also needed for reset) | **SMS provider contract** | Both |

**Recommendation: A for this release.** SMTP is not yet proven and no SMS provider exists. Plan **B** once SMTP delivery is verified, because reset already depends on email and B also closes the enumeration signal. Activation is separate from "verified" (§11).

---

## 6. B06 — Provider identity to customer

**Current behaviour**
- Customer UI: shows no provider identity.
- Customer API (`/api/customer/orders/` and the order detail) returns `assigned_provider`: `id` (internal profile id), `full_name`, `provider_type`, `city`, `rating`, `is_available`.
- Not returned to customers: phone, email, organization, documents uploaded by the provider (except the approved final result), staff identities in the timeline.
- The customer notification says "assigned to the service provider" with no name.

| Option | What is exposed |
|---|---|
| A. Visible | Name, type, city, rating (as the API does today); UI would show them. Phone/contact only if explicitly approved. |
| B. Hidden | Nothing about the provider; "assigned to a provider" only. Internal id not sent. |
| C. Limited | Chosen subset, e.g. type + city + rating, without the name or internal id. |

**Consequences:**
- A builds trust but exposes an individual's name and invites bypassing the platform.
- B maximizes privacy and keeps the platform in the middle.
- C is a compromise.

**Recommendation:** no option is objectively better on business grounds; this is the owner's call. Engineering rule, whatever is chosen: **the customer API returns exactly the fields the customer UI shows** (today it returns more). Safest default if undecided: **B**.

---

## 7. D02 — Customer-facing catalogue wording

**Current behaviour:** two catalogue data phrases still refer to the admin panel. They come from per-service fields; no code-authored text remains on live pages. The code strings in `PublicHomepageTemplate.jsx` ("قابلة للتحديث من لوحة الإدارة", "can be updated from the admin panel") belong to a component no route uses (see engineering debt).

| # | Field | Current text | Services (public) | Why it is poor copy | Proposed Arabic | Proposed English |
|---|---|---|---|---|---|---|
| 1 | `public_price_note_ar` (EN today: "Shared after review.") | يحدد بعد المراجعة من لوحة الإدارة. | 27 (26 public) | Tells the customer about an internal tool; vague about what is determined | يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق. | Final fees are confirmed after document review. |
| 2 | `delivery_note_ar` (EN empty) | تُحدد من لوحة الإدارة | 9 (all also have #1) | Internal reference; no English; repeats #1 in the summary line | تُحدَّد مدة الإنجاز بعد مراجعة الطلب. | The completion time is confirmed after your request is reviewed. |

Proposal #1 is the wording already published on the other 7 services, so it adds no new pricing promise. Neither proposal promises a price, a deadline or a step that does not exist. Not applied.

---

## 8. B10-1 / B10-2 / B10-3 — Parcel / basin model

**Current schema** (`Service.required_information_schema`, real catalogue):
- `parcel_number` "رقم القطعة" (parcel number) and `basin_number` "رقم الحوض" (basin number): type `number`, **required**, in **17** land/property services.
- `field_2fa52c6cfa` "هل تعرف رقم القطعة والحوض؟" ("Do you know the parcel and basin numbers?"): type **`number`** (wrong for a yes/no question), **optional**, in 2 of those services (`request-property-registration-certificate`, `request-cadastral-map`).
- The form engine supports text, textarea, number, email, tel, date, select and checkbox. It has **no conditional show/require rules**.

So in those 2 services a customer who answers "I don't know" is still forced to enter both numbers. In the other 15 they must enter them with no way to say they don't know.

| Option | Behaviour | Fit |
|---|---|---|
| A. Gate | "Do you know the parcel/basin numbers?" yes/no; if yes → both required; if no → hidden/optional and staff find them | Matches the question's evident intent; needs conditional fields (new small feature) |
| B. Always required | Remove the question; both numbers mandatory | Simple; blocks customers who don't know them |
| C. Remove the question | Numbers stay as configured (required) or become optional | Simplest; loses the explicit "I don't know" signal |

**Recommendation: A** (it is what the existing question means).

Until conditional fields exist, an interim with no new feature:
- change the question to a yes/no `select`;
- make parcel/basin optional, with a help text;
- staff confirm the numbers during review.

The owner must also confirm whether the 15 services without the question should get it. Separately, `number` type drops leading zeros. If parcel or basin numbers can start with zero, they should be `text`; the owner or land department confirms.

---

## 9. B10-4 — Additional notes

**Current behaviour**
- `additional_notes` "ملاحظات إضافية" (textarea) is **required in 17 services**.
- 3 other services have a separate optional "هل توجد ملاحظات إضافية؟" ("any additional notes?") textarea.

**Options:** A. always optional / B. always required / C. per service.

**Recommendation: A.**
- A field named "additional" is optional by convention.
- Requiring it makes customers type filler ("لا يوجد", "none"), which adds noise for staff.
- Choose C only for a service where the owner can name what the note must contain. Then relabel the field to say what is needed, e.g. "سبب الطلب" (reason for the request).

---

## 10. B10-7 — Public vs admin service counts

**Current behaviour:** admin lists **38** services; the public catalogue shows **32**. The 6 hidden services:

| Service | Why hidden |
|---|---|
| `service-debug`, `service-debug-2`, `service-debug-3` (named "????") | Hidden; in a hidden category named "???". Corrupted legacy/debug records. |
| `no-criminal-record` | Hidden itself, and in a hidden duplicate "الأحوال المدنية والجوازات" (civil status and passports) category |
| `passport-renewal` | Its category (the hidden duplicate above) is hidden |
| `request-zoning-certificate` | Inactive |

None is deleted.

**Candidate count labels** (instead of forcing counts to match):

| Label (AR / EN) | Definition |
|---|---|
| إجمالي الخدمات / Total services | All non-deleted services (admin) |
| نشطة / Active | `is_active` |
| منشورة للعامة / Published | Active + shown on the public site + category active and shown |
| ظاهرة للعميل / Visible to this customer | Published + scope/organization rules for that customer |

**Recommendation:**
- Show the label next to every count.
- Separately, the owner confirms that the three "????" debug services and the duplicate civil-status category may be cleaned up (a data change; objective but destructive, so not done here).

---

## 11. B10-8 — Verification semantics

**Current behaviour** (after P2, all shown separately):
- `is_active`: can log in.
- `is_verified` ("Business/identity verification status"): editable checkbox for admins; audited on change; **read by no workflow**.
- `is_email_verified`, `is_phone_verified`: read-only in the admin UI. **Nothing in the product sets them.** Only seed scripts and superuser creation set `is_email_verified=True`.

**Questions for the owner:**
1. What does `is_verified` mean: identity documents checked, a business/KYC check, a trusted customer, or nothing (remove it)?
2. Who may set it: admin only, employees, or automatic?
3. Is it manual or derived (e.g. derived from approved ID document + verified phone)?
4. Does any workflow require it (place an order, receive the final result, become a provider)?
5. Should email/phone flags be set only by real verification flows (ties to B04 option B/C), or stay unused?

Activation (B04) controls whether an account can start using the system. Verification is a separate fact and must not be merged with it.

---

## 12. B10-9 — Document definitions

**Current behaviour**
- 69 active master definitions.
- Each service requirement links to one definition and has its own required flag and file rules.
- Existing orders keep a frozen copy of their requirements, so merging definitions does **not** change past orders.

| Group | Definitions (uses) | Differences | Merge risk | Recommendation |
|---|---|---|---|---|
| 1. Additional documents | "أي مستندات إضافية تطلبها الجهة المختصة" (7), "أي وثائق إضافية تطلبها الجهة المختصة" (8) | None (both optional, same file types) | Low | **MERGE** |
| 2. Legal power of attorney | "وكالة قانونية (إن وجدت)" (19), "وكالة قانونية إن وجدت" (1) | Punctuation only | Low | **MERGE** |
| 3. Authorization / power-of-attorney family | "تفويض إن وجد" (8, **required in all 8**), "تفويض خطي" (1), "تفويض خطي أو وكالة" (1), "تفويض خطي أو وكالة عدلية" (1), "وكالة عدلية أو تفويض خطي" (3), "وكالة عدلية" (2), "تفويض أو وكالة للشخص الذي يتابع الإجراءات" (1), "كتاب تفويض من الشركة" (1) | A written authorization, a notarized power of attorney and a company letter are legally different | High | **OWNER REVIEW**. "تفويض خطي أو وكالة عدلية" and "وكالة عدلية أو تفويض خطي" are the same words reordered (**MERGE**). "تفويض إن وجد" ("authorization, if any") is required in every service using it: **RENAME** or make optional. |
| 4. Personal ID | "هوية شخصية" (8; no .doc/.docx), "صورة الهوية" (15), "الهوية" (1) | File types differ | Medium | **MERGE** after the owner picks the file types |
| 4b. Applicant identity | "إثبات شخصية مقدم الطلب" (2), "إثبات شخصية صاحب الطلب" (1), "إثبات شخصية صاحب العلاقة/مقدم الطلب" (1) | Wording only | Low–medium | **MERGE** (or into group 4, owner's choice) |
| — Party-specific IDs | seller, buyer, donor, recipient, heirs, partners, trademark owner | Different people | — | **KEEP** |
| 5. Company registration | "شهادة/بيانات تسجيل الشركة أو المنشأة" (1), "شهادة/سجل الشركة أو المؤسسة" (1) | Wording only | Low | **MERGE** |
| 6. Amended company contract | "عقد ونظام الشركة المعدلان أو النماذج المعتمدة" (1), "عقد/نظام معدل أو النموذج المعتمد" (1) | Wording only | Low | **MERGE** |
| 7. Approvals | "موافقات الجهات المختصة" (1), "موافقات الجهات المختصة بالنشاط" (1), "براءات ذمة/موافقات إضافية من الجهات المختصة" (1); "موافقات مسبقة على الغايات/الأنشطة" (1), "موافقات مسبقة على الغاية الجديدة" (1) | Scope differs slightly | Medium | First three: **OWNER REVIEW**; last two: **MERGE** |
| 8. Cadastral map | "مخطط أراضٍ" (6; required in some), "مخطط أراضٍ إن وجد" (1) | "If any" belongs in the per-service required flag, not the name | Low | **MERGE** (set that service's requirement optional) |

---

## 13. B10-10 — Pricing model

**How it works today**
- `total_fee = base_price + government_fee + service_fee`, unless a partner has a custom price.
- **`base_price` is not the total.** No rule says what `base_price` represents.
- An order freezes `final_price = total_fee` at creation.
- The public payload sends:
  - `total_price` when `show_total_price_public`;
  - `government_fee` when `show_government_fee_public`;
  - `company_fee` (= `service_fee`) when `show_company_fee_public`.
- **`base_price` is never shown separately.**
- `price_type`: fixed, starts_from, quotation, free.
- Real catalogue: 26 public services are `quotation` with all amounts 0 and a note; 7 are `fixed` with all three flags on.

**Objective inconsistency:** for the 7 fixed services the visible parts do not add up. Example: passport renewal shows a **total of 64 JOD** with "رسوم حكومية 20" (government fees) and "رسوم خدمة 12" (service fees). The 32 JOD `base_price` is not shown. Which number is wrong is a pricing decision.

**Display strategies**

| # | Strategy | Notes |
|---|---|---|
| 1 | Total only | Simplest; no breakdown to reconcile |
| 2 | Total + full breakdown (base + government + service) | Parts must add up; base needs a customer label |
| 3 | Government fee + "service fee" where service = base + service_fee | Redefines the fields; needs data review |
| 4 | Note only ("confirmed after review") for quotation services | Current behaviour for 26 services |

**Owner must define:** what `base_price` is, whether government fees are pass-through, and the approved figures per service. No financial rule is assumed here. Engineering rule: whatever is displayed must sum to the displayed total.

---

## 14. Brand / domain

**Current behaviour**
- UI title and header: "خلصني | Khalsni".
- Catalogue prose: "خلّصني" (with shadda).
- Audited site: `khalisni.com`.
- Email sender default: `no-reply@khalisni.local`; contact email `support@khalisni.local`.
- Database and user names, bucket example: `khalisni`.
- Internal guest-account emails: `@guest.khalisni.local` (never shown).
- An inactive old CMS row still has "Khalisni" in its footer text.

```
Arabic brand:   ______________   (خلصني / خلّصني)
Latin brand:    ______________   (Khalsni / Khalisni)
Domain:         ______________   (e.g. khalisni.com)
Email domain:   ______________   (for sender and support mailboxes)
```

The domain does not technically have to match the Latin brand spelling (many brands use a different domain). The visible combination customers see should be chosen on purpose: the site name, the sender address and the support address.

---

## 15. Phone-number policy

**Current behaviour**
- Since P2, registration and profile changes accept an optional `+` and 8–15 digits with spaces, hyphens, dots or parentheses.
- The number is stored **as typed**.
- Tracking (`/track-order`), public final-document download, guest-account reuse and the unique-phone rule all compare the **exact string**.
- So `0791234567`, `+962791234567` and `079 123 4567` count as three different phones: a customer who registered one way and tracks another way gets "not found", and the same person could hold two accounts.
- Guest orders and contact inquiries do not validate format at all.

| Option | Effect | Consequences |
|---|---|---|
| A. Stay permissive | No change | Format mismatches keep breaking tracking and uniqueness |
| B. Jordan-only | Accept only Jordanian numbers | Excludes diaspora/foreign customers; still needs normalization for 07… vs +9627… |
| C. Normalize to E.164 internally, display locally | Store `+962791234567`, show `079 123 4567`; compare normalized | Fixes tracking and duplicates; needs a default country for numbers without a code and a migration of existing phones (collisions must be reviewed) |

**Recommendation: C.** It is the only option that makes tracking reliable. The owner must choose the **default country** applied to numbers typed without a country code (Jordan is the obvious candidate, but that is the owner's policy, not assumed here).

---

# IMPLEMENTATION WORK CREATED BY EACH DECISION

| Decision / option | Backend | Frontend | Migration / data | Content | External service | Test impact |
|---|---|---|---|---|---|---|
| D05 values supplied | — (office hours: new CMS field) | Office hours display; WhatsApp link if wanted (no live page shows it) | Update active CMS row; optional field migration for hours | The values | Working mailbox / WhatsApp number | Footer/contact rendering tests; link checks |
| D05 left blank | — | — | Clear placeholder values | — | — | Existing "not published" path |
| D06 text supplied | Store consent record (order, user, text version, time) | Consent version shown; policy version/date | Consent table migration | AR + EN policy | — | Consent persisted; policy rendered |
| B05-A | Disable customer payment create endpoint | Optional notice | — | Payment statement on site, if true | — | Endpoint closed test |
| B05-B | Gateway client, checkout, webhook (signed, idempotent), state rules, refunds, invoices | Checkout, status, receipts | Payment/order links, invoice numbering | Payment terms | Gateway account + sandbox | Gateway sandbox, webhook replay, refund tests |
| F04-A | Return document `rejection_reason` to owner | Show reason on customer and employee order pages; label reject box | — | Label text | — | Customer sees reason; other customer cannot |
| F04-B | New `customer_reason` field (+ optional reason templates) | Two inputs in reject dialog; show customer reason | Field migration | Reason templates AR/EN | — | Internal reason never leaves staff API |
| F04-C | Generic localized text in notification and page | Generic message | — | Generic text | — | Reason never in customer API |
| B04-A | — | — | — | — | — | — |
| B04-B | Verification token, verify/resend endpoints, login gate, set `is_email_verified` | Verify page, resend, "check your email" | Token table | Email templates AR/EN | **SMTP verified** | Token expiry/reuse, enumeration-neutral answers |
| B04-C | OTP model, rate limits, provider client, set `is_phone_verified` | OTP entry | OTP table | SMS text | **SMS provider** | OTP brute-force limits |
| B04-D | B + C + setting | Both | Both | Both | Both | Both |
| B06-A | Keep fields | Show provider card | — | — | — | UI = API test |
| B06-B | Remove `assigned_provider` from customer serializers | — | — | — | — | Customer payload has no provider data |
| B06-C | Customer-specific provider serializer with the chosen fields | Show chosen fields | — | — | — | Exact field set test |
| D02 approved | — | — | Update 27 `public_price_note_*` and 9 `delivery_note_*` rows (with EN) | Approved texts | — | Public-text scan has no "لوحة الإدارة" |
| B10-1/2/3 A | Conditional rules in schema + server validation (required-if) | Show/hide by answer | Change question to yes/no; add gate to chosen services | Help texts | — | Required-if both ways; old orders unaffected |
| B10-1/2/3 interim | — | — | Question → select; parcel/basin optional | Help text | — | Form validation tests |
| B10-1/2/3 B / C | — | — | Remove question (and set required per answer) | — | — | Schema snapshot tests |
| B10-4 A / C | — | — | Set `required=false` on 17 services (A) or per list (C); relabel | Labels | — | Order creation with/without notes |
| B10-7 | Count endpoints per definition | Labels next to counts | Optional cleanup of debug services and duplicate category | Labels | — | Count per definition |
| B10-8 | Rules for who sets `is_verified`; derivation if chosen | Edit permissions | Possibly backfill | — | — | Permission tests |
| B10-9 | Merge tool or admin action re-pointing requirements | — | Re-point requirements, soft-delete merged definitions, rename | New names | — | Snapshot of old orders unchanged |
| B10-10 1–4 | Expose base or redefine payload | Breakdown that sums to total | Per-service price data review | Price labels | — | Sum equals total |
| Brand | Default sender env | Visible strings if Latin brand changes | Old CMS footer row | Brand copy | DNS, mail domain | Brand string scan |
| Phone C | Normalizer used by register, profile, guest orders, contact, tracking, download | Local display format | Normalize existing phones; review collisions | — | — | Equivalent formats track and dedupe |
| Phone B | Jordan-only rule | Hint | Review existing non-Jordan numbers | — | — | Rejection tests |

---

# ITEMS THAT DO NOT REQUIRE OWNER DECISION

Objective engineering work; listed only, **not fixed**.

| Item | Detail |
|---|---|
| Latent pagination | `admin/orders`, `admin/users`, `admin/providers`, `admin/notifications`, `admin/notification-templates`, `staff/documents`, `admin/service-relations`, `admin/service-provider-assignments`, and customer and provider order lists still read only the first 20 rows. Each holds ≤ 20 today. |
| Flaky responsive test | `client-audit-responsive` intermittently times out (12 s) waiting for a lazy route chunk on the local preview server. |
| Real-device verification | iOS Safari / Android Chrome: virtual keyboard, native file picker, modals (B09). |
| SMTP verification | Reset email delivery to a real mailbox (B04); prerequisite for activation option B. |
| Legacy order recovery | `KH-2026-000001` (and any similar order) must be recovered by an operator with `audit_missing_document_requests` or the staff UI (P1). |
| Staff `<main>` landmark | The staff layout has no `<main>` element. |
| Dead homepage component | `PublicHomepageTemplate.jsx` is used by no route and contains "managed from the admin panel" copy and the only WhatsApp rendering. Remove it, or reuse it deliberately. |
| Duplicate contact source | Admin setting `site.contact` (phone, email) is editable but not read by any public page; the CMS fields are. |
| Unused customer payment write path | `POST /api/customer/payments/` creates records with no UI (also see B05). |
| Consent not stored | The required order consent is validated, then discarded. A record is objectively missing whatever D06 says. |
| Files never removed | Soft-deleting a document leaves the file in storage indefinitely. |
| Backups | Manual only, no rotation or automation (`docs/DEPLOYMENT.md`). |
| Phone rule coverage | Guest order creation and contact inquiries accept any phone text. |
| Mobile app language | Sends no `Accept-Language`, so it gets Arabic API messages and English emails. |
| Repository database behind migrations | `backend/db.sqlite3` lacks later tables (e.g. contact inquiries); any reuse needs `migrate`. |
| Field types | Parcel/basin and national ID fields are typed `number` (leading zeros are lost); see B10-1 for the owner part. |
| Bell UX | No unread badge and no "view all" for customers (closure audit F01 note). |
