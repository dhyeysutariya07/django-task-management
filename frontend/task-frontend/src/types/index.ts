// User types
export type UserRole = 'manager' | 'developer' | 'auditor';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  timezone?: string;
  isEmailVerified?: boolean;
}

// Task types
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Tag {
  id: number;
  name: string;
}

// TaskRead - for GET responses
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string; // username string in read
  created_by: string; // username string in read
  parent_task: number | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  deadline: string | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

// TaskWrite - for POST/PUT/PATCH requests
export interface TaskWrite {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to: number; // user ID in write
  parent_task?: number | null;
  estimated_hours?: string | null;
  actual_hours?: string | null;
  deadline?: string | null;
  tags?: string[]; // tag names array
}

export interface TaskHistory {
  id: number;
  task: number;
  task_title: string;
  changed_by: number | null;
  changed_by_name: string;
  previous_status: string;
  new_status: string;
  timestamp: string;
  notes: string | null;
}

export interface Notification {
  id: number;
  task: number | null;
  task_title: string;
  message: string;
  created_at: string;
}

// Analytics types
export interface TasksByStatus {
  pending?: number;
  in_progress?: number;
  blocked?: number;
  completed?: number;
}

export interface PriorityDistribution {
  low?: number;
  medium?: number;
  high?: number;
  critical?: number;
}

export interface MyTasksAnalytics {
  total: number;
  by_status: TasksByStatus;
  overdue_count: number;
  avg_completion_time: string;
}

export interface BlockedTask {
  id: number;
  title: string;
}

export interface TeamTasksAnalytics {
  total: number;
  blocked_tasks_needing_attention: BlockedTask[];
  priority_distribution: PriorityDistribution;
}

export interface Analytics {
  my_tasks: MyTasksAnalytics;
  team_tasks: TeamTasksAnalytics;
  efficiency_score: number;
}

// Auth types
export interface AuthTokens {
  access: string;
  refresh: string;
  expiresAt?: number;
}

export interface LoginCredentials {
  username: string; // Backend uses username, not email
  password: string;
  captchaAnswer?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

// API types
export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

export interface BulkUpdateRequest {
  task_ids: number[];
  status: TaskStatus;
}

export interface BulkUpdateResponse {
  updated_count: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
  tags?: string[];
  overdue?: boolean;
  search?: string;
}
