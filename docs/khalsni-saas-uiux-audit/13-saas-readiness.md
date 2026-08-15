# SaaS Readiness

Status: PARTIAL

Khalsni has the required SaaS role surfaces and service-delivery flows. It is not fully certified as production-ready from UI/UX perspective because protected-route screenshot coverage, full LTR validation, accessibility automation, and route-level performance measurements are incomplete.

Ready to extend:
- Public service discovery and tracking shell.
- Role-based route structure.
- Shared tables, modals, status badges, upload component, and language context.

Do not break:
- Protected route role boundaries.
- Service request creation and tracking flows.
- Customer missing-document response.
- Employee order review.
- Provider order detail upload behavior.
- Admin users/roles and provider-service assignment flows.

Must refactor or standardize before major transformation:
- Admin navigation grouping.
- English content completeness and hardcoded copy.
- Dense work-queue/table patterns.
- Permission/session feedback states.
- Accessibility and authenticated screenshot automation.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:158-242`
- `npm test`: PASS, 20 files / 35 tests
- `npm run build`: PASS
