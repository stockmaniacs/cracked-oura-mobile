# OuraFree

Self-hosted Oura ring dashboard — web app + iOS app (Android-ready).

Fork of [Cracked-Oura](https://github.com/cracked-oura/cracked-oura), adapted for a multi-client stack:
FastAPI backend on a VPS → Cloudflare edge → React web + React Native iOS.

---

## Architecture

```
Oura Ring → Oura Servers (moi.ouraring.com)
                   │
                   │  Playwright automation (daily, 05:45 IST)
                   │  Downloads personal data export ZIP
                   ▼
         ┌─────────────────────┐
         │   FastAPI + SQLite  │
         │   contabo-vps:8091  │
         │   Uvicorn / systemd │
         └─────────┬───────────┘
                   │  Cloudflare Tunnel (oura-api.stockmaniacs.net)
                   │  HTTPS, CORS, X-API-Key auth
                   │
          ┌────────┴────────┐
          ▼                 ▼
   ┌─────────────┐   ┌─────────────────────┐
   │   Web App   │   │      iOS App         │
   │ React/Vite  │   │  React Native/Expo   │
   │  Tailwind   │   │  expo-router tabs    │
   │  Recharts   │   │  gifted-charts       │
   │     CF Pages│   │  TestFlight / App    │
   │ oura.stock  │   │  com.stockmaniacs   │
   │ maniacs.net │   │    .ourafree         │
   └─────────────┘   └─────────────────────┘
```

---

## Quick start

### Prerequisites
- Python 3.11+, Node 18+
- A VPS with Playwright system deps installed
- Oura ring + account (any tier — uses data export, not API)

### 1. Backend
```bash
cd backend/
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium --with-deps

cp .env.example .env          # fill in SECRET_KEY
uvicorn backend.src.api.main:app --host 0.0.0.0 --port 8091
```

### 2. Web app
```bash
cd web/
npm install
cp .env.example .env.local     # set VITE_API_URL
npm run dev                    # http://localhost:5173
```

### 3. iOS app
```bash
cd mobile/
npm install
npx expo start --ios
# Open Settings → paste API key → Save
```

---

## Deployment

### Backend (VPS + Cloudflare Tunnel)
```bash
# On VPS
sudo systemctl enable --now oura-free
# Cloudflare Tunnel → oura-api.stockmaniacs.net → localhost:8091
```

### Web app (Cloudflare Pages)
Push to `main` → GitHub Actions → `wrangler pages deploy web/dist`

Custom domain: **oura.stockmaniacs.net** (set in CF Pages dashboard)

### iOS app (EAS Build + TestFlight)
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview     # simulator (free)
eas build --platform ios --profile production  # TestFlight ($99/yr Apple)
eas submit --platform ios
```

See [mobile/docs/BUILD.md](mobile/docs/BUILD.md) for full guide.

---

## Data sync

Oura data is synced via Playwright automation:

| Trigger | Endpoint | When |
|---------|----------|------|
| Daily cron | `POST /api/v1/automation/sync` | 05:45 IST |
| Manual (web) | Settings → Sync Now | on demand |
| Manual (iOS) | Today → Sync Now | on demand |
| API | `POST /api/v1/automation/sync` | any time |

The automation:
1. Logs in to Oura using a saved session (refreshes with OTP if expired)
2. Requests a new personal data export
3. Polls until the ZIP is ready (up to 2.5 hours)
4. Downloads → parses → ingests into SQLite

**First run requires a one-time OTP** — trigger via the web Settings page or API.

---

## API reference (key endpoints)

All endpoints require `X-API-Key: <your-secret-key>` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/summary/today` | Today's scores + details |
| `GET` | `/api/v1/summary/week` | 7-day averages + arrays |
| `GET` | `/api/v1/sleep?days=N` | Sleep history |
| `GET` | `/api/v1/readiness?days=N` | Readiness history |
| `GET` | `/api/v1/activity?days=N` | Activity history |
| `GET` | `/api/v1/hrv?days=N` | HRV history |
| `GET` | `/api/v1/sync/status` | Sync status + record counts |
| `POST` | `/api/v1/automation/sync` | Trigger full sync |
| `POST` | `/api/v1/automation/start-login` | Begin OTP login |
| `POST` | `/api/v1/automation/submit-otp` | Submit OTP code |
| `POST` | `/api/v1/automation/download-latest` | Download existing export |

Full docs at `https://oura-api.stockmaniacs.net/docs` (FastAPI Swagger UI).

---

## Adding Android

One command when ready:
```bash
eas build --platform android --profile preview   # APK for sideloading (free)
eas build --platform android --profile production # AAB for Play Store ($25 one-time)
eas submit --platform android
```

No code changes needed — the React Native app is already Android-compatible.
Add `android.buildType` to the relevant `eas.json` profiles if needed.

---

## Environment variables

| File | Variable | Description |
|------|----------|-------------|
| `backend/.env` | `SECRET_KEY` | API auth key (generate with `openssl rand -hex 32`) |
| `web/.env.production` | `VITE_API_URL` | Backend URL |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` | Backend URL (baked at build time) |

---

## Project structure

```
oura-free/
├── backend/          FastAPI + SQLite + Playwright automation
├── web/              React / Vite / Tailwind / Recharts
├── mobile/           React Native / Expo / expo-router
│   ├── src/
│   │   ├── screens/  TodayScreen, SleepScreen, ReadinessScreen,
│   │   │             ActivityScreen, SettingsScreen
│   │   ├── components/ ScoreRing, StatCard, TrendChart, SyncButton
│   │   ├── api/      Axios client + SecureStore auth
│   │   ├── hooks/    useOuraData (cached query hook)
│   │   └── types/    oura.ts — shared domain types
│   └── docs/         BUILD.md — EAS + TestFlight guide
├── upstream-source/  Original Cracked-Oura fork (reference + git root)
└── docs/             Architecture, folder structure
```

---

## Credits

Based on [Cracked-Oura](https://github.com/cracked-oura/cracked-oura).
Self-hosted for personal use — respect Oura's Terms of Service.
