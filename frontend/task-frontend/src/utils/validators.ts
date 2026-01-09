export const validators = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
   */
  isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    return { valid: true };
  },

  /**
   * Validate task form data
   */
  validateTaskForm(data: {
    title?: string;
    description?: string;
    estimatedHours?: number;
    deadline?: string;
  }): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.title || data.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (data.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.description = 'Description is required';
    }

    if (data.estimatedHours !== undefined && data.estimatedHours <= 0) {
      errors.estimatedHours = 'Estimated hours must be greater than 0';
    }

    if (!data.deadline) {
      errors.deadline = 'Deadline is required';
    } else {
      const deadline = new Date(data.deadline);
      const now = new Date();
      if (deadline <= now) {
        errors.deadline = 'Deadline must be in the future';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate required field
   */
  isRequired(value: string | number | undefined | null): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }
};
