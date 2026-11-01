# Khalsni Mobile

React Native / Expo mobile extension for the existing Khalsni service-order management system.

## What This App Covers

- JWT authentication with secure session storage
- Role-based navigation for client, employee, provider, and admin
- Customer self-registration, public order tracking (order number + phone), and in-app privacy policy / terms
- Client service browsing, order creation, order tracking, rating, messages with support, and document response
- Employee order review, document verification, missing-document requests, and provider assignment
- Provider assigned-order flow, work-status updates, and final-document upload
- Admin dashboards, orders, users, permissions, services, prices, advertisements, public content, reports, and audit log access
- Shared notifications screen, shared theme, loading/error/empty states, and typed API adapters

## Requirements

- Node.js 20+
- npm 10+
- Expo CLI through `npx expo`
- Running Khalsni backend with API access

## API base URL

The app reads its backend address from **one** place: the build-time variable
`EXPO_PUBLIC_API_BASE_URL` (Expo inlines `EXPO_PUBLIC_*` variables into the
bundle). No backend host is written in the repository, `eas.json` or `app.json`.

- The app appends `/api` when the value does not already end with it.
- Do not place secrets in `EXPO_PUBLIC_*` variables: they are readable in the app bundle.

### Development (Expo Go / `npx expo start`)

Create `mobile/.env` (not committed):

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8000
```

Use your computer's LAN IP when testing from a phone; `127.0.0.1` only works in
a simulator on the same machine. When the variable is missing, a development
bundle falls back to `http://127.0.0.1:8000`.

### Preview and production builds (EAS)

Set the variable as an EAS environment variable for the matching environment
(`eas.json` maps the `preview` profile to the `preview` environment and the
`production` profile to the `production` environment):

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.your-real-domain --visibility plaintext
npx eas-cli env:create --environment preview    --name EXPO_PUBLIC_API_BASE_URL --value https://staging-api.your-real-domain --visibility plaintext
```

Guards (both refuse a missing value, a non-`https://` value, and placeholder or
local hosts such as `example.com`, `*.test`, `localhost`, `127.0.0.1`, `10.0.2.2`):

1. **Build time** - `app.config.js` throws and the EAS build fails for every
   profile except `development` when the value is not a real HTTPS URL.
2. **Run time** - `src/config/env.ts` checks the value again in a production
   bundle (`__DEV__ === false`). If it is not valid, the app shows a blocking
   Arabic "التطبيق غير مهيأ للتشغيل" screen and sends no requests.

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

Before building `preview` or `production`, set `EXPO_PUBLIC_API_BASE_URL` for that
EAS environment (see "API base URL" above). A build without it fails on purpose.

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

## RTL policy

The app is Arabic only (owner decision; there is no English mode). Arabic is
laid out **explicitly** inside a native **LTR** layout:

- text uses `textAlign: 'right'`; rows that must read right-to-left use
  `flexDirection: 'row-reverse'` (the first child is on the right);
- `KeyValueRow` places the label last so it renders on the right;
- the back button sits at the top right with a right-pointing arrow (`AppScreen`).

Native RTL mirroring is switched **off** so these styles are never flipped a
second time on an Arabic-locale phone:

- Android: `plugins/withLtrLayoutLock.js` (added by `app.config.js`) writes
  `android:supportsRtl="false"` into the generated manifest. React Native only
  mirrors when the application supports RTL, so the lock holds from the first
  launch. (Expo Go uses its own manifest; check RTL on a development or EAS build.)
- Both platforms: `index.ts` calls `I18nManager.allowRTL(false)` and
  `I18nManager.forceRTL(false)` before the app registers.

New code must follow the same rule: never rely on `I18nManager.isRTL`, `start`/`end`
or automatic mirroring; write right-aligned text and `row-reverse` rows.

## Safe areas

Every navigator hides the native header and Android runs edge-to-edge
(`android.edgeToEdgeEnabled`). `AppScreen` applies `useSafeAreaInsets()` (top,
sides, and bottom on stacked screens) and shows a «رجوع» back button on every
stacked screen that can go back; the customer tab bar adds the bottom inset to
its height. Screens should render through `AppScreen`, including their loading
and error states.

## Known Limitations

- Forgot/reset password: the reset link opens the web page.
- Push notifications are documented but not activated because backend registration/delivery is missing.
- Non-customer profile editing is read-mostly until dedicated backend profile endpoints exist.
- Some admin content/theme editors currently submit JSON payloads directly because field-specific mobile contracts are not fully defined.

## Next Backend Support Recommended

- Add forgot password / reset password endpoints
- Add push token registration and push delivery workflow
- Add self-profile update endpoints for employee, provider, and admin
- Add narrower mobile summary endpoints if payload size becomes a performance issue
