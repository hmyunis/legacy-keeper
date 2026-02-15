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

## Environment Variables

- `VITE_API_BASE_URL`: backend API base URL (example: `http://127.0.0.1:8000/api`)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client id for browser sign-in
- `VITE_VAPID_PUBLIC_KEY`: optional web-push VAPID public key fallback used for browser subscriptions

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
