type QueryValue = string | number | boolean | null | undefined;

function getOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function buildAppUrl(pathname: string, search?: Record<string, QueryValue>) {
  const url = new URL(pathname, getOrigin() || 'http://localhost');

  Object.entries(search || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export function buildMemoryShareUrl(vaultId: string | null | undefined, memoryId: string) {
  if (!vaultId) return '';
  return buildAppUrl('/museum', { vaultId, memoryId });
}

export function buildPersonShareUrl(vaultId: string | null | undefined, personId: string) {
  if (!vaultId) return '';
  return buildAppUrl(`/person/${personId}`, { vaultId });
}

export function buildShareUrl(token: string) {
  return buildAppUrl(`/share/${token}`);
}

export function parseRouteTarget(target: string, fallbackPath = '/dashboard') {
  const resolved = target || fallbackPath;
  const url = new URL(resolved, getOrigin() || 'http://localhost');
  const search: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    search[key] = value;
  });

  return {
    to: url.pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
  };
}
