# OuraFree Mobile — Build & Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | `brew install node` |
| EAS CLI | ≥ 10 | `npm install -g eas-cli` |
| Expo account | free | https://expo.dev/signup |
| Apple Developer | $99/yr | Only for TestFlight / App Store |

---

## First-time setup (run once)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Log in to your Expo account
```bash
eas login
# Enter your Expo account email + password
```

### 3. Link the project to EAS
```bash
cd mobile/
eas build:configure
```
This adds `extra.eas.projectId` to `app.json` (needed for cloud builds).

---

## Environment variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_API_URL` | `https://oura-api.stockmaniacs.net` | Backend URL baked into app bundle |

These are set in `eas.json` per-profile. No `.env` file needed for EAS builds
(EAS injects them at build time). For local dev, create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://oura-api.stockmaniacs.net
```

---

## Build profiles

### Preview build — iOS Simulator (FREE, no Apple account needed)

Produces a `.app` that runs in Xcode Simulator. No signing required.

```bash
eas build --platform ios --profile preview
```

When done (~10–15 min), EAS prints a download URL. Either:
```bash
# Download + open automatically
eas build:run --latest

# Or download manually and drag to Simulator
```

### Production build — TestFlight / App Store

Requires an Apple Developer account ($99/yr).

```bash
eas build --platform ios --profile production
```

Then submit to TestFlight:
```bash
eas submit --platform ios
```
EAS will ask for your App Store Connect credentials interactively.

### Development build — physical device with hot reload

For day-to-day development on a real iPhone (requires Apple account):
```bash
eas build --platform ios --profile development
# Install via QR code shown in output
expo start --dev-client
```

---

## Android build (future)

Android requires no paid developer account for sideloading (APK).
Google Play needs a one-time $25 registration.

```bash
# Sideload APK (free)
eas build --platform android --profile preview

# Google Play AAB
eas build --platform android --profile production
eas submit --platform android
```

Add this to `eas.json` under `build.preview` and `build.production` if you want
Android targets (the current config works as-is):
```json
"android": {
  "buildType": "apk"    // for preview/sideload
  "buildType": "app-bundle"  // for Play Store
}
```

---

## TestFlight submission — step by step

### Apple Developer Portal setup (manual steps)

1. **Create App ID**
   - Go to https://developer.apple.com/account/resources/identifiers
   - Register new identifier → App IDs → App
   - Bundle ID: `com.stockmaniacs.ourafree`
   - Capabilities: none needed

2. **Create app in App Store Connect**
   - Go to https://appstoreconnect.apple.com/apps
   - Click **+** → New App
   - Platform: iOS
   - Bundle ID: `com.stockmaniacs.ourafree`
   - SKU: `ourafree`
   - Primary Language: English

3. **Fill in `eas.json` submit config** (after you have the ASC App ID):
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "stockmaniacsdotnet@gmail.com",
         "ascAppId": "<10-digit number from App Store Connect>",
         "appleTeamId": "<TEAMID from developer.apple.com>"
       }
     }
   }
   ```

4. **Run the build + submit**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

5. **In App Store Connect → TestFlight tab**
   - Wait for build processing (~30 min after upload)
   - Add internal testers (up to 25, no review needed)
   - External testers require a 1–3 day TestFlight review

---

## Checking build status

```bash
eas build:list               # all builds
eas build:view <build-id>    # specific build
```

Or visit https://expo.dev/accounts/[username]/projects/oura-free/builds

---

## Local development (no EAS)

```bash
cd mobile/
npx expo start       # opens Metro + QR code
npx expo start --ios # opens iOS Simulator directly (needs Xcode)
```

For a full native build locally (needs Xcode 15+):
```bash
npx expo run:ios
```

---

## Auto-sync cron (VPS)

The Contabo VPS runs a daily cron at **06:00 IST (00:30 UTC)** that triggers
a fresh Oura data export + ingest:

```
30 0 * * * curl -s -X POST \
  https://oura-api.stockmaniacs.net/api/v1/automation/sync \
  -H "X-API-Key: $OURA_API_KEY" >> /var/log/oura-free/sync.log 2>&1
```

Check cron logs:
```bash
ssh contabo-vps tail -f /var/log/oura-free/sync.log
```

Backend status:
```bash
curl -s https://oura-api.stockmaniacs.net/api/v1/sync/status \
  -H "X-API-Key: <your-key>"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `eas: command not found` | `export PATH="$HOME/.npm-global/bin:$PATH"` |
| Build fails with "missing credentials" | Run `eas credentials` to set up signing |
| `Error: Project not linked` | Run `eas build:configure` first |
| Simulator build won't install | Run `eas build:run --latest` or drag `.app` to Simulator window |
| Network Error in app | Add API key in Settings screen first |
| "Page not initialized" (OTP) | Restart backend: `ssh contabo-vps systemctl restart oura-free` |
