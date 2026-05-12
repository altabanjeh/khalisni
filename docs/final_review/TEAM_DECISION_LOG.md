# TEAM DECISION LOG

| Decision Needed | Options | Recommended Option | Decided By | Final Decision | Notes |
|---|---|---|---|---|---|
| Who can assign provider? | Admin only, Employee only, Admin and Employee | Admin and Employee |  |  | Current system supports Admin and Employee |
| Can employee complete order? | Yes, No, Only with verification complete | Only with verification complete |  |  | Current safe flow already expects verification before normal completion |
| Can admin reopen completed order? | Yes always, Yes with reason, No | Yes with reason |  |  | Current system supports reopen with reason |
| Can client cancel order? | Any time, Early stage only, Never | Early stage only |  |  | Current workflow currently limits client cancellation |
| Which documents are required per service? | Fixed global list, Per service list, Per service and category mix | Per service list |  |  | Current admin tools support per-service rules |
| Should provider see client name? | Full name, First name only, No direct name | No direct name unless business requires it |  |  | Provider currently sees limited work details rather than full customer object |
| Should payment be required before completion? | Always required, Required for selected services only, Not required | Required for selected services only |  |  | Current system does not strongly block completion on payment state |
| Who can cancel active orders? | Admin only, Admin and Employee, Admin Employee and Client | Admin only for later stages |  |  | Team should confirm if employee cancellation should remain |
| Should support role act like employee? | Yes fully, Limited subset, No | Limited subset |  |  | Current backend groups support with employee in many places |
| Should emergency completion override remain? | Keep, Remove, Keep only for super admin | Keep only for exceptional controlled use |  |  | Current system still has an override path in some cases |
| Should provider reassignment be allowed after first assignment? | Yes freely, Yes with reason, No | Yes with reason |  |  | Current system does not yet expose a dedicated reassignment flow |
| Should provider see client documents? | All client documents, Only allowed service documents, No client documents | Only allowed service documents |  |  | Current system already supports limited provider file visibility |
| Should completed orders be editable directly? | Yes, Limited fields only, No | No |  |  | Current protected flow already blocks normal direct edits |
| Should audit logs ever be deletable? | Yes, Super admin only, Never through business UI | Never through business UI |  |  | Current admin behavior already treats audit logs as read-only |
| Should more business settings be editable by admin? | Yes broadly, Only whitelisted safe settings, No further settings | Only whitelisted safe settings |  |  | Current safe-settings model follows this approach |

## How To Use This Log

1. Review one row at a time.
2. Choose the business answer.
3. Record the owner who made the decision.
4. Update the final decision column.
5. Add implementation follow-up only after the decision is clear.

## Appendix: Technical Reference Sources

- `docs/system_review/ROLE_PERMISSION_MATRIX.md`
- `docs/system_review/ADMIN_CONFIG_RULES.md`
- `docs/fixes/PHASE_2_ORDER_FLOW_SERVICE.md`
- `docs/fixes/PHASE_4_ADMIN_RULE_MANAGEMENT.md`
- `docs/fixes/PHASE_5_AUDIT_NOTIFICATION_REPORTING.md`
