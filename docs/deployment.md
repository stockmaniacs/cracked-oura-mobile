# Oura Free — Backend Deployment

**VPS:** Contabo (`contabo-vps` SSH alias) — `109.199.117.113`  
**GitHub:** https://github.com/stockmaniacs/cracked-oura-mobile  
**Production URL:** https://oura-api.stockmaniacs.net *(pending DNS)*  
**Port:** 8091 (internal, nginx reverse-proxied)  
**Deployed:** 2026-08-07

---

## Architecture

```
Client (browser / iOS app)
        │ HTTPS
        ▼
nginx (443, Certbot SSL)
        │ HTTP
        ▼
uvicorn 127.0.0.1:8091  ← oura-free.service (systemd)
        │
        ▼
SQLite /home/indrajit/.local/share/CrackedOura/oura_database.db
```

The pattern mirrors every other service on this VPS (mailblast, ipo-scanner, etc.):
nginx terminates TLS, proxies to a local uvicorn port, systemd manages the process.

---

## Step-by-Step (what was done)

### 1. GitHub Push

Changes were committed from `upstream-source/` (the fork clone) and pushed:

```bash
# local
cd ~/ClaudeCodeProjects/oura-free
rsync -av --exclude='__pycache__' --exclude='venv' \
  backend/ upstream-source/backend/
cp -r docs upstream-source/

cd upstream-source
git add backend/ docs/
git commit -m "feat: adapt backend for multi-client REST API"
git push origin main
```

**Commit:** `424e4b5`  
**Diff:** 1505 insertions — new middleware/auth.py, routers/api.py, Makefile, .env.example, docs/

---

### 2. VPS: Clone & Environment

```bash
# Run on VPS (as root, then hand off to indrajit)
sudo mkdir -p /var/www/oura-free
sudo chown indrajit:indrajit /var/www/oura-free

git clone https://github.com/stockmaniacs/cracked-oura-mobile.git /var/www/oura-free

cd /var/www/oura-free/backend
python3 -m venv venv

# Install dependencies
./venv/bin/pip install fastapi uvicorn[standard] sqlalchemy pydantic \
  python-multipart python-dotenv pandas requests httpx \
  langchain langchain-community langchain-ollama langchain-experimental \
  playwright

# Install Playwright Chromium (needed for Oura export automation)
./venv/bin/playwright install chromium
# Downloads ~115 MB to /home/indrajit/.cache/ms-playwright/
```

**Output:**
```
Chrome Headless Shell 151.0.7922.34 downloaded to
  /home/indrajit/.cache/ms-playwright/chromium_headless_shell-1234
```

---

### 3. VPS: Database Initialisation

The SQLite database is created automatically by the FastAPI lifespan handler
(`init_db()` in `src/database.py`). To pre-initialise before starting the service:

```bash
cd /var/www/oura-free
./backend/venv/bin/python -c "
import sys; sys.path.insert(0, '.')
from backend.src.database import init_db
init_db()
"
```

**Output:** `INFO:Database:Database initialized at /home/indrajit/.local/share/CrackedOura/oura_database.db`

**Tables created (13):** activity, cardiovascular_age, heart_rate, meditation,
readiness, resilience, ring_battery, ring_configuration, sleep, sleep_session,
tag, temperature, workout

---

### 4. VPS: .env

```bash
cat > /var/www/oura-free/backend/.env << 'EOF'
SECRET_KEY=CHANGE_ME
OURA_EMAIL=CHANGE_ME
OURA_PASSWORD=CHANGE_ME
PORT=8091
LLM_HOST=http://localhost:11434
LLM_MODEL=llama3.1:latest
EOF
```

> ⚠️ **Fill in `SECRET_KEY` and `OURA_EMAIL` before expecting auth and sync to work.**
> `SECRET_KEY` is the value web/mobile clients send as `X-API-Key` header.

---

### 5. VPS: Systemd Service

```bash
sudo tee /etc/systemd/system/oura-free.service > /dev/null << 'EOF'
[Unit]
Description=OuraFree FastAPI Backend
After=network.target

[Service]
Type=simple
User=indrajit
WorkingDirectory=/var/www/oura-free
EnvironmentFile=/var/www/oura-free/backend/.env
ExecStart=/var/www/oura-free/backend/venv/bin/uvicorn backend.src.api.main:app --host 127.0.0.1 --port 8091 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=oura-free

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable oura-free
sudo systemctl start oura-free
```

**Key design notes:**
- `WorkingDirectory=/var/www/oura-free` (monorepo root, not `backend/`) because all Python
  imports use `backend.src.*` absolute paths.
- `User=indrajit` (matches all other services on this VPS).
- `--workers 2` — two uvicorn workers for concurrency; the Playwright automation
  is async so it handles both workers sharing one event loop fine.

**Verify:**
```bash
sudo systemctl status oura-free
ss -tlnp | grep 8091   # → LISTEN 0 127.0.0.1:8091
curl http://127.0.0.1:8091/api/v1/health   # → {"status":"ok"}
```

---

### 6. VPS: Nginx Config

```bash
sudo tee /etc/nginx/sites-available/oura-api > /dev/null << 'EOF'
server {
    server_name oura-api.stockmaniacs.net;

    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
    }

    listen 80;
}
EOF

sudo ln -s /etc/nginx/sites-available/oura-api /etc/nginx/sites-enabled/oura-api
sudo nginx -t && sudo systemctl reload nginx
```

---

### 7. DNS + SSL — ⚠️ PENDING

The Cloudflare DNS record does not exist yet. Add it before running Certbot.

**In Cloudflare dashboard (stockmaniacs.net zone):**
| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `oura-api` | `109.199.117.113` | Proxied (orange) |

**Then run Certbot on the VPS:**
```bash
sudo certbot --nginx -d oura-api.stockmaniacs.net \
  --non-interactive --agree-tos -m stockmaniacsdotnet@gmail.com
```

Certbot will:
1. Obtain Let's Encrypt certificate
2. Rewrite nginx config to add `listen 443 ssl`
3. Add HTTP→HTTPS redirect

**Verify:**
```bash
curl https://oura-api.stockmaniacs.net/api/v1/health
# → {"status":"ok","service":"oura-free","version":"1.0.0"}
```

---

## Operations

### Logs

```bash
sudo journalctl -u oura-free -f          # live logs
sudo journalctl -u oura-free --since today  # today's logs
sudo journalctl -u oura-free -n 100      # last 100 lines
```

### Restart / Deploy Updates

```bash
# On VPS
cd /var/www/oura-free && git pull origin main
sudo systemctl restart oura-free
```

### Service Management

```bash
sudo systemctl status oura-free     # current state
sudo systemctl restart oura-free    # restart
sudo systemctl stop oura-free       # stop
sudo systemctl disable oura-free    # disable auto-start
```

### Set Real SECRET_KEY

```bash
# On VPS — generate a strong key
python3 -c "import secrets; print(secrets.token_hex(32))"

# Paste output into .env
nano /var/www/oura-free/backend/.env
# Update: SECRET_KEY=<output>

sudo systemctl restart oura-free
```

---

## Tested API Calls (all verified working 2026-08-07)

```bash
BASE=http://127.0.0.1:8091   # (use https://oura-api.stockmaniacs.net after DNS)
KEY=CHANGE_ME                # replace with real SECRET_KEY

# Health — no auth required
curl $BASE/api/v1/health

# Auth enforcement — missing key → 401
curl $BASE/api/v1/sleep
# → {"detail":"Invalid or missing API key"}

# Auth enforcement — wrong key → 401
curl -H "X-API-Key: wrong" $BASE/api/v1/sleep
# → {"detail":"Invalid or missing API key"}

# Sync status (empty DB on fresh deploy)
curl -H "X-API-Key: $KEY" $BASE/api/v1/sync/status

# Today summary (nulls until Oura data is synced)
curl -H "X-API-Key: $KEY" $BASE/api/v1/summary/today

# DB schema (used by widget editor)
curl -H "X-API-Key: $KEY" $BASE/api/v1/schema

# Interactive docs
open http://127.0.0.1:8091/docs
```

---

## Onboarding: First Sync

After setting `OURA_EMAIL` in .env and restarting the service:

**Option A — Playwright automation (headless)**
```bash
curl -X POST -H "X-API-Key: $KEY" $BASE/api/v1/automation/start-login \
     -H "Content-Type: application/json" -d '{"email":"your@email.com"}'
# → {"status":"otp_required","message":"OTP required"}

# Check email, then:
curl -X POST -H "X-API-Key: $KEY" $BASE/api/v1/automation/submit-otp \
     -H "Content-Type: application/json" -d '{"otp":"123456","action":"run"}'

# Poll until sync completes (typically 10 min - 2 hrs for Oura export generation)
curl -H "X-API-Key: $KEY" $BASE/api/v1/sync/status
```

**Option B — Manual ZIP upload**
1. Download your data from https://membership.ouraring.com/data-export
2. Upload:
```bash
curl -X POST -H "X-API-Key: $KEY" $BASE/api/v1/ingest/zip \
     -F "file=@~/Downloads/oura_export.zip"
```

---

## File Locations on VPS

| Path | Description |
|------|-------------|
| `/var/www/oura-free/` | Monorepo root (git repo) |
| `/var/www/oura-free/backend/` | FastAPI app |
| `/var/www/oura-free/backend/.env` | Secrets (not in git) |
| `/var/www/oura-free/backend/venv/` | Python virtualenv |
| `/etc/systemd/system/oura-free.service` | Systemd unit |
| `/etc/nginx/sites-available/oura-api` | Nginx config |
| `/home/indrajit/.local/share/CrackedOura/oura_database.db` | SQLite database |
| `/home/indrajit/.local/share/CrackedOura/oura_config.json` | Automation config |
| `/home/indrajit/.cache/ms-playwright/` | Playwright Chromium binary |
