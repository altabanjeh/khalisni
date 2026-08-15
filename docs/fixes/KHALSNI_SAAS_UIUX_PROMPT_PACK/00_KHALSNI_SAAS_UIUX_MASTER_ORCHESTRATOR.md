# KHALSNI — SAAS UI/UX MASTER ORCHESTRATOR

## PURPOSE
Run the complete Khalsni UI/UX improvement program in three controlled phases:

PHASE 1 — AUDIT
PHASE 2 — ENHANCEMENT
PHASE 3 — VALIDATION

The goal is to make the COMPLETE reachable Khalsni interface suitable for a professional SaaS/service platform without rebuilding the existing backend/domain.

## REQUIRED PROMPTS
Run in this exact order:

1. `01_KHALSNI_SAAS_UIUX_AUDIT_PROMPT.md`
2. `02_KHALSNI_SAAS_UIUX_ENHANCEMENT_PROMPT.md`
3. `03_KHALSNI_SAAS_UIUX_VALIDATION_PROMPT.md`

Do not merge phases silently. Each phase has a separate completion gate.

# PHASE 1 — AUDIT
Expected output:
`docs/khalsni-saas-uiux-audit/`

Gate:
- complete route inventory
- critical flows mapped
- evidence/screenshots where possible
- P0–P3 backlog
- SaaS readiness score
- enhancement waves

If FAIL because app cannot run or route inventory is incomplete, STOP and resolve that blocker before implementation.

# PHASE 2 — ENHANCEMENT
Expected output:
`docs/khalsni-saas-uiux-enhancement/`

Must cover:
public
auth
customer
employee/staff
provider
admin
responsive
RTL/LTR
accessibility

Gate:
- complete route migration matrix
- no silent legacy pages
- critical screens visibly enhanced
- production build passes
- no new critical regression

If major route families remain untouched, cannot PASS.

# PHASE 3 — VALIDATION
Expected output:
`docs/khalsni-saas-uiux-validation/`

Gate:
- no blockers
- no critical critical-flow defects
- no critical accessibility defects
- no untracked major legacy visual islands
- overall SaaS UI/UX score >= 4.0 / 5
- no core area below 3.5 / 5
- production build passes
- no new critical regressions

If validation is PARTIAL/FAIL:
1. read `13-remediation-backlog.md`
2. fix BLOCKER/CRITICAL/MAJOR items in order
3. rerun affected tests
4. rerun validation
5. repeat until PASS or a genuine backend/architecture blocker is documented

Do not mark PASS because build alone succeeds.

# SYSTEM-WIDE NON-NEGOTIABLES
Across all phases:
- preserve existing data
- preserve authentication
- preserve permissions
- preserve organization scoping
- preserve order numbers/history
- preserve document security
- preserve backend workflow authority
- preserve provider assignment
- preserve mobile API contracts
- no fake payment
- no fake chat
- no fake progress
- no fake SaaS subscription features
- no unauthorized schema migrations
- no hidden test failures
- Arabic RTL required
- English LTR required
- every reachable production route accounted for

# FINAL PROGRAM REPORT
When all phases finish, create:

`docs/KHALSNI_SAAS_UIUX_PROGRAM_REPORT.md`

Include:
audit result
enhancement result
validation result
routes audited
routes migrated
routes validated
critical-flow results
final SaaS UI/UX score
remaining limitations
known backend/product gaps
production build status
test status
recommended next product step

Final response:

KHALSNI SAAS UI/UX PROGRAM

Audit: PASS / PARTIAL / FAIL
Enhancement: PASS / PARTIAL / FAIL
Validation: PASS / PARTIAL / FAIL
Final SaaS UI/UX score: <x>/5
Production ready from UI/UX perspective: YES / WITH CONDITIONS / NO
Program report: docs/KHALSNI_SAAS_UIUX_PROGRAM_REPORT.md
