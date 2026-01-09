import { api } from './api';
import { Analytics } from '@/types';

export const analyticsService = {
  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<Analytics> {
    const response = await api.get('/tasks/analytics/');
    return response.data;
  },
};
