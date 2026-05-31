import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5229', // APIGateway URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Track whether we're already refreshing to avoid infinite loops ────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Interceptor: attach access token to every request except signin/signup ─
axiosClient.interceptors.request.use(
  (config) => {
    const isPublicAuth = config.url?.startsWith('/api/auth/signin') ||
                         config.url?.startsWith('/api/auth/signup');
    if (!isPublicAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor: unwrap response data + auto-refresh on 401 ───────────────
axiosClient.interceptors.response.use(
  (response) => {
    return response?.data ?? response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Only try refresh on 401 and if we haven't already retried
    if (error?.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request WAS the refresh call
    if (originalRequest?.url?.includes('/api/auth/refresh')) {
      // Refresh failed — clear credentials
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('app_tags');
      localStorage.removeItem('app_object_groups');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      isRefreshing = false;
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    try {
      const { default: authApi } = await import('./authApi');
      const data = await authApi.refresh(refreshToken);
      
      if (data?.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        processQueue(null, data.access_token);
        
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosClient(originalRequest);
      }
      
      throw new Error('No access_token in refresh response');
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('app_tags');
      localStorage.removeItem('app_object_groups');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;
