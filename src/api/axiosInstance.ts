import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically injects the Access Token into the Authorization header.
 */
api.interceptors.request.use(
  (config) => {
    // We pull from sessionStorage as it's more secure for the short-lived access token
    const token = sessionStorage.getItem('vertex_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 * Handles global error messaging and the "Silent Refresh" logic for 401 errors.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle Token Expiration (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark request to avoid infinite loops

      const refreshToken = localStorage.getItem('vertex_refresh_token') || 
                           sessionStorage.getItem('vertex_refresh_token');

      if (refreshToken) {
        try {
          // Note: We use a clean axios instance here to avoid interceptor loops
          const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken
          });

          // The backend returns ApiResponse<LoginResponseDTO>
          const { accessToken } = response.data.payload;

          // Update storage with the fresh access token
          sessionStorage.setItem('vertex_access_token', accessToken);

          // Update the original request header and retry it
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails (e.g., refresh token expired), clean up and redirect
          sessionStorage.clear();
          localStorage.removeItem('vertex_refresh_token');
          window.location.href = '/login?expired=true';
          return Promise.reject(refreshError);
        }
      }
    }

    // Extract professional error message from backend ApiResponse
    const message = error.response?.data?.message || 'An unexpected error occurred';
    
    // We wrap the message in an Error object so catch blocks can access .message
    return Promise.reject(new Error(message));
  }
);

export default api;