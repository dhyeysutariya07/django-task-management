import { jwtDecode } from 'jwt-decode';
import { AuthTokens } from '@/types';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

interface JWTPayload {
  exp: number;
  user_id: number;
}

export const tokenManager = {
  saveTokens(accessToken: string, refreshToken: string): void {
    try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getTokenExpiry(): number | null {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  isTokenExpiringSoon(thresholdMs: number = 120000): boolean {
    const expiry = this.getTokenExpiry();
    if (!expiry) return true;
    
    const now = Date.now();
    const timeUntilExpiry = expiry - now;
    
    return timeUntilExpiry <= thresholdMs;
  },

  isTokenExpired(): boolean {
    const expiry = this.getTokenExpiry();
    if (!expiry) return true;
    
    return Date.now() >= expiry;
  },

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwtDecode<JWTPayload>(token);
    } catch {
      return null;
    }
  },

  getTokens(): AuthTokens | null {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();
    const expiresAt = this.getTokenExpiry();

    if (!access || !refresh || !expiresAt) {
      return null;
    }

    return { access, refresh, expiresAt };
  }
};
