import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.src.api.routes import router
from backend.src.database import init_db

import asyncio
import logging
from datetime import datetime, timedelta
from backend.src.automation import automator
from backend.src.ingestion import OuraParser
from backend.src.database import SessionLocal
from backend.src.config import config_manager
from pydantic import BaseModel

from contextlib import asynccontextmanager

# Configure logging
from backend.src.paths import get_user_data_dir
import logging

log_dir = get_user_data_dir()
log_file = os.path.join(log_dir, "backend_debug.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("API")
logger.info(f"API Starting... Logging to {log_file}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    # Reset status on startup in case it was stuck
    cfg = config_manager.get_config()
    if cfg.get("status") not in ["Idle", "Error"]:
        logger.info("Startup: Resetting stuck status to Idle.")
        config_manager.update_status("Idle")

    # Start background worker
    task = asyncio.create_task(background_worker())

    yield
    # Shutdown (optional cleanup)


app = FastAPI(
    title="Oura Free API",
    description="Self-hosted Oura ring data API — web + iOS clients.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = [
    "http://localhost:5173",             # Vite dev server (default port)
    "http://localhost:5174",             # Vite dev server (alt)
    "http://localhost:5181",             # oura-web-dev preview port
    "http://localhost:3000",             # CRA / RN Metro fallback
    "http://localhost:8091",             # Self (dev)
    "https://oura.stockmaniacs.net",     # Production web (custom domain)
    "https://oura-free.pages.dev",       # Cloudflare Pages canonical URL
    "capacitor://localhost",             # React Native iOS (Capacitor)
    "ionic://localhost",                 # React Native iOS (Ionic fallback)
]
# Allow extra origins from env (comma-separated)
extra = os.getenv("EXTRA_ALLOWED_ORIGINS", "")
if extra:
    ALLOWED_ORIGINS += [o.strip() for o in extra.split(",") if o.strip()]

# Auth middleware added first → becomes innermost (runs after CORS)
from backend.src.middleware.auth import APIKeyMiddleware
app.add_middleware(APIKeyMiddleware)

# CORS added last → becomes outermost (runs before Auth, adds headers to ALL
# responses including 401s, so browsers can read the error body cross-origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://[a-z0-9]+\.oura-free\.pages\.dev",  # CF Pages preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

# Existing data / dashboard / automation routes (all at /api/v1/*)
app.include_router(router)

# New clean REST endpoints
from backend.src.routers.api import router as v1_router
app.include_router(v1_router)

# ---------------------------------------------------------------------------
# Automation API models
# ---------------------------------------------------------------------------

class AutomationConfig(BaseModel):
    email: str
    schedule_time: str
    is_active: bool
    headless: bool = True


class OTPRequest(BaseModel):
    otp: str
    action: str = "run"  # run | download | test


# ---------------------------------------------------------------------------
# Automation endpoints (direct on app — kept from upstream)
# ---------------------------------------------------------------------------

@app.get("/api/v1/automation/status")
async def get_automation_status():
    """Returns the current automation configuration and status."""
    return config_manager.get_config()


@app.post("/api/v1/automation/config")
async def update_automation_config(config: AutomationConfig):
    """Updates automation settings."""
    config_manager.update_config(
        email=config.email,
        schedule_time=config.schedule_time,
        is_active=config.is_active,
        headless=config.headless
    )
    automator.email = config.email
    return {"status": "success", "message": "Configuration updated."}


@app.post("/api/v1/automation/submit-otp")
async def submit_otp(request: OTPRequest, background_tasks: BackgroundTasks):
    """Submits OTP code to the running automation session."""
    logger.info(f"Received OTP: {request.otp}, Action: {request.action}")
    config_manager.update_status("Submitting OTP...")

    try:
        result = await automator.submit_otp(request.otp)
        if result["status"] == "success":
            if request.action == "run":
                config_manager.update_status("Login Successful! Resuming Full Run...")
                background_tasks.add_task(run_ingestion_task, force=True)
                return {"status": "success", "message": "OTP Accepted. Resuming full automation."}
            elif request.action == "download":
                config_manager.update_status("Login Successful! Resuming Download...")
                background_tasks.add_task(run_download_existing_task)
                return {"status": "success", "message": "OTP Accepted. Resuming download."}
            elif request.action == "test":
                config_manager.update_status("Login Successful! Session saved.")
                await automator.cleanup()
                return {"status": "success", "message": "OTP Accepted. Login verified."}
            else:
                config_manager.update_status("Login Successful!")
                return {"status": "success", "message": "OTP Accepted."}
        else:
            config_manager.update_status(f"OTP Error: {result['message']}")
            return {"status": "error", "message": result['message']}
    except Exception as e:
        config_manager.update_status(f"OTP Error: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.post("/api/v1/automation/run-now")
async def run_automation(background_tasks: BackgroundTasks):
    """Manually triggers the full "Request New + Download" flow."""
    logger.info("Manual automation trigger received.")
    config_manager.update_status("Starting manual run...")

    try:
        cfg = config_manager.get_config()
        await automator.initialize(headless=cfg.get("headless", False))
        automator.email = cfg.get("email", "")
        background_tasks.add_task(run_ingestion_task, force=True)
        return {"status": "started", "message": "Automation started."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/v1/automation/clear-session")
async def clear_session():
    """Clears the current automation session."""
    try:
        if await automator.clear_session():
            config_manager.update_status("Session cleared.")
            return {"status": "success", "message": "Session cleared. Please login again."}
        return {"status": "info", "message": "No session found to clear."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/v1/automation/test-login")
async def test_login():
    """Tests the login functionality with current credentials."""
    try:
        config_manager.update_status("Testing Login...")
        cfg = config_manager.get_config()
        await automator.initialize(headless=cfg.get("headless", False))
        automator.email = cfg.get("email", "")
        res = await automator.login()
        if res and res.get("status") == "otp_required":
            config_manager.update_status("Waiting for OTP...")
            return {"status": "otp_required", "message": "OTP Required"}
        config_manager.update_status("Login Check Complete.")
        await automator.cleanup()
        return res
    except Exception as e:
        config_manager.update_status(f"Login Error: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.post("/api/v1/automation/download-latest")
async def download_latest_existing(background_tasks: BackgroundTasks):
    """Downloads the latest EXISTING export (if any). Does NOT request new."""
    background_tasks.add_task(run_download_existing_task)
    return {"status": "started", "message": "Checking for existing downloads..."}


# ---------------------------------------------------------------------------
# Background task helpers (unchanged from upstream)
# ---------------------------------------------------------------------------

async def run_download_existing_task():
    logger.info("Starting download existing task...")
    try:
        cfg = config_manager.get_config()
        if not automator._is_initialized:
            await automator.initialize(headless=cfg.get("headless", True))
        automator.email = cfg.get("email", "")

        from backend.src.paths import get_user_data_dir
        save_dir = str(get_user_data_dir())
        result = await automator.download_existing_export(save_dir=save_dir)

        if isinstance(result, dict):
            status = result.get("status", "error")
            msg = result.get("message", "Unknown error")
            if status == "otp_required":
                config_manager.update_status("Waiting for OTP...")
            else:
                logger.error(f"Download failed: {msg}")
                config_manager.update_status(f"Error: {msg}")
            await automator.cleanup()
            return

        file_path = result
        if file_path:
            await process_ingestion(file_path)
        else:
            logger.info("No existing export found.")
            config_manager.update_status("No export found on server.")

        await automator.cleanup()
    except Exception as e:
        logger.error(f"Download task failed: {e}")
        await automator.cleanup()


async def run_ingestion_task(force=False):
    cfg = config_manager.get_config()
    if not force and not cfg.get("is_active", True):
        return

    logger.info("Background worker: Starting ingestion task...")
    config_manager.update_status("Starting...")

    try:
        config_manager.update_status("Initializing...")
        headless_mode = cfg.get("headless", True)
        await automator.initialize(headless=headless_mode)
        automator.email = cfg.get("email", "")

        login_res = await automator.login()
        if login_res and login_res.get("status") == "otp_required":
            logger.info("Background worker: OTP Required.")
            config_manager.update_status("Waiting for OTP...")
            return

        config_manager.update_status("Running Automation...")

        from backend.src.paths import get_user_data_dir
        save_dir = str(get_user_data_dir())
        result = await automator.request_new_export_and_download(save_dir=save_dir)

        if isinstance(result, dict) and result.get("status") == "otp_required":
            config_manager.update_status("Waiting for OTP...")
            return

        file_path = result
        if file_path:
            config_manager.update_status("Downloading...")
            await process_ingestion(file_path)
        else:
            logger.info("Background worker: No file downloaded (Timeout or Error).")
            config_manager.update_status("Failed to download export.")

        await automator.cleanup()
    except Exception as e:
        logger.error(f"Background worker error: {e}")
        config_manager.update_status(f"Error: {str(e)}")
        await automator.cleanup()


async def process_ingestion(zip_path):
    logger.info(f"Background worker: Downloaded to {zip_path}")
    config_manager.update_status("Ingesting...")
    db = SessionLocal()
    try:
        parser = OuraParser(db)
        parser.parse_zip(zip_path)
        logger.info("Background worker: Ingestion successful.")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        config_manager.update_status("Idle", last_run=now_str)
    except Exception as e:
        logger.error(f"Background worker: Ingestion failed: {e}")
        config_manager.update_status(f"Ingestion Failed: {str(e)}")
    finally:
        db.close()


async def background_worker():
    logger.info("Background worker started.")
    while True:
        try:
            now = datetime.now()
            cfg = config_manager.get_config()

            schedule_time_str = cfg.get("schedule_time", "11:00")
            try:
                sh, sm = map(int, schedule_time_str.split(":"))
                run_today = now.replace(hour=sh, minute=sm, second=0, microsecond=0)
                next_run = run_today + timedelta(days=1) if now > run_today else run_today

                config_manager.update_status(
                    cfg.get("status", "Idle"),
                    next_run=next_run.strftime("%Y-%m-%d %H:%M:%S")
                )

                if now.hour == sh and now.minute == sm:
                    await run_ingestion_task()
                elif "Waiting" in cfg.get("status", ""):
                    if now.minute % 5 == 0:
                        logger.info("Background worker: Polling for export status...")
                        await run_ingestion_task()

            except Exception as e:
                logger.error(f"Scheduler error: {e}")

            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"Background worker loop error: {e}")
            await asyncio.sleep(60)


# ---------------------------------------------------------------------------
# Static file mount (only when frontend/dist is present — desktop mode)
# ---------------------------------------------------------------------------

from fastapi.staticfiles import StaticFiles

current_dir = os.path.dirname(os.path.abspath(__file__))
dist_dir = os.path.join(current_dir, "../../../frontend/dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    import sys

    port = int(os.getenv("PORT", "8091"))

    if getattr(sys, 'frozen', False):
        # Production (Frozen / PyInstaller)
        try:
            uvicorn.run(app, host="127.0.0.1", port=port, reload=False)
        except Exception as e:
            from backend.src.paths import get_user_data_dir
            import traceback
            try:
                log_path = os.path.join(get_user_data_dir(), "startup_crash.log")
                with open(log_path, "w", encoding="utf-8") as f:
                    f.write(f"Startup Crash: {e}\n")
                    f.write(traceback.format_exc())
            except Exception:
                pass
            raise e
    else:
        # Development
        uvicorn.run(
            "backend.src.api.main:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            reload_dirs=["backend"]
        )
