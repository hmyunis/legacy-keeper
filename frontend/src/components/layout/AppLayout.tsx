import { Outlet } from '@tanstack/react-router';
import { MuseumLayout } from './MuseumLayout';

/** Authenticated app shell — full wing navigation. */
export function AppLayout() {
  return (
    <MuseumLayout navMode="app">
      <Outlet />
    </MuseumLayout>
  );
}
