# LegacyKeeper

LegacyKeeper is a family memory vault with:

- `backend` (Django REST API)
- `web_ui` (React + Vite, served by Nginx in Docker)
- `postgres` (database)
- `minio` (object storage)
- `redis` (Celery broker/result backend)
- `media_worker` (Celery worker for EXIF + face detection background tasks)

## Run With Docker

From repository root:

```bash
docker compose up --build
```

## Service URLs

- Web UI: `http://localhost:5173`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/api/docs/`
- PostgreSQL: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Redis: `localhost:6379`

MinIO default dev credentials:

- Username: `minioadmin`
- Password: `minioadmin`

## MinIO Presigned Retrieval

When `USE_S3=True`, LegacyKeeper now serves media/image URLs as temporary presigned links by default:

- `AWS_USE_PRESIGNED_URLS=True`
- `AWS_PRESIGNED_URL_EXPIRE=900` (seconds)

For Docker, set `AWS_S3_PRESIGNED_ENDPOINT_URL` to the browser-reachable MinIO host (`http://localhost:9000`), while backend storage access can still use the internal service URL (`http://minio:9000`).

## EXIF Background Processing

Photo AI processing is asynchronous and handled by Redis + Celery:

1. Memory is created or edited.
2. Backend queues EXIF extraction and face detection (`QUEUED`) on Redis.
3. `media_worker` extracts EXIF metadata and detects faces in uploaded photos (`PROCESSING`).
4. EXIF candidates move to `AWAITING_CONFIRMATION`.
5. Uploader confirms/rejects candidate EXIF metadata:
   - `CONFIRMED` if accepted
   - `REJECTED` if rejected
6. Face detection returns normalized bounding boxes and per-face thumbnails.
7. A user manually confirms each face by linking it to a person profile (`genealogy/tags`).
8. If no usable EXIF/faces exist: `NOT_AVAILABLE`.
9. On task error: `FAILED`.

## Run Locally In WSL

Use this when you want native backend/frontend in WSL, while still using Docker for infra.

1. Start infra services:

```bash
docker compose up -d postgres redis minio minio-init
```

2. Backend setup:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp -n .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

3. In a second terminal, run Celery worker:

```bash
cd backend
source .venv/bin/activate
celery -A config worker -l info -Q default,media
```

4. Frontend setup:

```bash
cd web_ui
npm install
npm run dev
```

5. Open:
- Web UI: `http://localhost:5173`
- API: `http://localhost:8000`

## Useful Docker Commands

Tail logs:

```bash
docker compose logs -f backend media_worker redis
```

Create admin user:

```bash
docker compose exec backend python manage.py createsuperuser
```

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```
