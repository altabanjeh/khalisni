# Public/Auth Validation

Status: PASS

Validated:
- Homepage is active on `/` and is not a legacy/unrelated page.
- Services directory shows real category/service data.
- English service cards now avoid Arabic-script fallback in the main card title/description area when English values are missing.
- Service detail route renders.
- Tracking route renders and automated valid/invalid lookup tests exist.
- Login route renders in English and automated role redirect tests pass.
- Public create-order route safely gates unauthenticated users into account creation.

Remaining conditions:
- Some backend/content records still contain incomplete English data, so content governance is still required.
- Full password recovery browser flow was source-confirmed but not fully screenshot-tested.

Evidence:
- `docs/khalsni-saas-uiux-validation/screenshots/public-home-ar-1440.png`
- `docs/khalsni-saas-uiux-validation/screenshots/public-home-en-390.png`
- `docs/khalsni-saas-uiux-validation/screenshots/services-en-1024.png`
- `docs/khalsni-saas-uiux-validation/screenshots/service-detail-ar-1440.png`
- `docs/khalsni-saas-uiux-validation/screenshots/tracking-en-768.png`
- `docs/khalsni-saas-uiux-validation/screenshots/login-en-1024.png`
- `frontend/src/pages/public/LoginPage.test.jsx`
- `frontend/src/pages/public/TrackOrderPage.test.jsx`

