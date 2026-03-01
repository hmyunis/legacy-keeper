# LegacyKeeper Web UI

Brief frontend app for LegacyKeeper, a family memory vault focused on archive management, timeline exploration, and lineage views.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand
- TanStack Query, Router, and Table

## Quick Start

```bash
npm install
# copy .env.example to .env.development and set values
npm run dev
```

Open `http://localhost:5173`.

## Docker

From the repository root:

```bash
docker compose up --build
```

The UI will be available on `http://localhost:5173`.

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL (example: `http://127.0.0.1:8000/api`)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client id for browser sign-in
- `VITE_VAPID_PUBLIC_KEY`: optional web-push VAPID public key fallback used for browser subscriptions

### VAPID Key Setup (Push Notifications)

Frontend and backend must share the same VAPID public key. The UI first fetches the public key from backend (`/notifications/push/public-key/`) and only falls back to `VITE_VAPID_PUBLIC_KEY` if needed.

#### Docker compose (automatic)

With `docker compose up --build`:

1. Backend auto-generates VAPID keys when missing (see backend README).
2. Backend persists those keys in a Docker volume so subscriptions stay valid across restarts.
3. Frontend reads the runtime public key from backend.

No manual VAPID key wiring in `docker-compose.yml` is required.

#### Manual / local setup

1. Generate keys once:
   ```bash
   cd backend
   python manage.py generate_vapid_keys --subject "mailto:you@example.com"
   ```
   Or update backend env files directly:
   ```bash
   cd backend
   python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env
   python manage.py generate_vapid_keys --subject "mailto:you@example.com" --write-env .env.docker
   ```
2. Put the public key in frontend config:
   - local dev: `web_ui/.env` or `web_ui/.env.development`
3. Put both keys on backend:
   - `backend/.env` or `backend/.env.docker`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

If these values do not match, browser push subscription will fail.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: build production assets
- `npm run preview`: preview production build locally

## Source Layout

- `src/app`: app shell and router composition
- `src/components`: shared and feature UI components
- `src/pages`: route-level pages
- `src/hooks`: API/state hooks
- `src/services`: HTTP clients and API modules
- `src/stores`: Zustand stores
- `src/config`: navigation and permission config
- `src/i18n`: localization provider and dictionaries
