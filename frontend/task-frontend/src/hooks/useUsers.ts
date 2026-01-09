import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

/**
 * Hook to fetch all users
 */
export const useUsersQuery = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAllUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
