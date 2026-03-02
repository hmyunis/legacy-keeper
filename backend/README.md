# LegacyKeeper Backend

Django REST API for LegacyKeeper.

## Docker (Recommended)

From repository root:

```bash
docker compose up --build
```

This starts:

- `backend` (API)
- `media_worker` (Celery worker)
- `redis` (broker/backend for Celery)
- `postgres`
- `minio`

### Check Background EXIF Stack

```bash
docker compose logs -f backend media_worker redis
```

## Local Development (Non-Docker)

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Run migrations:

```bash
python manage.py migrate
```

4. Start API:

```bash
python manage.py runserver
```

5. Start Redis + Celery worker (required for EXIF background processing):

```bash
redis-server
celery -A config worker -l info -Q default,media
```

## EXIF Workflow (Redis + Celery)

When a memory is created or edited:

1. Backend enqueues `media.tasks.extract_media_exif_task` to queue `media`.
2. Worker extracts EXIF from all attached files (not only primary file).
3. Candidate metadata is stored and exposed via API.
4. Uploader confirms or rejects extracted metadata.

Status lifecycle:

- `NOT_STARTED`
- `QUEUED`
- `PROCESSING`
- `AWAITING_CONFIRMATION`
- `CONFIRMED` or `REJECTED`
- `NOT_AVAILABLE`
- `FAILED`

Relevant API actions:

- `GET /api/media/{id}/exif-status/`
- `POST /api/media/{id}/exif-confirm/`

## API Documentation

- Swagger: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- Schema: `http://127.0.0.1:8000/api/schema/`

## Environment Variables

See `.env.example` for all variables.

Important Redis/Celery variables:

- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `CELERY_TASK_DEFAULT_QUEUE`
- `CELERY_TASK_TIME_LIMIT`
- `CELERY_TASK_SOFT_TIME_LIMIT`
- `CELERY_RESULT_EXPIRES`
- `CELERY_VISIBILITY_TIMEOUT`

## VAPID Keys (Push Notifications)

### Docker

- `AUTO_GENERATE_VAPID_KEYS=true` in `.env.docker` auto-generates keys at container startup.
- Keys are stored in `VAPID_KEYS_FILE` (default `/data/vapid/keys.env`) on volume `backend_vapid`.

### Local

Generate manually:

```bash
python manage.py generate_vapid_keys --subject "mailto:you@example.com"
```

Or write directly to env files:

```bash
python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env
python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env.docker
```
