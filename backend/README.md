# LegacyKeeper Backend

Django REST API for the Intelligent Family Memory Vault.

## Docker (Recommended)

From the repository root:

```bash
docker compose up --build
```

The backend will run on `http://localhost:8000` with Postgres + MinIO preconfigured.

## Quick Start

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   # or with pipenv
   pipenv install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   python manage.py migrate
   ```

4. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run development server**
   ```bash
   python manage.py runserver
   ```

## API Documentation

- **Swagger UI**: http://127.0.0.1:8000/api/docs/
- **ReDoc**: http://127.0.0.1:8000/api/redoc/
- **Schema**: http://127.0.0.1:8000/api/schema/

## Key Features

- **User Management**: Registration, email verification, JWT authentication
- **Family Vaults**: Secure digital heritage storage with role-based access
- **Media Processing**: AI-powered photo analysis (EXIF extraction, face detection)
- **Genealogy**: Family tree management and relationship tracking
- **Audit Logging**: Complete activity tracking for compliance

## Configuration

### Storage
- **Development**: Local filesystem storage
- **Production**: S3/MinIO cloud storage (configure in `.env`)

### Email
- Uses Maileroo for transactional emails
- Mock mode for development (console output)

### Security
- JWT-based authentication
- Role-based permissions within vaults
- CORS enabled for frontend integration

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DEBUG`: Development/production mode
- `SECRET_KEY`: Django secret key
- `DATABASE_URL`: Database connection string
- `FRONTEND_URL`: Frontend base URL used for email verification/join links
- `MAILEROO_API_KEY`: Email service API key
- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth client ID for id-token verification
- `VAPID_PUBLIC_KEY`: VAPID public key for browser push notifications
- `VAPID_PRIVATE_KEY`: VAPID private key for browser push notifications
- `VAPID_SUBJECT`: contact URI for VAPID claims (example: `mailto:admin@example.com`)
- `AWS_*`: Cloud storage configuration

### VAPID Key Setup (Push Notifications)

#### Docker compose (automatic)

When running with Docker, VAPID keys are generated automatically on container startup if missing.

- Controlled by `AUTO_GENERATE_VAPID_KEYS` (default `true` in `backend/.env.docker`)
- Subject is taken from `VAPID_SUBJECT`
- Keys are stored in `VAPID_KEYS_FILE` (default `/data/vapid/keys.env`) on a Docker volume (`backend_vapid`)
- Triggered by `backend/entrypoint.sh` before migrations/server start

So with `docker compose up --build`, you do not need to pre-generate keys manually.

If you want to rotate keys intentionally, clear the volume and recreate containers:

```bash
docker compose down -v
docker compose up --build
```

#### Manual / non-docker setup

Generate keys using the backend management command:

```bash
cd backend
python manage.py generate_vapid_keys --subject "mailto:you@example.com"
```

Or write/update env values automatically:

```bash
cd backend
python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env
python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env.docker
```

If you do not use `--write-env`, set these in backend env files manually:

- Local run: `backend/.env`
- Docker compose run: `backend/.env.docker`

Required values:

- `VAPID_PUBLIC_KEY=<public key from command output>`
- `VAPID_PRIVATE_KEY=<private key from command output>`
- `VAPID_SUBJECT=mailto:you@example.com`

For local frontend fallback, you can also set `VITE_VAPID_PUBLIC_KEY` to the same public key.
