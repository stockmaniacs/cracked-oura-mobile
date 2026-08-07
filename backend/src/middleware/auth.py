"""
X-API-Key authentication middleware.

Every request to /api/v1/* must carry:
    X-API-Key: <SECRET_KEY from .env>

Exempt paths (no key required):
    /api/v1/health
    /docs
    /openapi.json
    /redoc
"""
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


# Paths that bypass auth entirely
EXEMPT_PATHS: set[str] = {
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# Prefix: any path NOT starting with /api/v1 is also exempt
# (health check, docs, root, static files)
PROTECTED_PREFIX = "/api/v1"


def _get_secret() -> str:
    key = os.getenv("SECRET_KEY", "").strip()
    if not key:
        import logging
        logging.getLogger("auth").warning(
            "SECRET_KEY is not set — all authenticated endpoints are wide open!"
        )
    return key


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Not an API call — pass through (static files, docs, etc.)
        if not path.startswith(PROTECTED_PREFIX):
            return await call_next(request)

        # Explicitly exempt paths
        if path in EXEMPT_PATHS:
            return await call_next(request)

        secret = _get_secret()

        # If SECRET_KEY is blank, skip enforcement (dev convenience)
        if not secret:
            return await call_next(request)

        api_key = request.headers.get("X-API-Key", "")
        if api_key != secret:
            return JSONResponse(
                {"detail": "Invalid or missing API key"},
                status_code=401,
            )

        return await call_next(request)
