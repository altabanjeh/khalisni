# B2B2C Architecture

## Business Model

The platform now supports a B2B2C operating model:

- Platform Owner: owns the SaaS, the global catalog, platform-wide settings, audit, billing policy, and cross-tenant visibility.
- Partner Company: sells services to its own end customers through the platform.
- Branch: operational subdivision under a partner organization.
- Provider Organization: executes assigned service work.
- Final Customer: places and tracks orders through a partner.

The core relationship is:

`Platform Owner -> Partner Organization / Branch / Staff -> Final Customer`

## Core Data Ownership

### Organizations

- `Organization` is the tenant root.
- Types:
  - `platform`
  - `partner`
  - `provider`
  - `customer_company`

### Branches

- `Branch` belongs to exactly one organization.
- Branch-level access is enforced for branch managers.

### Memberships

- `OrganizationMembership` links users to organizations and optional branches.
- Membership role is the authoritative B2B2C role.
- The legacy `CustomUser.role` still exists for compatibility with the current portal flows.

## Role Definitions

### Platform

- `platform_super_admin`: full cross-tenant visibility and management.
- `platform_support`: cross-tenant support visibility with limited write access where allowed.

### Partner

- `partner_owner`: top-level partner owner.
- `partner_admin`: partner-wide administration.
- `branch_manager`: branch-scoped operations.
- `partner_employee`: operational processing role.
- `finance`: billing/reporting visibility.
- `auditor`: read-only audit/reporting visibility.

### Provider

- `provider_admin`
- `provider_employee`

### Customer

- `customer`

## Tenant Isolation Rules

- Tenant isolation is enforced in backend selectors and permissions.
- Frontend filtering is not trusted.
- Platform super admin is the only unrestricted tenant bypass.
- Partner users are scoped to their own organization.
- Branch managers are scoped to their own branch inside their organization.
- Provider users are scoped to orders assigned to their provider organization.
- Customers are scoped to their own orders and their own organization membership/profile.

Implementation points:

- `organizations/selectors.py`
- `orders/selectors.py`
- `config/permissions.py`
- `providers/views.py`
- `payment/views.py`

## Services And Catalog

### Service Scope

Services now support:

- `global`
- `partner_private`
- `partner_customized`

### PartnerServiceConfig

Partners can enable or disable global services and customize:

- display name
- customer-visible price
- visibility

Customer-facing service listing is partner-aware:

- only enabled and visible partner-configured global services are shown for a partner
- partner-private and partner-customized services can be shown only inside their partner context

## Orders

Each order now stores:

- `organization`
- `branch`
- `assigned_provider_organization`
- `service_name_snapshot`
- `service_category_name_snapshot`
- `organization_name_snapshot`

Order ownership rules:

- every order belongs to an organization
- branch must belong to the same organization
- provider access is based on assigned provider organization
- snapshots preserve historical reporting and audit integrity

## Provider Flow

1. Partner/platform assigns a provider profile.
2. The order also stores the provider organization.
3. Provider users can see only orders assigned to their provider organization.
4. Provider uploads final documents and updates provider-owned statuses.

## Billing MVP

Prepared models:

- `Invoice`
- `Payment`
- `CommissionRule`
- `ProviderPayout`

Current MVP coverage:

- data model
- organization ownership
- audit hooks
- service layer helpers in `payment/billing.py`

Not yet included:

- payment gateway integration
- automated subscription billing
- payout disbursement integrations

## Reports

Reports now support grouping by:

- organization
- branch
- category
- service
- provider
- status
- revenue
- completion metrics

Historical reporting uses order snapshots when appropriate.

## Required Screen Map

### Platform Admin

- Platform Dashboard
- Organizations Management
- Partner Onboarding
- Provider Management
- Global Service Catalog
- Global Service Categories
- Service Relations
- Subscription / Billing Settings
- Platform Reports
- System Audit Logs

### Partner Admin

- Partner Dashboard
- Branch Management
- Staff Management
- Customer Management
- Partner Service Catalog
- Service Pricing & Visibility
- Orders Management
- Provider Assignment
- Reports
- Branding Settings

### Branch Manager

- Branch Dashboard
- Branch Orders
- Branch Employees
- Daily Work Queue
- Branch Reports

### Partner Employee

- Assigned Orders
- Document Review
- Missing Document Requests
- Customer Communication
- Order Status Updates

### Provider

- Provider Dashboard
- Assigned Provider Orders
- Upload Final Documents
- Provider Task Status

### Customer

- Customer Portal
- Service Categories
- Order Service
- My Orders
- Required Documents
- Notifications
- Invoices / Payments
- Recommended Services

## Permission Matrix

- Platform super admin: all organizations, all users, all orders, all services, all reports, billing, audit.
- Platform support: cross-tenant support views, scoped writes where explicitly allowed.
- Partner owner/admin: own organization, own branches, own users, own customers, own orders, own reports, own branding, own partner service config.
- Branch manager: own branch operational data only.
- Partner employee: own organization operational queues and allowed workflow actions.
- Provider admin/employee: only assigned provider-organization work.
- Customer: only own orders, documents, notifications, payments.

## MVP Vs Future Roadmap

### MVP Included

- organization, branch, membership, branding, partner service configuration
- tenant-aware selectors and permissions
- order organization ownership and snapshots
- provider organization assignment
- billing foundation models
- tenant isolation tests

### Future Roadmap

- white-label partner public sites by organization slug/domain
- subscription plans and invoice automation
- partner-level customer self-registration portals
- invitation workflows with email acceptance
- SSO / enterprise identity
- provider team workload balancing
- organization-scoped dashboards in frontend navigation
