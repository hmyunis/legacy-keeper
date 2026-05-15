import { Outlet } from '@tanstack/react-router';
import { MuseumLayout } from './MuseumLayout';

/** Marketing & auth pages — minimal navbar (no app wings). */
export function PublicLayout() {
  return (
    <MuseumLayout navMode="public">
      <Outlet />
    </MuseumLayout>
  );
}
