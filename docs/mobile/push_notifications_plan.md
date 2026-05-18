# Push Notifications Plan

## Current State

The backend already stores notification records and templates, and the app can read notifications through:

- `GET /api/notifications/`
- `GET /api/admin/notifications/`
- `POST /api/orders/{id}/manual-notification/`

What does not exist yet:

- device token registration
- push provider integration
- delivery routing to Expo/APNs/FCM
- unread badge endpoint
- notification read mutation endpoint

Push notifications should therefore be treated as a planned extension, not assumed to exist.

## Recommended Direction

### Option A
Expo Notifications in the app + Firebase Cloud Messaging / APNs underneath.

### Why
- Fits Expo mobile stack.
- Works for both Android and iOS.
- Can coexist with the current in-app notification table.

## Backend Changes Required

### 1. Device registration model
Add a model such as `MobileDevice` with:

- `user`
- `platform` (`ios`, `android`)
- `push_token`
- `app_version`
- `device_name` or `device_id`
- `is_active`
- `last_seen_at`
- `created_at`

### 2. Device registration endpoints

- `POST /api/mobile/devices/`
- `DELETE /api/mobile/devices/{id}/`
- Optional: `POST /api/mobile/devices/refresh-token/`

### 3. Notification dispatch service
Extend notification sending pipeline so `Notification` records with channel `system` can optionally trigger mobile push dispatch when:

- recipient has active mobile device tokens
- notification type is configured for push
- push is not explicitly suppressed

### 4. Notification preferences
Recommended later:

- per-user push preferences
- per-notification-type enable/disable

### 5. Read-state APIs
Needed for accurate badge behavior:

- `POST /api/notifications/{id}/read/`
- `POST /api/notifications/read-all/`
- `GET /api/notifications/unread-count/`

## Mobile App Work Required

1. Request notification permissions after login or onboarding.
2. Register Expo push token with backend.
3. Refresh token when app reinstall/token rotation occurs.
4. Handle foreground notification display.
5. Handle notification tap deep link to related order screen.
6. Sync read state after user opens a notification.

## Rollout Plan

### Phase 1
- Ship in-app notification center only.
- No push, no badge count beyond local list.

### Phase 2
- Add device token registration and unread-count endpoint.
- Add push send support for major order events:
  - missing documents requested
  - provider assigned
  - order ready for delivery
  - order completed

### Phase 3
- Add granular preferences and analytics.

## Security Notes

- Never expose Expo push tokens in logs.
- Device tokens must be user-bound and revocable.
- Push payloads should contain only minimal metadata:
  - notification id
  - order id
  - message summary
- Sensitive document URLs must never be sent in push payloads.
