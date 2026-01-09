import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from '@/utils/tokenManager';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auto-refresh and errors
api.interceptors.response.use(
  (response) => {
    // Check for auto-refresh token in response headers
    const newToken = response.headers['x-new-token'];
    const newRefreshToken = response.headers['x-new-refresh-token'];
    
    if (newToken && newRefreshToken) {
      tokenManager.saveTokens(newToken, newRefreshToken);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      const refreshToken = tokenManager.getRefreshToken();
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access, refresh } = response.data;
          tokenManager.saveTokens(access, refresh);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        tokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const writeAvailableIn = error.response.headers['x-write-available-in'];
      
      if (writeAvailableIn) {
        const seconds = parseInt(writeAvailableIn, 10);
        const minutes = Math.ceil(seconds / 60);
        toast.error(`Rate limit exceeded. Write operations available in ${minutes} minute(s).`);
      } else {
        toast.error('Rate limit exceeded. Please try again later.');
      }
    }
    
    // Handle CAPTCHA challenge
    if (error.response?.status === 403) {
      const captchaQuestion = error.response.headers['x-captcha-question'];
      
      if (captchaQuestion) {
        // Store captcha question for login form to display
        sessionStorage.setItem('captcha_question', captchaQuestion);
      }
    }
    
    // Handle other errors
    if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
