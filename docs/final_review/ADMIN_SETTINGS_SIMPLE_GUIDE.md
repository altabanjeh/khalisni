# ADMIN SETTINGS SIMPLE GUIDE

## Purpose

This guide explains the main admin-controlled business settings in simple language.

Risk levels used here:

- Low: normal business setting
- Medium: affects workflow or visibility
- High: can affect access, compliance, or system safety

| Setting Name | Meaning | What Happens If Enabled | What Happens If Disabled | Risk Level | Who Can Edit It |
|---|---|---|---|---|---|
| Service Active | Controls whether a service can be used for new orders | Clients can create new orders for that service | New orders for that service stop | Medium | Admin |
| Provider Required | Controls whether a provider must be assigned for the service | Order must go through provider assignment before provider work can begin | Internal team can handle the order without provider assignment | Medium | Admin |
| Employee Review Required | Controls whether staff review is required before processing | Order must be reviewed internally before moving forward | Order can move with fewer internal checks, depending on workflow design | High | Admin |
| Base Price | Main service price | New orders use the updated base amount | New orders keep the previous base amount | Medium | Admin |
| Government Fee | External official fee added to the service | New orders include this official fee | New orders do not include that fee | Medium | Admin |
| Extra Service Fee | Additional company fee for the service | New orders include this extra service fee | New orders do not include that extra fee | Medium | Admin |
| Estimated Duration | Expected service time | Staff and providers see a longer or shorter expected deadline | Deadline estimate becomes shorter or absent depending on value | Low | Admin |
| Required Document Rule | Controls which documents the client must provide for a service | New orders must include or later provide the selected documents | New orders are not forced to provide that document | High | Admin |
| Document Requires Verification | Controls whether uploaded documents need internal approval | Staff must verify the document before workflow continues where required | Document may be accepted automatically when business rules allow it | High | Admin |
| Client Can Replace File | Controls whether client can upload a replacement for the same document type | Client can submit a corrected or newer copy | Client cannot replace that file after upload | Medium | Admin |
| Provider Can View File | Controls whether provider may see a client document | Provider can access the allowed client document during work | Provider cannot view that document | High | Admin |
| Provider Approval | Controls whether a provider is approved for business use | Provider can be considered for assignment | Provider cannot be used for assignment | High | Admin |
| Provider Activation | Controls whether provider account is active | Provider can log in and work | Provider cannot log in or receive work | High | Admin |
| Notification Template Active | Controls whether a message template is available for use | Template can be used by the notification system or safe manual actions | Template is hidden and not used | Medium | Admin |
| Safe System Setting | Controls approved business-level system behavior | The selected business behavior becomes active | The selected business behavior stays off | High | Admin or Super Admin depending on the setting |
| Admin-Level User Creation | Controls creation or promotion of admin-level users | More high-power users can be created | Only existing top-level access can manage admin-level roles | High | Super Admin |

## Practical Guidance

### Safe to change during normal operations

- Service active or inactive state
- Price values
- Estimated duration
- Notification wording

### Change carefully

- Provider required
- Employee review required
- Required-document rules
- Provider can view file
- Client can replace file

### Escalate before changing

- Admin-level access
- Sensitive system settings
- Anything that changes who can approve, complete, reopen, or cancel orders

## Appendix: Technical Reference Sources

- `docs/system_review/ADMIN_CONFIG_RULES.md`
- `docs/fixes/PHASE_4_ADMIN_RULE_MANAGEMENT.md`
- `docs/fixes/PHASE_5_AUDIT_NOTIFICATION_REPORTING.md`
