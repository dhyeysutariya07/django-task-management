import { api } from './api';
import { User } from '@/types';

/**
 * User service for fetching user data
 */
export const userService = {
  /**
   * Get all staff users (for task assignment)
   */
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/auth/staff/');
    return response.data;
  },
};
