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
PY

python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000
