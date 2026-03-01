# LegacyKeeper (Docker Setup)

This repository is now containerized with:

- `backend` (Django API)
- `web_ui` (React app served by Nginx)
- `postgres` (database)
- `minio` (object storage + console)

## Run Everything

From the repository root:

```bash
docker compose up --build
```

## Exposed Ports

- Web UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/api/docs/`
- Postgres: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

MinIO credentials (dev defaults):

- Username: `minioadmin`
- Password: `minioadmin`

## First-Time Admin User

In a second terminal:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Stop Services

```bash
docker compose down
```

To remove persistent Postgres/MinIO data volumes too:

```bash
docker compose down -v
```
