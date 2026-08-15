# Known Limitations

Remaining legacy UI:
- Many customer, employee, provider, and admin pages still contain older hardcoded copy and page-specific layouts.
- Service detail still contains some local pricing/fee presentation logic and should be migrated fully to shared display helpers in a later pass.
- The application wizard was not fully restructured into a multi-step component in this pass.

Known backend/domain gaps not implemented:
- No real payment gateway flow was confirmed.
- No real customer-safe two-way chat API was confirmed.
- Dynamic service answers are not stored as structured field-value records.
- Runtime screenshot capture was not available.

Operational cautions:
- Existing frontend test suite remains non-green.
- Existing lint errors remain in untouched files.
- No backend schema migration was performed.
