# Software Requirements Specification

## Overview

Khalisni is an Arabic-first service request management platform for Jordanian government and administrative workflows. The MVP supports customer self-service, operations review, provider execution, auditability, and reporting.

## Actors

- Customer
- Admin / Operations
- Provider
- Support
- Public visitor

## Functional Requirements

1. Public users can browse active categories and services.
2. Public users can create a service request with customer data and file uploads.
3. Public users can track an order by order number and phone number.
4. Customers can authenticate, view their orders, upload missing documents, and rate completed services.
5. Admins can manage services, categories, providers, orders, reports, notifications, and audit logs.
6. Providers can access only assigned orders, add execution notes, update progress, and upload final documents.
7. Support users can view orders and add customer-visible messages, but cannot change prices or delete records.
8. Every order status change must produce a status log.
9. Sensitive operations must produce audit logs.
10. Uploaded files must be validated for type and size.

## Non-Functional Requirements

- Arabic-first RTL interface.
- Responsive web UI for desktop and mobile.
- JWT-based authentication for API access.
- PostgreSQL for production persistence.
- Dockerized deployment.
- Protected document download paths.

## Business Rules

- Order number format: `KH-YYYY-######`
- Order cannot be assigned while still `NEW`.
- Reject actions require a reason.
- Completion requires a final document or admin confirmation.
- Internal notes are hidden from customers.
- Customer cannot mutate order status.
- Provider cannot assign orders or access finance reports.
- Orders are archived logically, not hard-deleted.

