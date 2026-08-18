# Current Service Data Model

## Entities

| Entity | Relevant fields | Relationships / constraints |
| --- | --- | --- |
| `ServiceCategory` | `name_ar`, `name_en`, `slug`, descriptions, `display_order`, `sort_order`, `is_active`, `show_on_public_site`, soft-delete fields | Unique `slug`; active Arabic names unique under the same parent; protected by soft delete. |
| `Service` | localized names/descriptions, `slug`, `required_information_schema`, pricing fields, public price flags, duration fields, `provider_required`, `requires_manual_review`, public/active flags | Unique `slug` and generated `service_number`; belongs to a category; protected by soft delete. |
| `RequiredDocumentDefinition` | `code`, localized names/descriptions, upload rules, active/soft-delete fields | Active non-deleted `code` and `name_ar` are unique. |
| `ServiceRequiredDocument` | service, definition, `document_type`, localized labels, instructions, `is_required`, upload rules, display order | Unique active link per service/document type and per service/document definition. |
| `ServiceRelation` | prerequisite/recommended/alternative relations | Unique non-deleted source/target/type; prevents circular required prerequisites. |
| `ServiceProviderAssignment` | service/provider pair | Used only when `Service.provider_required` is true; does not create provider accounts. |
| `Order` | service snapshot, status, provider/employee assignment, documents, price and duration snapshots | Request workflow uses service document requirements and provider flag. |

## Dynamic Forms

Customer-supplied fields are stored in `Service.required_information_schema` as JSON and rendered by the frontend dynamic field helpers. Supported rendered types are text, textarea, number, email, tel, date, select, and checkbox. The current platform has no first-class repeater/group, customer eligibility, dynamic-question table, or conditional-document rule table.

## Pricing And Duration

Pricing is stored on `Service` using `price_type`, `base_price`, `government_fee`, `service_fee`, and public visibility flags. Unknown prices are represented with zero internal numeric values, `price_type=quotation`, and `show_total_price_public=False`, with a public note. Duration currently requires a numeric fallback, so source text is preserved in `delivery_note_ar`.
