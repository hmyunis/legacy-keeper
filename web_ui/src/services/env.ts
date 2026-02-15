const readEnv = (key: string) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeApiBaseUrl = (value: string) => {
  const baseUrl = value || '/api';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

export const appEnv = {
  apiBaseUrl: normalizeApiBaseUrl(readEnv('VITE_API_BASE_URL')),
  googleClientId: readEnv('VITE_GOOGLE_CLIENT_ID'),
  vapidPublicKey: readEnv('VITE_VAPID_PUBLIC_KEY'),
};

export const isGoogleOAuthEnabled = Boolean(appEnv.googleClientId);
