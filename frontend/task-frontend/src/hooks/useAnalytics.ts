import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';

/**
 * Hook to fetch analytics data
 * Fetches automatically on mount and refetches every 5 minutes
 */
export const useAnalyticsQuery = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsService.getAnalytics(),
    staleTime: 60000, // 1 minute - data is considered fresh for 1 minute
    refetchInterval: 300000, // Auto-refetch every 5 minutes when page is active
    refetchOnMount: 'always', // Always refetch when navigating to analytics page
    refetchOnWindowFocus: false, // Don't refetch on window focus (respects global setting)
  });
};
