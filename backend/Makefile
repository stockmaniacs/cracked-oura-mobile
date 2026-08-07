# ── Oura Free — Backend Makefile ───────────────────────────────────────────
# Run from the backend/ directory.
# The Python package uses `backend.src.*` absolute imports, so all uvicorn
# commands cd to the monorepo root (parent of backend/) before launching.
#
#   make install   install Python dependencies into the active venv
#   make dev       start the dev server on port 8091 with auto-reload
#   make start     start the production server on port 8091 (2 workers)
#   make lint      run flake8
#   make test      run pytest
# ---------------------------------------------------------------------------

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))..)
PORT ?= 8091

.PHONY: install dev start lint test

install:
	pip install -r requirements.txt
	playwright install chromium

dev:
	cd $(ROOT) && uvicorn backend.src.api.main:app \
		--reload \
		--reload-dir backend \
		--host 0.0.0.0 \
		--port $(PORT)

start:
	cd $(ROOT) && uvicorn backend.src.api.main:app \
		--host 0.0.0.0 \
		--port $(PORT) \
		--workers 2

lint:
	cd $(ROOT) && flake8 backend/src --max-line-length=120

test:
	cd $(ROOT) && pytest backend/tests -v
