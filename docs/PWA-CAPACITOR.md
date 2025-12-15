# PWA Wrapping with Capacitor (Phase 2)

Overview
- Package the PWA as native shells for iOS/Android using Capacitor.

Steps (high level)
1) `npm create @capacitor/app` in `frontend/` (or add Capacitor to existing app)
2) Configure `server.url` for dev and `server.androidScheme` for production
3) Add platforms: `npx cap add android`, `npx cap add ios`
4) Build web app: `npm run build`; then `npx cap copy`
5) Open native projects for testing: `npx cap open android` or `ios`

Notes
- Keep API base URL configurable; use secure cookies if feasible, otherwise switch to token headers on mobile builds.
- Notifications and background sync are out of MVP scope.
