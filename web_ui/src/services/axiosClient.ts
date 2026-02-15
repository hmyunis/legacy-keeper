import axios, { AxiosHeaders } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { AUTH_API, AUTH_RELATED_PATHS } from './authEndpoints';
import { appEnv } from './env';

const axiosClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
let didForceLogout = false;

const isAuthRequest = (url?: string) => AUTH_RELATED_PATHS.some((path) => (url || '').includes(path));

const forceLogout = () => {
  if (didForceLogout) {
    return;
  }

  didForceLogout = true;
  useAuthStore.getState().logout();
  toast.error('Session expired', {
    description: 'Your session is no longer valid. Please log in again.',
  });

  setTimeout(() => {
    didForceLogout = false;
  }, 1000);
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = refreshClient
    .post<{ access?: string; refresh?: string }>(AUTH_API.refreshToken, { refresh: refreshToken })
    .then((response) => {
      const nextAccessToken = response.data?.access;
      if (!nextAccessToken) {
        return null;
      }

      useAuthStore.getState().setTokens({
        accessToken: nextAccessToken,
        refreshToken: response.data?.refresh,
      });

      return nextAccessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

axiosClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers);
      headers.delete('Content-Type');
      headers.delete('content-type');
      config.headers = headers;
    }

    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const requestConfig = error.config as RetriableRequest | undefined;

    if (status === 401 && requestConfig && !requestConfig._retry && !isAuthRequest(requestConfig.url)) {
      requestConfig._retry = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
        requestConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(requestConfig);
      }

      forceLogout();
    }

    if (status === 500) {
      toast.error('Server error', {
        description: 'An unexpected server error occurred.',
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
