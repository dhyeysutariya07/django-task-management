/**
 * Date utility functions
 */
export const dateUtils = {
  /**
   * Format date to locale string
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  },

  /**
   * Format date and time to locale string
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  },

  /**
   * Check if a date is overdue
   */
  isOverdue(dateString: string): boolean {
    return new Date(dateString) < new Date();
  },

  /**
   * Check if deadline is within 24 hours
   */
  isDeadlineWithin24Hours(date: string | Date): boolean {
    const deadline = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const hoursUntilDeadline = diffMs / (1000 * 60 * 60);
    
    return hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;
  },

  /**
   * Get hours until deadline (can be negative if overdue)
   */
  getHoursUntilDeadline(date: string | Date): number {
    const deadline = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  },

  /**
   * Get time until deadline in human-readable format
   */
  getTimeUntilDeadline(dateString: string): string {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) {
      const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    }
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  },
};

