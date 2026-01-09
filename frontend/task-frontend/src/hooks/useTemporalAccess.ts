import { useAuth } from '@/contexts/AuthContext';
import { dateUtils } from '@/utils/dateUtils';
import { TaskPriority } from '@/types';

interface TemporalAccessResult {
  canUpdate: boolean;
  message?: string;
  nextAvailableTime?: string;
}

/**
 * Hook to check temporal access control
 * Developers can only update tasks between 9 AM - 6 PM in their timezone
 * Exception: Critical priority tasks can be updated anytime
 */
export const useTemporalAccess = () => {
  const { user, hasRole } = useAuth();

  const canUpdateNow = (taskPriority?: TaskPriority): TemporalAccessResult => {
    // Managers and Auditors have no time restrictions
    if (!user || hasRole('manager') || hasRole('auditor')) {
      return { canUpdate: true };
    }

    // Critical priority tasks can be updated anytime
    if (taskPriority === 'critical') {
      return { canUpdate: true };
    }

    // Check if within working hours for developers
    if (hasRole('developer')) {
      const isWithinHours = dateUtils.isWithinWorkingHours(user.timezone);
      
      if (!isWithinHours) {
        const nextAvailable = dateUtils.getNextAvailableTime(user.timezone);
        return {
          canUpdate: false,
          message: `You can only update tasks between 9 AM - 6 PM in your timezone (${user.timezone}).`,
          nextAvailableTime: nextAvailable,
        };
      }
    }

    return { canUpdate: true };
  };

  const getAccessMessage = (taskPriority?: TaskPriority): string | null => {
    const result = canUpdateNow(taskPriority);
    return result.message || null;
  };

  return {
    canUpdateNow,
    getAccessMessage,
  };
};
