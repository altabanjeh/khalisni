# Application Flow

Current state preserved:
- Customer order creation remains on `/customer/orders/new`.
- Public order entry remains `/create-order`.
- The customer route still submits to `api.createOrder(formData)`.
- Dynamic service fields continue to be read from `Service.required_information_schema` through `getServiceSchemaFields`.
- Submitted dynamic answers continue to be appended to notes through `buildDynamicNotes`, matching the current backend storage behavior.
- Required documents continue to use service required-document definitions and existing backend file validation.

Not changed:
- No new request/application schema.
- No fake payment form added.
- No new document upload system added.

Known gap:
- Structured historical storage of dynamic service answers remains a backend/domain gap and was not implemented because it would require schema/domain work.
