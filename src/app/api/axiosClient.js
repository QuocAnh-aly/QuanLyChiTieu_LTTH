import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  clearSession,
} from "./tokenStore";

const axiosClient = axios.create({
  baseURL: "http://localhost:5229", // APIGateway URL
  // Gửi kèm cookie HttpOnly (refresh token) trong các request tới /api/auth/*.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Track whether we're already refreshing to avoid infinite loops ────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Xóa toàn bộ dấu vết phiên ở client (access token trong RAM + cache không bí mật).
const purgeSession = () => {
  clearAccessToken();
  clearSession();
  localStorage.removeItem("user_id");
  localStorage.removeItem("app_tags");
  localStorage.removeItem("app_object_groups");
};

// ─── Interceptor: attach in-memory access token to every request ────────────
axiosClient.interceptors.request.use(
  (config) => {
    const isPublicAuth =
      config.url?.startsWith("/api/auth/signin") ||
      config.url?.startsWith("/api/auth/signup");
    if (!isPublicAuth) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
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
    if (originalRequest?.url?.includes("/api/auth/refresh")) {
      // Refresh failed — clear credentials
      purgeSession();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Refresh token đi kèm tự động qua cookie HttpOnly — không cần body.
      const { default: authApi } = await import("./authApi");
      const data = await authApi.refresh();

      if (data?.access_token) {
        setAccessToken(data.access_token);
        processQueue(null, data.access_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosClient(originalRequest);
      }

      throw new Error("No access_token in refresh response");
    } catch (refreshError) {
      processQueue(refreshError, null);
      purgeSession();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
