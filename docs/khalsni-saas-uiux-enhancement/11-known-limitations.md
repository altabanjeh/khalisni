# Known Limitations

Remaining limitations:
- Full route-by-route before screenshots are not available because the repository was already in a transformed working-tree state when this prompt was run. Audit screenshots were copied into `before/` as the nearest available baseline evidence.
- Authenticated after screenshots were captured for representative protected routes, not every protected route at every viewport.
- Automated accessibility tooling such as axe was not installed or run.
- Arabic locale file contains pre-existing encoding artifacts in terminal output; uploader Arabic behavior is handled through Arabic fallbacks in `FileUploader` rather than new Arabic JSON keys.
- English service/category data quality is still a backend/content governance issue. The UI now avoids Arabic-script public service card fallbacks in English mode, but missing English content should still be corrected in data.

Evidence:
- `docs/khalsni-saas-uiux-enhancement/before/`
- `docs/khalsni-saas-uiux-enhancement/after/`
- `frontend/src/components/FileUploader.jsx`
- `frontend/src/utils/servicePresentation.js`
