# Oura Free — API Reference

**Base URL (dev):** `http://localhost:8091`  
**Base URL (prod):** `https://oura-api.stockmaniacs.net` *(to be configured)*

All endpoints except `/api/v1/health` require:
```
X-API-Key: <SECRET_KEY from .env>
```

---

## Health

### `GET /api/v1/health`
Public — no auth required. Returns 200 when the service is up.

```bash
curl http://localhost:8091/api/v1/health
```
```json
{"status": "ok", "service": "oura-free", "version": "1.0.0"}
```

---

## Daily Summaries

### `GET /api/v1/sleep?days=30`
Last N days of daily sleep summaries (score + contributors + SpO2).

```bash
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/sleep?days=7"
```
```json
[
  {
    "date": "2024-08-07",
    "score": 82,
    "contributors": {
      "deep_sleep": 72,
      "efficiency": 95,
      "latency": 100,
      "rem_sleep": 75,
      "restfulness": 88,
      "timing": 90,
      "total_sleep": 80
    },
    "average_spo2": 97.4,
    "breathing_disturbance_index": 2,
    "optimal_bedtime": {"start": "22:30", "end": "06:30"},
    "recommendation": "Great night! Keep up the consistent schedule.",
    "status": "good"
  }
]
```

### `GET /api/v1/readiness?days=30`
Last N days of readiness scores + contributors.

```bash
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/readiness?days=7"
```
```json
[
  {
    "date": "2024-08-07",
    "score": 78,
    "contributors": {
      "activity_balance": 85,
      "body_temperature": 100,
      "hrv_balance": 65,
      "previous_day_activity": 90,
      "recovery_index": 75
    },
    "temperature_deviation": -0.1,
    "temperature_trend_deviation": 0.2,
    "stress_high": 2,
    "recovery_high": 5,
    "day_summary": "restored"
  }
]
```

### `GET /api/v1/activity?days=30`
Last N days of activity scores, step counts, calorie burns.

```bash
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/activity?days=7"
```
```json
[
  {
    "date": "2024-08-07",
    "score": 85,
    "steps": 9432,
    "total_calories": 2850,
    "active_calories": 520,
    "average_met": 1.4,
    "equivalent_walking_distance": 7200,
    "high_activity_time": 1800,
    "medium_activity_time": 3600,
    "low_activity_time": 7200,
    "sedentary_time": 18000,
    "non_wear_time": 0,
    "contributors": {"meet_daily_targets": 90, "move_every_hour": 80}
  }
]
```

### `GET /api/v1/hrv?days=7`
Nightly HRV from the primary sleep session, newest first.

```bash
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/hrv?days=14"
```
```json
[
  {
    "date": "2024-08-07",
    "average_hrv": 48,
    "average_heart_rate": 56.2,
    "total_sleep_minutes": 427,
    "session_type": "long_sleep"
  }
]
```

---

## Summary Endpoints

### `GET /api/v1/summary/today`
All three ring scores + key metrics in one call. Designed for the mobile
home screen — one round-trip gets everything needed.

```bash
curl -H "X-API-Key: secret" \
  http://localhost:8091/api/v1/summary/today
```
```json
{
  "date": "2024-08-07",
  "scores": {
    "sleep": 82,
    "activity": 85,
    "readiness": 78
  },
  "sleep": {
    "score": 82,
    "contributors": {"deep_sleep": 72, "efficiency": 95},
    "average_spo2": 97.4,
    "recommendation": "Great night!",
    "total_sleep_minutes": 427,
    "deep_sleep_minutes": 95,
    "rem_sleep_minutes": 82,
    "average_hrv": 48,
    "average_heart_rate": 56.2
  },
  "activity": {
    "score": 85,
    "steps": 9432,
    "active_calories": 520,
    "total_calories": 2850,
    "contributors": {}
  },
  "readiness": {
    "score": 78,
    "temperature_deviation": -0.1,
    "contributors": {},
    "day_summary": "restored"
  },
  "resilience": {
    "level": "solid",
    "sleep_recovery": 0.72,
    "daytime_recovery": 0.68
  }
}
```

### `GET /api/v1/summary/week`
Rolling 7-day summary (today − 6 days through today) with per-day arrays
and computed averages.

```bash
curl -H "X-API-Key: secret" \
  http://localhost:8091/api/v1/summary/week
```
```json
{
  "period": {"start": "2024-08-01", "end": "2024-08-07"},
  "sleep": [
    {"date": "2024-08-01", "score": 75, "average_hrv": 44, "total_sleep_minutes": 410},
    {"date": "2024-08-02", "score": 83, "average_hrv": 51, "total_sleep_minutes": 435}
  ],
  "activity": [
    {"date": "2024-08-01", "score": 70, "steps": 7200, "active_calories": 430},
    {"date": "2024-08-02", "score": 88, "steps": 11000, "active_calories": 650}
  ],
  "readiness": [
    {"date": "2024-08-01", "score": 72, "temperature_deviation": 0.1},
    {"date": "2024-08-02", "score": 80, "temperature_deviation": -0.2}
  ],
  "averages": {
    "sleep_score": 79.5,
    "activity_score": 81.2,
    "readiness_score": 76.8,
    "avg_steps": 9100.0,
    "avg_active_calories": 512.0
  }
}
```

---

## Sync Control

### `POST /api/v1/sync`
Trigger a full data sync: Playwright logs into Oura, requests a new CSV
export, waits for generation, downloads, and ingests. Returns immediately;
poll `/api/v1/sync/status` to track progress.

Returns **409** if a sync is already running.

```bash
curl -X POST -H "X-API-Key: secret" \
  http://localhost:8091/api/v1/sync
```
```json
{"message": "Sync started in background.", "status": "started"}
```

### `GET /api/v1/sync/status`
Last sync timestamp, current status, next scheduled sync time, and
record counts for every table.

```bash
curl -H "X-API-Key: secret" \
  http://localhost:8091/api/v1/sync/status
```
```json
{
  "status": "Idle",
  "last_sync": "2024-08-07 11:00:22",
  "next_sync": "2024-08-08 11:00:00",
  "schedule_time": "11:00",
  "record_counts": {
    "sleep": 365,
    "activity": 365,
    "readiness": 365,
    "resilience": 200,
    "sleep_sessions": 412,
    "workouts": 85,
    "heart_rate": 52560,
    "temperature": 43800,
    "ring_battery": 8760,
    "cardiovascular_age": 180
  }
}
```

---

## Legacy Endpoints (unchanged from upstream, now versioned)

These routes existed before the v1 layer and are kept for compatibility
with the web dashboard widget system.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/days/{YYYY-MM-DD}` | Full day dump (all domains) |
| GET | `/api/v1/query?path=sleep.score&start_date=&end_date=` | Dynamic trend query |
| GET | `/api/v1/schema` | Introspected DB schema (for widget editor) |
| POST | `/api/v1/ingest/zip` | Upload Oura export ZIP manually |
| GET | `/api/v1/dashboard` | Load saved dashboard config |
| POST | `/api/v1/dashboard` | Save dashboard config |
| GET | `/api/v1/settings` | Get automation settings |
| POST | `/api/v1/settings` | Save automation settings |
| POST | `/api/v1/advisor/chat` | AI health advisor (Ollama) |
| POST | `/api/v1/automation/start-login` | Start Playwright login |
| POST | `/api/v1/automation/submit-otp` | Submit OTP code |
| POST | `/api/v1/automation/request-export` | Full sync (background) |
| POST | `/api/v1/automation/check-status` | Poll automation status |
| POST | `/api/v1/automation/download` | Download existing export |
| POST | `/api/v1/automation/clear-session` | Clear login session |
| GET | `/api/v1/automation/status` | Automation config + status |
| POST | `/api/v1/automation/config` | Update automation config |
| POST | `/api/v1/automation/run-now` | Manual full-run trigger |
| POST | `/api/v1/automation/test-login` | Test login without sync |
| POST | `/api/v1/automation/download-latest` | Async download only |

### Dynamic query examples

```bash
# Sleep score trend — last 90 days
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/query?path=sleep.score&start_date=2024-05-01&end_date=2024-08-07"

# Sleep contributor (nested JSON key)
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/query?path=sleep.contributors.deep_sleep"

# Activity steps trend
curl -H "X-API-Key: secret" \
  "http://localhost:8091/api/v1/query?path=activity.steps&start_date=2024-07-01"
```

---

## Error Responses

| Code | Meaning |
|------|---------|
| 200 | OK |
| 400 | Bad request (invalid date format, unknown domain/field) |
| 401 | Missing or invalid `X-API-Key` |
| 409 | Sync already in progress |
| 500 | Internal server error |

```json
{"detail": "Invalid or missing API key"}
```

---

## Running the Server

```bash
# Development (auto-reload, port 8091)
cd backend && make dev

# Production (2 workers, port 8091)
cd backend && make start

# Custom port
cd backend && PORT=9000 make dev
```

Interactive docs available at:  
`http://localhost:8091/docs` (Swagger UI)  
`http://localhost:8091/redoc` (ReDoc)
