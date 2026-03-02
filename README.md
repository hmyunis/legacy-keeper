# LegacyKeeper

LegacyKeeper is a family memory vault with:

- `backend` (Django REST API)
- `web_ui` (React + Vite, served by Nginx in Docker)
- `postgres` (database)
- `minio` (object storage)
- `redis` (Celery broker/result backend)
- `media_worker` (Celery worker for EXIF/background tasks)

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

## EXIF Background Processing

Photo EXIF extraction is asynchronous and handled by Redis + Celery:

1. Memory is created or edited.
2. Backend queues EXIF extraction (`QUEUED`) on Redis.
3. `media_worker` extracts EXIF from all attached files (`PROCESSING`).
4. If candidates exist, status becomes `AWAITING_CONFIRMATION`.
5. Uploader confirms/rejects candidate metadata:
   - `CONFIRMED` if accepted
   - `REJECTED` if rejected
6. If no usable EXIF exists: `NOT_AVAILABLE`.
7. On error: `FAILED`.

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
