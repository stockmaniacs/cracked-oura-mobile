"""
Clean REST API endpoints for web and mobile clients.

All routes are under /api/v1/ and protected by X-API-Key middleware
(except /api/v1/health).
"""
import logging
from datetime import date, timedelta, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.src.database import get_db, SessionLocal
from backend.src.models import (
    Sleep, Activity, Readiness, Resilience,
    SleepSession, HeartRate, Workout, Temperature,
    RingBattery, CardiovascularAge,
)
from backend.src.config import config_manager

logger = logging.getLogger("v1.router")

router = APIRouter(prefix="/api/v1", tags=["v1"])


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health", include_in_schema=True)
async def health():
    """
    Public health check — no API key required.
    Returns 200 when the service is up.
    """
    return {"status": "ok", "service": "oura-free", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Daily summaries
# ---------------------------------------------------------------------------

@router.get("/sleep")
def get_sleep(days: int = 30, db: Session = Depends(get_db)):
    """
    Last `days` days of daily sleep summaries, newest first.

    Notable fields: score, contributors (JSON), average_spo2,
    breathing_disturbance_index, optimal_bedtime, recommendation.
    """
    start = date.today() - timedelta(days=days)
    rows = (
        db.query(Sleep)
        .filter(Sleep.day >= start)
        .order_by(Sleep.day.desc())
        .all()
    )
    return [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "contributors": r.contributors,
            "average_spo2": r.average_spo2,
            "breathing_disturbance_index": r.breathing_disturbance_index,
            "optimal_bedtime": r.optimal_bedtime,
            "recommendation": r.recommendation,
            "status": r.status,
        }
        for r in rows
    ]


@router.get("/readiness")
def get_readiness(days: int = 30, db: Session = Depends(get_db)):
    """
    Last `days` days of daily readiness summaries, newest first.

    Notable fields: score, contributors (JSON), temperature_deviation,
    stress_high, recovery_high, day_summary.
    """
    start = date.today() - timedelta(days=days)
    rows = (
        db.query(Readiness)
        .filter(Readiness.day >= start)
        .order_by(Readiness.day.desc())
        .all()
    )
    return [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "contributors": r.contributors,
            "temperature_deviation": r.temperature_deviation,
            "temperature_trend_deviation": r.temperature_trend_deviation,
            "stress_high": r.stress_high,
            "recovery_high": r.recovery_high,
            "day_summary": r.day_summary,
        }
        for r in rows
    ]


@router.get("/activity")
def get_activity(days: int = 30, db: Session = Depends(get_db)):
    """
    Last `days` days of daily activity summaries, newest first.

    Notable fields: score, steps, total_calories, active_calories,
    average_met, contributors (JSON).
    """
    start = date.today() - timedelta(days=days)
    rows = (
        db.query(Activity)
        .filter(Activity.day >= start)
        .order_by(Activity.day.desc())
        .all()
    )
    return [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "steps": r.steps,
            "total_calories": r.total_calories,
            "active_calories": r.active_calories,
            "average_met": r.average_met,
            "equivalent_walking_distance": r.equivalent_walking_distance,
            "high_activity_time": r.high_activity_time,
            "medium_activity_time": r.medium_activity_time,
            "low_activity_time": r.low_activity_time,
            "sedentary_time": r.sedentary_time,
            "non_wear_time": r.non_wear_time,
            "contributors": r.contributors,
        }
        for r in rows
    ]


@router.get("/hrv")
def get_hrv(days: int = 7, db: Session = Depends(get_db)):
    """
    Last `days` days of nightly HRV (from the primary/longest sleep session).

    Returns average_hrv (ms) per night, newest first.
    """
    start = date.today() - timedelta(days=days)

    # One row per day: pick the long_sleep / sleep session with highest HRV
    # (proxy for "primary night"); fall back to any session type.
    rows = (
        db.query(SleepSession)
        .filter(SleepSession.day >= start)
        .filter(SleepSession.type.in_(["long_sleep", "sleep"]))
        .order_by(SleepSession.day.desc(), SleepSession.total_sleep_duration.desc())
        .all()
    )

    # Deduplicate to one row per day (longest session)
    seen: set[str] = set()
    result = []
    for r in rows:
        key = r.day.isoformat()
        if key in seen:
            continue
        seen.add(key)
        result.append(
            {
                "date": key,
                "average_hrv": r.average_hrv,
                "average_heart_rate": r.average_heart_rate,
                "total_sleep_minutes": round(r.total_sleep_duration / 60) if r.total_sleep_duration else None,
                "session_type": r.type,
            }
        )
    return result


# ---------------------------------------------------------------------------
# Summary endpoints
# ---------------------------------------------------------------------------

@router.get("/summary/today")
def get_today_summary(db: Session = Depends(get_db)):
    """
    All three ring scores for today in a single call.
    Returns null for any score not yet recorded for today.
    """
    today = date.today()

    sleep = db.query(Sleep).filter(Sleep.day == today).first()
    activity = db.query(Activity).filter(Activity.day == today).first()
    readiness = db.query(Readiness).filter(Readiness.day == today).first()
    resilience = db.query(Resilience).filter(Resilience.day == today).first()

    # Primary sleep session (longest)
    session = (
        db.query(SleepSession)
        .filter(SleepSession.day == today)
        .filter(SleepSession.type.in_(["long_sleep", "sleep"]))
        .order_by(SleepSession.total_sleep_duration.desc())
        .first()
    )

    return {
        "date": today.isoformat(),
        "scores": {
            "sleep": sleep.score if sleep else None,
            "activity": activity.score if activity else None,
            "readiness": readiness.score if readiness else None,
        },
        "sleep": {
            "score": sleep.score if sleep else None,
            "contributors": sleep.contributors if sleep else None,
            "average_spo2": sleep.average_spo2 if sleep else None,
            "recommendation": sleep.recommendation if sleep else None,
            "total_sleep_minutes": (
                round(session.total_sleep_duration / 60)
                if session and session.total_sleep_duration else None
            ),
            "deep_sleep_minutes": (
                round(session.deep_sleep_duration / 60)
                if session and session.deep_sleep_duration else None
            ),
            "rem_sleep_minutes": (
                round(session.rem_sleep_duration / 60)
                if session and session.rem_sleep_duration else None
            ),
            "average_hrv": session.average_hrv if session else None,
            "average_heart_rate": session.average_heart_rate if session else None,
        },
        "activity": {
            "score": activity.score if activity else None,
            "steps": activity.steps if activity else None,
            "active_calories": activity.active_calories if activity else None,
            "total_calories": activity.total_calories if activity else None,
            "contributors": activity.contributors if activity else None,
        },
        "readiness": {
            "score": readiness.score if readiness else None,
            "temperature_deviation": readiness.temperature_deviation if readiness else None,
            "contributors": readiness.contributors if readiness else None,
            "day_summary": readiness.day_summary if readiness else None,
        },
        "resilience": {
            "level": resilience.level if resilience else None,
            "sleep_recovery": resilience.sleep_recovery if resilience else None,
            "daytime_recovery": resilience.daytime_recovery if resilience else None,
        } if resilience else None,
    }


@router.get("/summary/week")
def get_week_summary(db: Session = Depends(get_db)):
    """
    Rolling 7-day summary across sleep, activity, and readiness.

    Returns per-day arrays plus computed averages for the period.
    """
    today = date.today()
    start = today - timedelta(days=6)  # inclusive, 7 days total

    sleep_rows = (
        db.query(Sleep)
        .filter(Sleep.day >= start)
        .order_by(Sleep.day.asc())
        .all()
    )
    activity_rows = (
        db.query(Activity)
        .filter(Activity.day >= start)
        .order_by(Activity.day.asc())
        .all()
    )
    readiness_rows = (
        db.query(Readiness)
        .filter(Readiness.day >= start)
        .order_by(Readiness.day.asc())
        .all()
    )

    # Primary sleep sessions for HRV
    sessions = (
        db.query(SleepSession)
        .filter(SleepSession.day >= start)
        .filter(SleepSession.type.in_(["long_sleep", "sleep"]))
        .order_by(SleepSession.day.asc(), SleepSession.total_sleep_duration.desc())
        .all()
    )
    session_by_day: dict[str, SleepSession] = {}
    for s in sessions:
        key = s.day.isoformat()
        if key not in session_by_day:
            session_by_day[key] = s

    def safe_avg(values):
        vals = [v for v in values if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    sleep_data = [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "average_hrv": session_by_day.get(r.day.isoformat(), {}).average_hrv
            if hasattr(session_by_day.get(r.day.isoformat(), {}), "average_hrv") else None,
            "total_sleep_minutes": (
                round(session_by_day[r.day.isoformat()].total_sleep_duration / 60)
                if r.day.isoformat() in session_by_day
                and session_by_day[r.day.isoformat()].total_sleep_duration else None
            ),
        }
        for r in sleep_rows
    ]
    activity_data = [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "steps": r.steps,
            "active_calories": r.active_calories,
        }
        for r in activity_rows
    ]
    readiness_data = [
        {
            "date": r.day.isoformat(),
            "score": r.score,
            "temperature_deviation": r.temperature_deviation,
        }
        for r in readiness_rows
    ]

    return {
        "period": {"start": start.isoformat(), "end": today.isoformat()},
        "sleep": sleep_data,
        "activity": activity_data,
        "readiness": readiness_data,
        "averages": {
            "sleep_score": safe_avg([r.score for r in sleep_rows]),
            "activity_score": safe_avg([r.score for r in activity_rows]),
            "readiness_score": safe_avg([r.score for r in readiness_rows]),
            "avg_steps": safe_avg([r.steps for r in activity_rows]),
            "avg_active_calories": safe_avg([r.active_calories for r in activity_rows]),
        },
    }


# ---------------------------------------------------------------------------
# Sync control
# ---------------------------------------------------------------------------

@router.post("/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    """
    Trigger a manual full data sync (Playwright → CSV download → ingest).

    Returns immediately; poll /api/v1/sync/status to track progress.
    Returns 409 if a sync is already running.
    """
    from backend.src.api.routes import run_full_sync_task  # reuse upstream logic

    cfg = config_manager.get_config()
    if cfg.get("status") in ("Processing", "Starting...", "Initializing...", "Running Automation..."):
        raise HTTPException(status_code=409, detail="Sync already in progress")

    background_tasks.add_task(run_full_sync_task, SessionLocal)
    return {"message": "Sync started in background.", "status": "started"}


@router.get("/sync/status")
def get_sync_status(db: Session = Depends(get_db)):
    """
    Returns the last sync time, current status, next scheduled sync,
    and record counts for every data table.
    """
    cfg = config_manager.get_config()

    counts = {
        "sleep": db.query(func.count(Sleep.id)).scalar(),
        "activity": db.query(func.count(Activity.id)).scalar(),
        "readiness": db.query(func.count(Readiness.id)).scalar(),
        "resilience": db.query(func.count(Resilience.id)).scalar(),
        "sleep_sessions": db.query(func.count(SleepSession.id)).scalar(),
        "workouts": db.query(func.count(Workout.id)).scalar(),
        "heart_rate": db.query(func.count(HeartRate.timestamp)).scalar(),
        "temperature": db.query(func.count(Temperature.timestamp)).scalar(),
        "ring_battery": db.query(func.count(RingBattery.timestamp)).scalar(),
        "cardiovascular_age": db.query(func.count(CardiovascularAge.id)).scalar(),
    }

    return {
        "status": cfg.get("status", "Idle"),
        "last_sync": cfg.get("last_run"),
        "next_sync": cfg.get("next_run"),
        "schedule_time": cfg.get("schedule_time"),
        "record_counts": counts,
    }
