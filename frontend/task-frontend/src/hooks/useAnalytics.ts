import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';

/**
 * Hook to fetch analytics data
 * Auto-refetches every 5 minutes
 */
export const useAnalyticsQuery = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsService.getAnalytics(),
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Auto-refetch every 5 minutes
  });
};
