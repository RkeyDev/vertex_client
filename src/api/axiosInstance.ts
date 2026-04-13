import axios from 'axios';

/**
 * Professional Axios Instance for Vertex
 * Handles JWT injection and silent refresh logic using localStorage for persistence.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Injects the Access Token into the Authorization header for every outgoing request.
 */
api.interceptors.request.use(
  (config) => {
    // Moved from sessionStorage to localStorage for cross-tab persistence
    const token = localStorage.getItem('vertex_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 * Intercepts 401 Unauthorized responses to attempt a silent token refresh.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized: Trigger Silent Refresh if not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('vertex_refresh_token');

      if (refreshToken) {
        try {
          // Use a clean axios instance to avoid infinite interceptor loops
          const refreshResponse = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken
          });

          // Extracts accessToken from the Java ApiResponse<T> DTO structure
          const { accessToken, newRefreshToken } = refreshResponse.data.data;

          // Update localStorage with the fresh credentials
          localStorage.setItem('vertex_access_token', accessToken);
          
          // Optional: Update refresh token if the backend rotates it (Best Practice)
          if (newRefreshToken) {
            localStorage.setItem('vertex_refresh_token', newRefreshToken);
          }

          // Update the original request header and retry
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          // Refresh failed (e.g., Refresh Token expired/revoked) -> Full Logout
          localStorage.removeItem('vertex_access_token');
          localStorage.removeItem('vertex_refresh_token');
          
          // Redirect to login with state for UI feedback
          window.location.href = '/login?expired=true';
          return Promise.reject(refreshError);
        }
      }
    }

    // Standardized error extraction from backend ApiResponse structure
    const message = error.response?.data?.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;