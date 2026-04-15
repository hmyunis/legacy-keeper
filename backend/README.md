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

### Check Background AI Stack

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

5. Start Redis + Celery worker (required for EXIF, face detection, and restoration background processing):

```bash
redis-server
celery -A config worker -l info -Q default,media
```

## AI Workflow (Redis + Celery)

When a memory is created or edited:

1. Backend enqueues `media.tasks.extract_media_exif_task` to queue `media`.
2. Backend enqueues `media.tasks.detect_media_faces_task` to queue `media`.
3. Worker extracts EXIF from all attached files (not only primary file).
4. Worker detects faces, stores normalized bounding boxes, and generates face thumbnails.
5. Uploader confirms or rejects extracted EXIF metadata.
6. Family members confirm each detected face by linking it to a `PersonProfile`.

When restoration is triggered for a photo:

1. Backend enqueues `media.tasks.restore_media_photo_task` to queue `media`.
2. Worker applies denoise and/or colorize operations on the selected photo file.
3. Restored output is persisted and returned via restoration status endpoint.

EXIF status lifecycle:

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

Face detection status lifecycle:

- `NOT_STARTED`
- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `NOT_AVAILABLE`
- `FAILED`

Relevant API actions:

- `GET /api/media/{id}/face-detection-status/`
- `POST /api/genealogy/tags/` (manual face confirmation by linking profile)

Restoration status lifecycle:

- `NOT_STARTED`
- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `NOT_AVAILABLE`
- `FAILED`

Relevant API actions:

- `POST /api/media/{id}/restore/`
- `GET /api/media/{id}/restoration-status/`

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

Important storage URL variables (MinIO/S3):

- `AWS_USE_PRESIGNED_URLS` (default: `True`)
- `AWS_PRESIGNED_URL_EXPIRE` (default: `900` seconds)
- `AWS_S3_PRESIGNED_ENDPOINT_URL` (public endpoint used in signed links, e.g. `http://localhost:9000`)

Media restoration model variables:

- `MEDIA_RESTORATION_MODEL_DIR` (default: `<backend>/models/colorization`)
- `MEDIA_RESTORATION_AUTO_DOWNLOAD` (default: `True`)

Note: on first high-quality colorization run, backend may download model files and cache them in `MEDIA_RESTORATION_MODEL_DIR`.

To verify readiness, ensure these files exist in `MEDIA_RESTORATION_MODEL_DIR`:

- `colorization_deploy_v2.prototxt`
- `colorization_release_v2.caffemodel`
- `pts_in_hull.npy`

For Docker, place the files in `/app/models/colorization` inside the `media_worker` container. If your runtime has no outbound internet, download the files manually.

## Testing

```bash
docker compose exec -e DJANGO_SETTINGS_MODULE=config.settings backend pytest
```

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
