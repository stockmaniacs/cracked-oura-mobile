# Folder Structure

```
oura-free/
│
├── backend/                        FastAPI backend (adapted from Cracked-Oura)
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py             App factory, CORS, lifespan, automation endpoints
│   │   │   ├── routes.py           Data endpoints (/sleep, /readiness, /activity, …)
│   │   │   └── middleware/
│   │   │       └── auth.py         X-API-Key middleware
│   │   ├── automation.py           Playwright OuraAutomator class
│   │   ├── config.py               JSON-backed config manager
│   │   ├── database.py             SQLAlchemy session + init_db
│   │   ├── ingestion.py            OuraParser — ZIP → SQLite
│   │   ├── models.py               SQLAlchemy models (Sleep, Activity, …)
│   │   ├── paths.py                XDG-compliant data dir helper
│   │   └── routers/
│   │       └── api.py              Clean REST router (v1)
│   ├── requirements.txt
│   └── .env.example                SECRET_KEY=<openssl rand -hex 32>
│
├── web/                            React/Vite web dashboard → Cloudflare Pages
│   ├── src/
│   │   ├── api/client.ts           Axios + dynamic API key from localStorage
│   │   ├── components/             Skeleton, ScoreRing, TrendChart, StatCard
│   │   ├── hooks/                  useOuraData, useSyncStatus
│   │   ├── pages/                  Today, Sleep, Readiness, Activity, Settings
│   │   ├── store/apiKey.ts         localStorage API key helpers
│   │   └── types/oura.ts           Shared TypeScript domain types
│   ├── public/_redirects           /* /index.html 200  (SPA routing on CF Pages)
│   ├── .env.development            VITE_API_URL=http://localhost:8091
│   ├── .env.production             VITE_API_URL=https://oura-api.stockmaniacs.net
│   └── vite.config.ts
│
├── mobile/                         React Native/Expo → iOS (Android-ready)
│   ├── app/
│   │   ├── _layout.tsx             Root layout: GestureHandler + Stack + StatusBar
│   │   └── (tabs)/
│   │       ├── _layout.tsx         Bottom tab bar (Ionicons icons)
│   │       ├── index.tsx           → TodayScreen
│   │       ├── sleep.tsx           → SleepScreen
│   │       ├── readiness.tsx       → ReadinessScreen
│   │       ├── activity.tsx        → ActivityScreen
│   │       └── settings.tsx        → SettingsScreen
│   ├── src/
│   │   ├── screens/
│   │   │   ├── TodayScreen.tsx     3 score rings + 7-day sparklines + sync
│   │   │   ├── SleepScreen.tsx     Large ring + stat grid + stage BarChart
│   │   │   ├── ReadinessScreen.tsx Large ring + HRV/temp/recovery cards
│   │   │   ├── ActivityScreen.tsx  Steps ring + stat grid + 7-day BarChart
│   │   │   └── SettingsScreen.tsx  API key + URL + test + sync status
│   │   ├── components/
│   │   │   ├── ScoreRing.tsx       Animated SVG ring (Reanimated 4)
│   │   │   ├── StatCard.tsx        Dark tile with Ionicons + accent border
│   │   │   ├── TrendChart.tsx      gifted-charts LineChart wrapper
│   │   │   └── SyncButton.tsx      TouchableOpacity with loading state
│   │   ├── api/client.ts           Axios + expo-secure-store auth
│   │   ├── hooks/useOuraData.ts    In-memory cache + query hook
│   │   └── types/oura.ts           Shared TypeScript domain types
│   ├── eas.json                    EAS Build: preview (sim), production (store)
│   ├── app.json                    Bundle ID: com.stockmaniacs.ourafree
│   └── docs/BUILD.md               Full EAS + TestFlight guide
│
├── upstream-source/                Original Cracked-Oura fork
│   │                               ← git root (GitHub: cracked-oura-mobile)
│   ├── backend/                    Same as ../backend/ — kept in sync
│   ├── web/                        Same as ../web/ — kept in sync
│   └── mobile/                     Same as ../mobile/ — kept in sync
│
├── docs/
│   └── folder-structure.md         This file
│
└── README.md                       Project overview + quick start
```

## Key files

| File | Purpose |
|------|---------|
| `backend/src/api/main.py` | FastAPI app, CORS config, automation endpoints |
| `backend/src/automation.py` | Playwright browser automation (Oura login → export) |
| `backend/src/ingestion.py` | ZIP parser → SQLite ingestion |
| `web/src/types/oura.ts` | All frontend TypeScript types |
| `mobile/src/types/oura.ts` | All mobile TypeScript types (mirrors web) |
| `mobile/eas.json` | EAS Build configuration |
| `.github/workflows/deploy-web.yml` | Auto-deploy web on push to main |

## Live URLs

| Service | URL |
|---------|-----|
| Backend API | https://oura-api.stockmaniacs.net |
| Swagger docs | https://oura-api.stockmaniacs.net/docs |
| Web app | https://oura.stockmaniacs.net |
| CF Pages canonical | https://oura-free.pages.dev |
| iOS bundle ID | com.stockmaniacs.ourafree |
