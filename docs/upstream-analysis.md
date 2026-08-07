# Upstream Source Analysis — Cracked-Oura

**Source:** https://github.com/stockmaniacs/cracked-oura-mobile  
**Analysed:** 2026-08-07  
**Purpose:** Inform architecture decisions for the `oura-free` monorepo (web + mobile + shared FastAPI backend).

---

## 1. File Map

### Backend (`upstream-source/backend/`)

| File | Description |
|---|---|
| `requirements.txt` | Python deps: FastAPI, uvicorn, SQLAlchemy, Playwright, LangChain (Ollama), pandas, pydantic v2 |
| `pyproject.toml` | Project metadata and build config |
| `build.spec` | PyInstaller spec for compiling the backend into a standalone binary (Electron desktop use) |
| `src/api/main.py` | FastAPI app entry point; CORS config, lifespan handler (init_db + background_worker), static file mount for `frontend/dist`, automation endpoints, background task scheduler |
| `src/api/routes.py` | All data-access routes (see §3); chat, automation, settings, dashboard config, query, schema introspection, ZIP upload |
| `src/api/schemas.py` | Pydantic response models for every entity: Sleep, Activity, Readiness, Resilience, SleepSession, Workout, Meditation, HeartRate, Temperature, RingBattery, RingConfiguration, Tag, CardiovascularAge, DayDataResponse |
| `src/models.py` | SQLAlchemy ORM models — defines all 13 tables (see §5) |
| `src/database.py` | SQLAlchemy engine + session factory; `init_db()` creates tables; DB path is OS-specific user-data dir |
| `src/config.py` | `ConfigManager` — thread-safe JSON file manager for `oura_config.json` and `oura_dashboard.json`; holds automation status, schedule, email, LLM settings, and dashboard layout |
| `src/paths.py` | `get_user_data_dir()` — returns OS-specific app data dir (macOS: `~/Library/Application Support/CrackedOura/`) |
| `src/automation.py` | `OuraAutomator` — Playwright-based browser automation: login, OTP, request export, poll for readiness (up to 2.5 hrs), download ZIP |
| `src/llm.py` | `DataAnalyst` — LangChain SQL Agent backed by local Ollama (llama3.1); natural-language queries against the SQLite DB |
| `src/ingestion/manager.py` | `OuraParser.parse_zip()` — extracts ZIP, finds CSV directory, orchestrates all processors |
| `src/ingestion/base.py` | `IngestionBase` — shared helpers: `_parse_date`, `_parse_datetime`, `_parse_int`, `_parse_float`, `_parse_json_col`, `_parse_sequence_to_timestamped_list`, `_upsert` (SQLAlchemy merge on conflict) |
| `src/ingestion/processors/sleep.py` | Processes `dailysleep.csv` + `sleeptime.csv` + `dailyspo2.csv` → `Sleep` table; processes `sleepmodel.csv` → `SleepSession` table |
| `src/ingestion/processors/activity.py` | Processes `dailyactivity.csv` → `Activity`; `workout.csv` → `Workout`; `session.csv` → `Meditation`; `daytimestress.csv` → stress column on `Activity` |
| `src/ingestion/processors/readiness.py` | Processes `dailyreadiness.csv` + `dailystress.csv` → `Readiness`; `dailyresilience.csv` → `Resilience` |
| `src/ingestion/processors/common.py` | Processes `heartrate.csv` → `HeartRate`; `temperature.csv` → `Temperature`; `ringconfiguration.csv` → `RingConfiguration`; `enhancedtag.csv` → `Tag`; `dailycardiovascularage.csv` → `CardiovascularAge`; `ringbatterylevel.csv` → `RingBattery` |

### Frontend (`upstream-source/frontend/`)

| File/Dir | Description |
|---|---|
| `package.json` | React 19, Vite 7, TypeScript, Tailwind 3, shadcn/ui (Radix UI), chart.js, recharts, react-grid-layout, react-day-picker, date-fns, **Electron 39**, electron-builder |
| `vite.config.ts` | Standard Vite + React plugin config |
| `tailwind.config.js` / `postcss.config.cjs` | Tailwind setup with shadcn/ui conventions |
| `electron/main.ts` | Electron main process: spawns Python backend, creates BrowserWindow + system tray, hides on close (lives in tray) |
| `src/main.tsx` | React entry point; mounts `<App />` |
| `src/App.tsx` | Root component; wraps app in `<DashboardProvider>`; routes between dashboard view and chat-page view; manages right-panel state (editor / chat / settings) |
| `src/lib/api.ts` | All HTTP calls to `http://localhost:8000`; hard-coded localhost URL |
| `src/lib/data-processing.ts` | Client-side data transformation helpers |
| `src/lib/layoutUtils.ts` | react-grid-layout position utilities |
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `src/contexts/DashboardContext.tsx` | Global state: dashboard list, active dashboard, widget list, layout, editing state, selected date, data blob from API |
| `src/hooks/useOuraData.ts` | Fetches `/api/days/{date}` + 3 history queries (`sleep.score`, `activity.score`, `readiness.score`) for last 365 days; retries on failure |
| `src/hooks/useDashboardPersistence.ts` | Load/save dashboard config via `/api/dashboard`; retry-on-startup logic |
| `src/hooks/useOuraQuery.ts` | Parameterised single query to `/api/query` |
| `src/hooks/useMultiOuraQuery.ts` | Multiple concurrent queries |
| `src/hooks/useChat.ts` | Chat history state + calls `/api/advisor/chat` |
| `src/types/index.ts` | `WidgetInstance`, `Dashboard`, widget type union |
| `src/types/data.ts` | TypeScript types for API data shapes |
| `src/components/layout/MainLayout.tsx` | App shell: sidebar + header + right panel slot |
| `src/components/layout/AppSidebar.tsx` | Dashboard switcher, nav links |
| `src/components/dashboard/DashboardGrid.tsx` | react-grid-layout canvas; renders `<WidgetCard>` per widget |
| `src/components/dashboard/WidgetCard.tsx` | Widget frame with edit/delete controls |
| `src/components/dashboard/WidgetEditorPanel.tsx` | Right-panel form for configuring a widget's data key, title, colours |
| `src/components/dashboard/DataFieldSelector.tsx` | Schema-driven dropdown for picking `domain.field` paths |
| `src/components/dashboard/DateRangeSelector.tsx` | Date picker for historical queries |
| `src/components/dashboard/SettingsPanel.tsx` | Login/OTP flow, data-sync controls, manual ZIP upload, schedule config, layout import/export |
| `src/components/dashboard/ChatPanel.tsx` | Slide-over chat UI |
| `src/components/dashboard/ChatPage.tsx` | Full-page chat view |
| `src/components/dashboard/ThoughtsDisplay.tsx` | Shows LangChain agent reasoning steps |
| `src/components/widgets/` | 8 widget renderers: `MetricWidget`, `BarChartCanvas`, `TrendChartCanvas`, `RadarChartCanvas`, `ScoreGaugeCanvas`, `SmartTrendWidgetCanvas`, `TableWidget`, `JSONWidget` — all use Canvas API or recharts |
| `src/components/WidgetRegistry.tsx` | Maps widget type string → component |
| `src/components/ErrorBoundary.tsx` | React error boundary wrapper |
| `src/components/ui/` | shadcn/ui primitives: button, card, dialog, dropdown-menu, input, label, calendar, checkbox, popover, scroll-area, select, switch, table, alert |
| `src/components/theme-provider.tsx` / `mode-toggle.tsx` | Dark/light theme toggle via `next-themes` pattern |
| `src/index.css` | Tailwind + shadcn CSS variables |

---

## 2. What the Backend Does

### Data Flow Summary

```
Oura membership.ouraring.com
        │  (Playwright automation)
        ▼
  ZIP download (CSV files)
        │  (OuraParser)
        ▼
  SQLite DB (oura_database.db)
        │  (FastAPI routes)
        ▼
  React frontend / mobile client
```

### Sync Mechanism

There are **two sync paths**:

**A. Automated (Playwright browser automation)**  
1. Playwright Chromium logs into `membership.ouraring.com` with user's email + OTP.  
2. Navigates to `/data-export`, clicks "Request data export".  
3. Polls the page every 5 min for up to 2.5 hours until the export button re-enables.  
4. Downloads the ZIP file to the user-data directory.  
5. Calls `OuraParser.parse_zip()` to ingest into SQLite.  
A background asyncio task runs every 60 seconds checking if it's the scheduled time.

**B. Manual ZIP upload**  
User uploads an Oura export ZIP via `POST /api/ingest/zip` (no automation required).

### Config / State

Application config is persisted to **two JSON files** in the user-data dir:  
- `oura_config.json` — email, schedule_time, is_active, headless, llm_model, llm_host, status, last_run, next_run  
- `oura_dashboard.json` — dashboard layout/widget definitions  

`ConfigManager` merges these and guards writes with a threading lock.

---

## 3. API Routes

### Automation & Auth
| Method | Path | Description |
|---|---|---|
| GET | `/api/automation/status` | Get automation config + status |
| POST | `/api/automation/config` | Update automation settings (email, schedule, headless) |
| POST | `/api/automation/start-login` | Initiate Playwright login flow |
| POST | `/api/automation/submit-otp` | Submit OTP to active Playwright session |
| POST | `/api/automation/request-export` | Trigger full sync (background task) |
| POST | `/api/automation/check-status` | Poll current status |
| POST | `/api/automation/download` | Download existing export + ingest |
| POST | `/api/automation/download-latest` | Async download existing |
| POST | `/api/automation/run-now` | Manual full-run trigger |
| POST | `/api/automation/clear-session` | Clear Playwright session cookies |
| POST | `/api/automation/test-login` | Test login without full sync |

### Settings & Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Fetch schedule_time + email |
| POST | `/api/settings` | Save settings |
| GET | `/api/dashboard` | Fetch dashboard layout JSON |
| POST | `/api/dashboard` | Save dashboard layout JSON |

### Data Access
| Method | Path | Description |
|---|---|---|
| GET | `/api/days/{date}` | Full day data (all domains, optional time-series with `?include_details=true`) |
| GET | `/api/query?path=&start_date=&end_date=` | Dynamic metric trend query; path = `domain.field` or `domain.json_col.key` |
| GET | `/api/schema` | Introspected schema (all domains + fields + types) |
| POST | `/api/ingest/zip` | Upload + ingest an Oura ZIP file |

### AI Chat
| Method | Path | Description |
|---|---|---|
| POST | `/api/advisor/chat` | LangChain SQL Agent query (requires local Ollama) |

---

## 4. What the Frontend Does

### Architecture
Single-page React app with **no routing library** — view switching is managed by `DashboardContext.activeView` (`'dashboard'` | `'chat-page'`). Right-panel state (`none` | `chat` | `editor` | `settings`) controls a slide-over panel.

### Dashboard System
- Supports **multiple named dashboards** (tabs), each with independent widget lists and layouts.
- Layout uses `react-grid-layout` (drag-and-drop, resize). Grid positions stored in `layout[]`.
- Widgets are typed: `score`, `bar`, `trend`, `radar`, `gauge`, `smart_trend`, `table`, `json`.
- Widget config includes: `dataKey` (e.g. `sleep.score`), `title`, `color`, date range.
- Widget and layout state persists to the backend via `/api/dashboard`.

### Data Flow
1. On date change → `useOuraData` fetches `/api/days/{date}` (full day dump) + 365-day history queries.
2. Data is distributed to widgets via `DashboardContext.data`.
3. Each widget reads its `config.dataKey`, traverses the data blob, and renders.
4. The `/api/query` endpoint supports arbitrary `domain.field` and `domain.json_col.key` paths.

### Electron Integration (to be removed)
- `electron/main.ts` spawns the Python backend as a child process on startup.
- Loads the React app from `http://localhost:5173` (dev) or `frontend/dist/index.html` (prod).
- Creates a system-tray icon; hides window on close rather than quitting.
- Handles PyInstaller binary path for production builds.
- `build.spec` / `package.json build` config packages both the React dist and PyInstaller binary into a macOS `.dmg` / Windows `.exe`.

### Electron-Specific Coupling
The frontend itself has **minimal Electron coupling** — it's just a React SPA. The Electron layer is entirely in `electron/main.ts`. The only implicit coupling is:
- API base URL is hard-coded to `http://localhost:8000` in `src/lib/api.ts`.
- No auth layer (no tokens, no session cookies in the browser) — the desktop app trusts localhost.
- `ConfigManager` stores all config locally on disk.

---

## 5. SQLite Schema

### Daily Summaries

#### `sleep`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | Oura-assigned or UUID fallback |
| `day` | Date (unique, indexed) | |
| `score` | Integer | 0–100 |
| `contributors` | JSON | e.g. `{deep_sleep, efficiency, latency, ...}` |
| `optimal_bedtime` | JSON | `{start, end, ...}` |
| `recommendation` | String | Text recommendation |
| `status` | String | e.g. `'good'` |
| `average_spo2` | Float | From `dailyspo2.csv` |
| `breathing_disturbance_index` | Integer | From `dailyspo2.csv` |

#### `activity`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (unique, indexed) | |
| `score` | Integer | |
| `steps` | Integer | |
| `total_calories` | Integer | |
| `active_calories` | Integer | |
| `average_met` | Float | Metabolic equivalent |
| `equivalent_walking_distance` | Integer | Metres |
| `contributors` | JSON | |
| `class_5_min` | JSON | Activity class time-series (5-min intervals) |
| `met` | JSON | MET time-series (5-min intervals) |
| `stress` | JSON | Daytime stress time-series |
| `high_activity_met_minutes` | Integer | |
| `high_activity_time` | Integer | Seconds |
| `inactivity_alerts` | Integer | |
| `low_activity_met_minutes` | Integer | |
| `low_activity_time` | Integer | Seconds |
| `medium_activity_met_minutes` | Integer | |
| `medium_activity_time` | Integer | Seconds |
| `meters_to_target` | Integer | |
| `non_wear_time` | Integer | Seconds |
| `resting_time` | Integer | Seconds |
| `sedentary_met_minutes` | Integer | |
| `sedentary_time` | Integer | Seconds |
| `target_calories` | Integer | |
| `target_meters` | Integer | |

#### `readiness`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (unique, indexed) | |
| `score` | Integer | |
| `temperature_deviation` | Float | |
| `temperature_trend_deviation` | Float | |
| `contributors` | JSON | |
| `stress_high` | Integer | From `dailystress.csv` |
| `recovery_high` | Integer | From `dailystress.csv` |
| `day_summary` | Text | Stress day summary text |

#### `resilience`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (unique, indexed) | |
| `level` | String | e.g. `'adequate'`, `'solid'` |
| `sleep_recovery` | Float | |
| `daytime_recovery` | Float | |
| `stress` | Float | |

#### `cardiovascular_age`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (unique, indexed) | |
| `vascular_age` | Integer | Estimated vascular age in years |

---

### Sessions & Detailed Data

#### `sleep_session`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (indexed) | Multiple sessions per day possible (nap, long_sleep) |
| `start_time` | DateTime | |
| `end_time` | DateTime | |
| `type` | String | `'long_sleep'`, `'sleep'`, `'nap'`, `'rest'` |
| `efficiency` | Integer | % |
| `latency` | Integer | Seconds |
| `total_sleep_duration` | Integer | Seconds |
| `deep_sleep_duration` | Integer | Seconds |
| `rem_sleep_duration` | Integer | Seconds |
| `light_sleep_duration` | Integer | Seconds |
| `awake_time` | Integer | Seconds |
| `average_heart_rate` | Float | |
| `average_hrv` | Integer | ms |
| `sleep_phase_5_min` | JSON | Timestamped array `[{t, v}]` (5-min intervals) |
| `sleep_phase_30_sec` | JSON | Timestamped array (30-sec intervals) |
| `movement_30_sec` | JSON | Timestamped array (30-sec intervals) |
| `hr_data` | JSON | Heart rate during sleep (5-min intervals) |
| `hrv_data` | JSON | HRV during sleep (5-min intervals) |
| `readiness` | JSON | Raw readiness sub-object |
| `average_breath` | Float | Breaths per minute |
| `bedtime_end` | DateTime | |
| `bedtime_start` | DateTime | |
| `lowest_heart_rate` | Integer | |
| `low_battery_alert` | Boolean | |
| `period` | Integer | |
| `restless_periods` | Integer | |
| `sleep_algorithm_version` | String | |
| `sleep_score_delta` | Integer | |
| `readiness_score_delta` | Float | |
| `time_in_bed` | Integer | Seconds |

#### `workout`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (indexed) | |
| `start_time` | DateTime | |
| `end_time` | DateTime | |
| `activity` | String | e.g. `'running'`, `'cycling'` |
| `calories` | Float | |
| `distance` | Float | Metres |
| `intensity` | String | |
| `label` | String | User label |
| `source` | String | Data source |

#### `meditation`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `day` | Date (indexed) | |
| `start_time` | DateTime | |
| `end_time` | DateTime | |
| `type` | String | Session type |
| `mood` | String | Pre/post mood |

---

### High-Frequency Time Series

#### `heart_rate`
| Column | Type | Notes |
|---|---|---|
| `timestamp` | DateTime (PK) | |
| `bpm` | Integer | |
| `source` | String | e.g. `'awake'`, `'sleep'`, `'workout'` |

#### `temperature`
| Column | Type | Notes |
|---|---|---|
| `timestamp` | DateTime (PK) | |
| `skin_temp` | Float | °C deviation |

#### `ring_battery`
| Column | Type | Notes |
|---|---|---|
| `timestamp` | DateTime (PK) | |
| `level` | Integer | % charge |
| `charging` | Boolean | |
| `in_charger` | Boolean | |

---

### Metadata

#### `ring_configuration`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `firmware_version` | String | |
| `size` | Integer | Ring size |
| `color` | String | |
| `hardware_type` | String | e.g. `'gen3'` |

#### `tag`
| Column | Type | Notes |
|---|---|---|
| `id` | String (PK) | |
| `start_time` | DateTime | |
| `end_time` | DateTime | |
| `tag_type_code` | String | e.g. `'tag_generic_sick'` |
| `comment` | String | User note |

---

## 6. What We Keep As-Is

| Component | Keep? | Rationale |
|---|---|---|
| `src/models.py` | ✅ Verbatim | Schema is complete and well-designed |
| `src/database.py` | ✅ Minor edits | Replace path logic (remove OS-specific user-data-dir, use env var for Contabo) |
| `src/ingestion/` (all processors) | ✅ Verbatim | CSV parsing logic is battle-tested; no desktop coupling |
| `src/api/routes.py` (data routes) | ✅ Verbatim | `/api/days`, `/api/query`, `/api/schema`, `/api/ingest/zip` are pure data endpoints |
| `src/api/schemas.py` | ✅ Verbatim | Pydantic schemas match models perfectly |
| `src/api/routes.py` (automation routes) | ✅ Keep with minor CORS/auth additions | Playwright automation still needed server-side |
| `frontend/src/lib/data-processing.ts` | ✅ Copy to web/ | Data logic is UI-framework-agnostic |
| `frontend/src/types/` | ✅ Copy to shared types | |
| `frontend/src/components/widgets/` | ✅ Copy to web/ | Good Canvas + recharts widgets |
| `frontend/src/components/ui/` | ✅ Copy to web/ | shadcn/ui is the right component library |
| `frontend/src/components/dashboard/` | ✅ Copy + adapt to web/ | Remove Electron-specific assumptions |
| `frontend/src/hooks/` | ✅ Copy to web/ | Data hooks are backend-agnostic except for base URL |

---

## 7. What Needs to Change for Our Architecture

### Backend

| Change | Why |
|---|---|
| **DB path** — replace `get_user_data_dir()` with env-var `DATABASE_URL` | Contabo VPS has no "user app data" concept; path must be configurable |
| **CORS origins** — expand beyond `localhost` | Cloudflare Pages domain + React Native app must be allowed |
| **Auth layer** — add API key or JWT middleware | Backend is now publicly routable on Contabo; cannot be trust-localhost-only |
| **Dashboard config** — move out of JSON files into DB or Redis | JSON files don't work multi-tenant; even single-user needs atomic persistence across restarts |
| **Config/status storage** — replace `ConfigManager` JSON files with DB row or Redis | Same reason — filesystem state is fragile on a VPS |
| **LLM** — replace local Ollama with cloud LLM API (Claude/OpenAI) | Ollama requires local GPU/CPU; Contabo VPS can call a cloud API instead |
| **Remove `paths.py`** — `get_user_data_dir()` is desktop-only | Not needed on a VPS |
| **Remove PyInstaller / `build.spec`** | No desktop packaging needed |
| **Remove static file mount** (`frontend/dist`) | Backend is API-only; frontend served from Cloudflare Pages |
| **Add health check** `GET /health` | Needed for Cloudflare/monitoring |
| **Playwright session state** — store `oura_session.json` in a persistent volume | VPS restarts must not lose Oura login session |

### Web Frontend (`web/`)

| Change | Why |
|---|---|
| **Remove Electron** entirely (`electron/` dir, electron deps, electron-builder) | We deploy to Cloudflare Pages as a plain SPA |
| **Configurable API base URL** — replace hard-coded `http://localhost:8000` with `VITE_API_URL` env var | Frontend must talk to Contabo backend |
| **Add auth** — if backend gets JWT/API key, frontend must send it | Security on public backend |
| **No Tray / no local Python spawn** | All server management is on Contabo |
| **Vite build → Cloudflare Pages** | Output `dist/` deploys as a static site; add `_routes.json` or `_redirects` for SPA routing |
| **`src/lib/api.ts`** — parameterise base URL | Single-line change but critical |
| **Remove desktop-specific UI** — "install Chromium" status messages, headless toggle, etc. | Those are Electron automation concerns |

### Mobile (`mobile/`)

| Change | Why |
|---|---|
| **New React Native project** from scratch (Expo or bare RN) | No upstream mobile code exists |
| **Shared types** — copy or symlink `src/types/` | Same data shapes as web |
| **Shared API client** — adapt `src/lib/api.ts` for React Native fetch | Replace `VITE_API_URL` with React Native env mechanism |
| **Auth** — same JWT/key flow as web | |
| **UI from scratch** — native components, not shadcn/ui | shadcn is DOM-only; RN needs RN components |
| **Charts** — use `react-native-gifted-charts` or `victory-native` | Canvas-based widgets don't work in RN |

### Shared / Infra

| Change | Why |
|---|---|
| **Contabo VPS deployment** — `backend/` dir with `Dockerfile` or systemd service | Replace PyInstaller + desktop install |
| **Environment variables** — `DATABASE_URL`, `API_KEY`, `ALLOWED_ORIGINS`, `LLM_*`, `PLAYWRIGHT_SESSION_PATH` | 12-factor app config |
| **Cloudflare Pages** — `web/` dir, `wrangler.toml`, build command `npm run build` | Same stack as other projects in this monorepo org |
| **GitHub Actions** — CI for backend (lint/test), web (build), mobile (build) | |

---

## 8. Key Design Decisions for Our Build

1. **The Playwright automation stays server-side.** The VPS runs the headless Chromium scraper. Users interact with it via the web or mobile app through the existing automation API routes. Session state (`oura_session.json`) must be persisted to a VPS volume.

2. **The backend is single-user by design** (one Oura account, one SQLite DB). We keep that assumption — this is a personal health tool. Multi-user would need per-user DB isolation or a Postgres schema-per-user approach.

3. **Dashboard layout config** moves from `oura_dashboard.json` on disk into a `dashboard_config` table in SQLite (or a separate `settings` table). The `/api/dashboard` GET/POST endpoints stay; only the storage backend changes.

4. **The `/api/query` dynamic endpoint is the power feature.** It drives every chart and widget by accepting `domain.field` or `domain.json_col.key` paths. We keep it unchanged — it's what makes the widget editor work.

5. **LLM chat** becomes optional / user-configured. Replace Ollama with a Claude API call, or allow the user to supply their own API key via settings. The LangChain SQL Agent approach is kept; only the `ChatOllama` LLM is swapped for `ChatAnthropic`.

6. **React Native app** shares no UI code with the web app but shares the API client types. Plan: start with Expo for fast iOS iteration; eject to bare workflow only if native modules require it.
