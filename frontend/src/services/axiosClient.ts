import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { appEnv } from './env';

const axiosClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

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
      originalRequest._retry = true;
      const { refreshToken, currentUser, activeVaultId, login, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${appEnv.apiBaseUrl}auth/token/refresh/`, {
            refresh: refreshToken
          });

          login({
            user: currentUser!,
            accessToken: response.data.access,
            refreshToken: response.data.refresh || refreshToken,
            activeVaultId
          });

          originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
          return axiosClient(originalRequest);
        } catch (refreshError) {
          logout();
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;