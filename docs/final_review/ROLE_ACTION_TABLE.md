# ROLE ACTION TABLE

| Role | Can Do | Cannot Do | Needs Approval | Notes |
|---|---|---|---|---|
| Client | Create own order, upload required documents, respond to missing-document requests, track own order, view final result if allowed, rate completed order | Access another client order, complete order, assign provider, view internal notes, edit protected workflow fields | Some services may need employee review before moving forward | Public order creation is the current submit step |
| Employee | Start review, review documents, request missing documents, assign provider if allowed, return provider work with reason, complete order through safe completion flow, send allowed manual templates | Access admin settings, delete audit logs, bypass protected workflow actions, complete through generic status route, access unrelated client orders | Provider assignment and completion policy still need final business confirmation | Employee and support are treated together for many workflow rules |
| Provider | View assigned orders only, start work, update progress, upload final result, see return reason when work is sent back | Access unassigned orders, view internal notes, view hidden customer data, assign self, complete order directly | Provider approval and activation are controlled by admin | Provider final upload is the current work-complete action |
| Admin | Manage safe service rules, manage required-document rules, approve providers, activate or deactivate providers, manage safe notification templates, view audit logs, cancel active orders with reason, reopen completed orders with reason if allowed | Delete audit logs, freely bypass protected order workflow, directly complete through unsafe path, create admin-level users unless super admin | Admin-level user actions and some sensitive settings need super admin | Admin can manage business rules but not everything |
| Super Admin | Create admin-level users, manage the most sensitive access areas, keep final control over restricted administration actions | Should not be used for normal daily operations | No higher role in current model | Super admin is a technical privilege on top of admin role |
| Support | In practice behaves like employee for much of the workflow review scope | Same limits as employee where grouped together | Same business approvals as employee | Team should confirm whether support should stay equal to employee |

## Appendix: Technical Reference Sources

- `docs/system_review/ROLE_PERMISSION_MATRIX.md`
- `docs/system_review/ORDER_WORKFLOW_MATRIX.md`
- `docs/fixes/PHASE_2_ORDER_FLOW_SERVICE.md`
- `docs/fixes/PHASE_4_ADMIN_RULE_MANAGEMENT.md`
