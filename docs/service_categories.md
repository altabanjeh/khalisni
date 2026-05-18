# Service Categories

## Purpose

Service categories organize the catalog into business-friendly groups such as:

- Government Services
- Shipping Services
- Legal Services
- Business Setup Services
- Translation Services
- Document Attestation
- Visa & Residency Services

Categories are database-driven and managed by Admin users. They affect the public catalog, client order flow, support lookup, service relations, and reports.

## Hierarchy

Categories support parent-child hierarchy.

Examples:

- Government Services
  - Visa & Residency Services
  - Document Attestation
- Shipping Services
  - Local Delivery
  - International Courier

Validation rules:

- category slug is globally unique
- category name must be unique under the same parent
- a category cannot be its own parent
- circular parent chains are blocked

## Service Assignment

Each service belongs to one category.

Rules:

- active services must belong to active categories
- inactive categories cannot be assigned to active services
- service category deletion is avoided; deactivation is preferred
- if active services still exist under a category, category deactivation is blocked until those services are moved or deactivated

## Public Site

Only categories that are both:

- `is_active = true`
- `show_on_public_site = true`

appear in:

- the public categories endpoint
- the public service catalog
- customer-facing service filtering

Services under inactive or internal-only categories are hidden from public and customer order selection.

## Client Ordering Flow

The client order flow is category-driven:

1. Choose service category
2. Choose service within that category
3. Review service details, prerequisites, related recommendations, and required documents
4. Submit order

## Support and Admin

Admin and Support users can view categories in operational screens.

Admin can:

- create categories
- edit categories
- deactivate categories
- reorder categories

Support can:

- view categories and services
- edit only when existing permission policy allows it

## Service Relations

Service relation management now supports category-assisted service selection so source and target services can be narrowed by category before choosing the exact service.

## Reporting

Orders store:

- `service_name_snapshot`
- `service_category_name_snapshot`

This keeps historical reporting stable even if a service is renamed or moved to another category later.

Category-based reporting includes:

- orders by category
- revenue by category
- completed orders by category
- delayed orders by category
- average completion time by category

## Examples

### Government Services

- Category: Government Services
- Child categories: Visa & Residency Services, Document Attestation
- Services: Residency Renewal, Ministry Attestation, Passport Renewal

### Shipping Services

- Category: Shipping Services
- Child categories: Local Delivery, International Courier
- Services: Domestic Parcel Delivery, International Document Shipment
