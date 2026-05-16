import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../features/auth/stores/authStore';
import { appEnv } from '../config/env';

const axiosClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    const headers = AxiosHeaders.from(config.headers);
    headers.delete('Content-Type');
    config.headers = headers;
  }

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    config.headers = headers;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, login, currentUser } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${appEnv.apiBaseUrl}auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        const newRefreshToken = data.refresh || refreshToken;

        if (currentUser) {
          login({ user: currentUser, accessToken: newAccessToken, refreshToken: newRefreshToken });
        }

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;