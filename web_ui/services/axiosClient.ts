
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for simulated JWT
axiosClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 Unauthorized (Invalid JWT)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Access store directly to clear state
      useAuthStore.getState().logout();
      
      toast.error('Session expired', {
        description: 'Your security token is no longer valid. Please log in again.',
      });
    } else if (error.response?.status === 500) {
      toast.error('Vault Error', {
        description: 'A server-side error occurred in the archival system.',
      });
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
