# App Store & Play Store packaging

socialHyve ships as a Vite SPA. Native store builds wrap the production web app with **Capacitor** (iOS + Android) or **Trusted Web Activity** (Android-only alternative).

## Prerequisites

- Node 20+
- Xcode 15+ (iOS)
- Android Studio (Android)
- Apple Developer account + App Store Connect app record
- Google Play Console app record

## Web build

```bash
npm ci
npm run build
npm run generate:pwa-icons   # if icons/splash changed
```

## Capacitor (recommended)

### First-time setup

```bash
npm install
npm run cap:sync
```

This builds the web app and syncs `dist/` into native projects under `ios/` and `android/`.

### Open native IDEs

```bash
npm run cap:ios      # Xcode
npm run cap:android  # Android Studio
```

### Configuration

- [`capacitor.config.ts`](../capacitor.config.ts) — `appId: app.socialhyve`, `webDir: dist`
- Custom URL scheme: `socialhyve://` (Meta/Canva OAuth return — configure redirect URIs in Meta/Canva dashboards)
- Universal Links: [`public/.well-known/apple-app-site-association`](../public/.well-known/apple-app-site-association) — replace `TEAMID` with your Apple Team ID
- App Links: [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) — replace SHA256 with release keystore fingerprint

### Push notifications

Web push via [`public/sw.js`](../public/sw.js) works in installed PWAs. For App Store builds, evaluate migrating to `@capacitor/push-notifications` for better iOS background delivery.

### Store assets

| Asset | Path |
|-------|------|
| App Store icon 1024×1024 | `public/icons/app-store-1024.png` |
| Play Store icon 512×512 | `public/icons/icon-512.png` |
| Maskable icon | `public/icons/icon-maskable-512.png` |
| Splash screens | `public/splash/` |

Regenerate with `npm run generate:pwa-icons`.

## Android TWA (Bubblewrap)

Alternative Play Store path without Capacitor WebView:

1. Install [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap): `npm i -g @bubblewrap/cli`
2. Edit [`twa/twa-manifest.json`](../twa/twa-manifest.json) signing key paths
3. `npm run build:twa` (see package.json)
4. Upload `.aab` to Play Console

Verify Digital Asset Links: [Statement List Tester](https://developers.google.com/digital-asset-links/tools/generator)

## OAuth in native shells

| Flow | Notes |
|------|-------|
| Email/password login | Works in WKWebView / TWA as-is (Supabase) |
| Meta connect | Requires Universal Link or `socialhyve://` callback registered in Meta app settings |
| Canva connect | Same as Meta — add redirect URI for native scheme |

## Store review checklist

- [ ] Allowed mobile features work without horizontal overflow (Queue, composer, settings)
- [ ] Tablet features work (calendar week view, interactions, CSV import, Canva)
- [ ] Blocked desktop features show friendly gate, not broken UI
- [ ] Sign out accessible from header
- [ ] Push permission prompt has clear context (Settings → Profile)
- [ ] No placeholder lorem or broken links on landing/login
- [ ] Privacy policy URL listed in store listing (link to `/faq` or dedicated policy)

## CI release workflow

[`.github/workflows/mobile-build.yml`](../.github/workflows/mobile-build.yml) builds web + runs `cap sync` on version tags. Signing secrets required:

- `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

## Device tier reference

| Tier | Width | Default route |
|------|-------|---------------|
| Phone | `<768px` | `/app/queue` |
| Tablet | `768–1023px` | `/app/calendar` (week) |
| Desktop | `≥1024px` | `/app/calendar` (month) |

See [`src/lib/deviceTier.js`](../src/lib/deviceTier.js) for route gating.
