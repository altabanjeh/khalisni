# Defects and Remediation

| Severity | Defect | Remediation | Verification |
|---|---|---|---|
| HIGH | Admin guarded delete could not archive a `NEW` order | Added the existing admin archive transition for `NEW -> ARCHIVED` | Focused test + 197/197 suite |
| MEDIUM | E2E rule test used a pre-registry payload | Seeded the authoritative document definition and referenced it in the test; serializer remains backward-compatible by code lookup when a definition exists | Focused test + 197/197 suite |
| MEDIUM | Branch deletion emitted an audit event name inconsistent with its contract | Changed audit action to `deactivate_branch` | Focused test + 197/197 suite |

No open CRITICAL or HIGH product defect was found by configured tests. Release evidence gaps are tracked in the final assessment.
