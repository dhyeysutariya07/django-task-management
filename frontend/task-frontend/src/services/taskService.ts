import api from './api';
import { Task, TaskFilters, BulkUpdateRequest, TaskHistory, TaskWrite, BulkUpdateResponse } from '@/types';

export const taskService = {
  /**
   * Get all tasks with optional filters
   */
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }
      if (filters.overdue !== undefined) params.append('overdue', filters.overdue.toString());
      if (filters.search) params.append('search', filters.search);
    }
    
    const response = await api.get(`/tasks/?${params.toString()}`);
    return response.data;
  },

  /**
   * Get single task by ID
   */
  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/tasks/${id}/`);
    return response.data;
  },

  /**
   * Create new task
   */
  async createTask(taskData: TaskWrite): Promise<Task> {
    const response = await api.post('/tasks/', taskData);
    return response.data;
  },

  /**
   * Update existing task (PUT requires all fields)
   */
  async updateTask(id: number, taskData: Partial<TaskWrite>): Promise<Task> {
    const response = await api.put(`/tasks/${id}/`, taskData);
    return response.data;
  },

  /**
   * Delete task
   */
  async deleteTask(id: number): Promise<void> {
    await api.delete(`/tasks/${id}/`);
  },

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(data: BulkUpdateRequest): Promise<BulkUpdateResponse> {
    const response = await api.put('/tasks/bulk-update/', data);
    return response.data;
  },

  /**
   * Get task history
   */
  async getTaskHistory(taskId?: number): Promise<TaskHistory[]> {
    const url = taskId ? `/tasks/history/?task=${taskId}` : '/tasks/history/';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get subtasks for a parent task
   */
  async getSubtasks(parentId: number): Promise<Task[]> {
    const response = await api.get(`/tasks/?parent_task=${parentId}`);
    return response.data;
  },
};
