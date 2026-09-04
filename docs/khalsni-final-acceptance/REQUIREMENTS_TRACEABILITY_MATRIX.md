# Requirements Traceability Matrix

| ID | Requirement | Source | Backend/API | Frontend | Runtime/Test Evidence | Status | Defect |
|---|---|---|---|---|---|---|---|
| KH-ARCH-01 | Single authoritative domain models | models/migrations | `services`, `orders`, `documents` | API clients | source review | PASS | None |
| KH-AUTH-01 | Role-protected routes and APIs | routes/permissions | DRF permissions | `ProtectedRoute` | 197 backend tests; auth UI tests | PARTIAL | Full role-browser matrix not rerun |
| KH-PUBLIC-01 | Public browsing/search/auth routes | `AppRoutes` | public services APIs | public pages | 42 frontend tests; prior live audit | PARTIAL | No committed E2E suite |
| KH-CAT-01 | Optional admin category images | services model/serializers | multipart, nullable image | admin form/card fallback | 31 catalog tests | PASS | None |
| KH-SVC-01 | Optional independent service images | services model/serializers | multipart, nullable image | admin form/card fallback | 31 catalog tests | PASS | None |
| KH-PRICE-01 | Configured public price visibility | service serializers/presentation | visibility flags | cards/details | backend/frontend tests | PASS | None |
| KH-DURATION-01 | Real duration/range rendering | service model/serializers | duration fields | presentation helper | frontend tests/source review | PASS | None |
| KH-DOC-01 | Registry-backed required documents | required-document models | validated admin API | request forms | 197 backend tests | PASS | None |
| KH-REQ-01 | Existing request lifecycle preserved | workflow rules/services | guarded transitions | existing request screens | 197 backend tests | PASS | None |
| KH-DELETE-01 | Guarded soft archive/delete and audit | delete guard/workflow | password guard/audit | admin UI | 197 backend tests | PASS | Remediated archive rule/audit action |
| KH-I18N-01 | Arabic RTL and English LTR | language context/locales | localized data fields | direction shell | prior live audit, frontend tests | PARTIAL | Automated LTR/RTL E2E absent |
| KH-UI-01 | Light customer visual system | UI reports/tokens | N/A | shared public primitives | prior 180-route browser audit | PARTIAL | Current-gate screenshot tooling unavailable |
| KH-MOBILE-01 | Public mobile usability | UI/mobile reports | N/A | responsive layouts | prior 360-768 audit | PARTIAL | No committed device E2E |
| KH-SEC-01 | Input/media/permission safeguards | validators/permissions | DRF/model validation | safe client use | backend tests/source review | PARTIAL | No dependency/vulnerability scan configured |
| KH-A11Y-01 | Semantic/focus/alt/contrast baseline | UI components | N/A | semantic controls | source/prior manual review | PARTIAL | No axe runner |
| KH-PERF-01 | Lazy catalog media/code split | Vite/routes/cards | N/A | lazy routes/images | production build/prior browser review | PARTIAL | No benchmark or RUM |
| KH-TEST-01 | Green configured test suite | package/manage scripts | 197 backend | 42 frontend | executed 2026-09-04 | PASS | None |
