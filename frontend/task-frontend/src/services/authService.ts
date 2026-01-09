import api from './api';
import { LoginCredentials, RegisterData, User, LoginResponse } from '@/types';
import { tokenManager } from '@/utils/tokenManager';

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const captchaAnswer = sessionStorage.getItem('captcha_answer');
    
    const response = await api.post('/auth/login/', {
      username: credentials.username,
      password: credentials.password,
    }, {
      headers: captchaAnswer ? { 'X-Captcha-Answer': captchaAnswer } : {},
    });
    
    const { access, refresh } = response.data;
    tokenManager.saveTokens(access, refresh);
    
    // Clear captcha after successful login
    sessionStorage.removeItem('captcha_question');
    sessionStorage.removeItem('captcha_answer');
    
    return { access, refresh };
  },

  /**
   * Register new user
   */
  async register(data: RegisterData) {
    const response = await api.post('/auth/register/', {
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
    });
    return response.data;
  },

  /**
   * Verify email - GET request with token in URL
   */
  async verifyEmail(token: string) {
    const response = await api.get(`/auth/verify-email/${token}/`);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = tokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post('/auth/refresh/', {
      refresh: refreshToken,
    });
    
    const { access, refresh } = response.data;
    tokenManager.saveTokens(access, refresh);
    
    return { access, refresh };
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      
      if (refreshToken) {
        await api.post('/auth/logout/', {
          refresh: refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me/');
    return response.data;
  },
};
