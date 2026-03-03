# LegacyKeeper Web UI

Frontend app for LegacyKeeper.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand
- TanStack Query + Router + Table

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Docker

From repository root:

```bash
docker compose up --build
```

UI is available at `http://localhost:5173`.

## AI UX Behavior

For photo memories:

- EXIF extraction and face detection run in backend via Redis + Celery.
- UI shows background status for both workflows.
- EXIF still requires uploader confirmation before applying extracted date/GPS.
- Face detection shows bounding boxes on the photo and face thumbnails in the detail panel.
- Each detected face must be manually confirmed by linking a person profile (human-in-the-loop).
- Multi-file EXIF candidates are shown with per-file selection and thumbnail/asset preview.
- Polling is scoped:
  - active right after create/edit events
  - disabled once terminal EXIF status is reached (`CONFIRMED`, `REJECTED`, `NOT_AVAILABLE`, `FAILED`)
  - no always-on global polling

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL (example: `http://127.0.0.1:8000/api/`)
- `VITE_GOOGLE_CLIENT_ID`: optional Google OAuth client id
- `VITE_VAPID_PUBLIC_KEY`: optional push-key fallback if backend endpoint is unavailable

Copy `.env.example` to your local env file (`.env` or `.env.development`) and update values.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: build production assets
- `npm run preview`: preview production build
