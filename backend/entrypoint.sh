#!/bin/sh
set -e

VAPID_KEYS_FILE="${VAPID_KEYS_FILE:-/data/vapid/keys.env}"
AUTO_GENERATE_VAPID_KEYS_FLAG=$(printf '%s' "${AUTO_GENERATE_VAPID_KEYS:-true}" | tr '[:upper:]' '[:lower:]')

load_vapid_from_file() {
  if [ -f "$VAPID_KEYS_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$VAPID_KEYS_FILE"
    set +a
    echo "Loaded VAPID keys from $VAPID_KEYS_FILE."
  fi
}

if [ -z "${VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; then
  load_vapid_from_file
fi

if [ "$AUTO_GENERATE_VAPID_KEYS_FLAG" = "true" ] && { [ -z "${VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; }; then
  VAPID_SUBJECT_VALUE="${VAPID_SUBJECT:-mailto:admin@legacykeeper.local}"
  mkdir -p "$(dirname "$VAPID_KEYS_FILE")"

  echo "VAPID keys are missing. Generating runtime keys..."
  python manage.py generate_vapid_keys --subject "$VAPID_SUBJECT_VALUE" --write-env "$VAPID_KEYS_FILE" >/tmp/legacykeeper_vapid.log
  load_vapid_from_file
  echo "Runtime VAPID keys generated."
fi

python - <<'PY'
import os
import sys
import time
from urllib.parse import urlparse

import psycopg2

database_url = os.environ.get("DATABASE_URL", "").strip()
if not database_url:
    sys.exit("DATABASE_URL is not set.")

if database_url.startswith("sqlite"):
    print("SQLite database configured. Skipping PostgreSQL wait.")
else:
    max_attempts = 30
    for attempt in range(1, max_attempts + 1):
        try:
            conn = psycopg2.connect(database_url)
            conn.close()
            print("PostgreSQL is ready.")
            break
        except Exception as exc:
            print(f"Waiting for PostgreSQL ({attempt}/{max_attempts}): {exc}")
            time.sleep(2)
    else:
        sys.exit("PostgreSQL did not become ready in time.")

broker_url = os.environ.get("CELERY_BROKER_URL", "").strip()
if broker_url.startswith("redis://") or broker_url.startswith("rediss://"):
    try:
        import redis
    except Exception as exc:
        sys.exit(f"Redis client dependency is unavailable: {exc}")

    parsed = urlparse(broker_url)
    redis_host = parsed.hostname or "127.0.0.1"
    redis_port = parsed.port or 6379
    redis_password = parsed.password
    redis_db = 0
    try:
        redis_db = int(parsed.path.lstrip("/") or 0)
    except ValueError:
        redis_db = 0

    max_attempts = 30
    for attempt in range(1, max_attempts + 1):
        try:
            client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                socket_timeout=2,
            )
            client.ping()
            print("Redis is ready.")
            break
        except Exception as exc:
            print(f"Waiting for Redis ({attempt}/{max_attempts}): {exc}")
            time.sleep(2)
    else:
        sys.exit("Redis did not become ready in time.")
else:
    print("CELERY_BROKER_URL is not Redis. Skipping Redis wait.")
PY

python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
