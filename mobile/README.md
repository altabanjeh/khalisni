# Khalsni Mobile

React Native / Expo mobile extension for the existing Khalsni service-order management system.

## What This App Covers

- JWT authentication with secure session storage
- Role-based navigation for client, employee, provider, and admin
- Client service browsing, order creation, order tracking, and document response
- Employee order review, document verification, missing-document requests, and provider assignment
- Provider assigned-order flow, work-status updates, and final-document upload
- Admin dashboards, orders, users, permissions, services, prices, advertisements, public content, reports, and audit log access
- Shared notifications screen, shared theme, loading/error/empty states, and typed API adapters

## Requirements

- Node.js 20+
- npm 10+
- Expo CLI through `npx expo`
- Running Khalsni backend with API access

## Environment

Create a `.env` file inside `mobile/`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Notes:
- The app automatically appends `/api` if your value does not already include it.
- Do not place production secrets in the Expo app.

## Install

```bash
npm install
```

## Run Development App

```bash
npx expo start
```

Useful variants:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Test On Android And iOS

This is one shared Expo / React Native codebase for both Android and iOS. No separate platform code is required for the current feature set.

### Android local testing

1. Start the backend so the API is reachable.
2. Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env`.
3. Start Metro:

```bash
npx expo start
```

4. Then either:

```bash
npx expo start --android
```

Or scan the QR code with Expo Go on an Android device.

### iOS local testing

On macOS with Xcode installed:

```bash
npx expo start --ios
```

Or open Expo Go on a physical iPhone and scan the QR code from:

```bash
npx expo start
```

Notes:
- iOS Simulator requires macOS.
- From Expo Go on a physical device, make sure the phone can reach the backend host.
- If the backend is running on your computer and you test from a physical device, `127.0.0.1` will not work. Use your machine LAN IP instead, for example `http://192.168.1.20:8000`.

## Manual QA / Feature Testing

Minimum checks:

1. Login with each role.
2. Client creates an order and uploads a document.
3. Employee opens the order, verifies documents, and requests missing documents.
4. Client responds to the missing-document request.
5. Employee assigns the order to a provider.
6. Provider updates work status and uploads the final document.
7. Admin opens dashboards, users, services, prices, advertisements, reports, and audit logs.

The full checklist is in:

- `docs/mobile/mobile_qa_checklist.md`

## Type Check

```bash
npx tsc --noEmit
```

## Android Build

This project is structured for Expo builds. For APK/AAB generation, use EAS:

```bash
npx eas build -p android --profile preview
npx eas build -p android --profile production
```

Build output:

- `preview` profile: Android APK for internal testing
- `production` profile: Android AAB for Google Play

If your team does not already use EAS, install or invoke it with:

```bash
npx eas-cli build -p android --profile preview
```

## iOS Build

```bash
npx eas build -p ios --profile production
```

Build output:

- `production` profile: iOS archive for TestFlight / App Store flow

## EAS Build Configuration

The project includes:

- [eas.json](/d:/ghassan/mobile/eas.json)

Profiles:

- `preview`: internal Android APK and non-store iOS build settings
- `production`: Android AAB and iOS store-ready configuration

Before using production builds, replace the placeholder production API URL in `eas.json`:

```json
"EXPO_PUBLIC_API_BASE_URL": "https://api.example.com"
```

with your real production backend URL.

## Main Project Structure

```text
mobile/
  app/
  src/
    api/
    auth/
    components/
    config/
    constants/
    features/
    navigation/
    permissions/
    screens/
    services/
    state/
    theme/
    types/
    utils/
```

## Backend API Dependencies

The app expects the current Khalsni backend endpoints for:

- auth
- services
- orders
- documents
- providers
- notifications
- admin user management
- reports
- public-site content
- advertisements
- audit logs

See:

- `docs/mobile/mobile_discovery.md`
- `docs/mobile/api_gap_report.md`
- `docs/mobile/mobile_screen_map.md`
- `docs/mobile/mobile_permission_matrix.md`
- `docs/mobile/mobile_qa_checklist.md`

## Known Limitations

- Forgot/reset password is a UI placeholder until backend endpoints exist.
- Notification mark-as-read is blocked by a missing backend endpoint.
- Push notifications are documented but not activated because backend registration/delivery is missing.
- Non-customer profile editing is read-mostly until dedicated backend profile endpoints exist.
- Some admin content/theme editors currently submit JSON payloads directly because field-specific mobile contracts are not fully defined.

## Next Backend Support Recommended

- Add forgot password / reset password endpoints
- Add notification mark-as-read and unread-count endpoints
- Add push token registration and push delivery workflow
- Add self-profile update endpoints for employee, provider, and admin
- Add narrower mobile summary endpoints if payload size becomes a performance issue
