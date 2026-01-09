import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { Task, TaskFilters, BulkUpdateRequest } from '@/types';
import toast from 'react-hot-toast';

/**
 * Hook to fetch tasks with filters
 */
export const useTasksQuery = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getTasks(filters),
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch single task
 */
export const useTaskQuery = (id: number) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskService.getTask(id),
    enabled: !!id,
  });
};

/**
 * Hook to fetch task history
 */
export const useTaskHistoryQuery = (id: number) => {
  return useQuery({
    queryKey: ['taskHistory', id],
    queryFn: () => taskService.getTaskHistory(id),
    enabled: !!id,
  });
};

/**
 * Hook to fetch subtasks
 */
export const useSubtasksQuery = (parentId: number) => {
  return useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: () => taskService.getSubtasks(parentId),
    enabled: !!parentId,
  });
};

/**
 * Hook for task mutations (create, update, delete)
 */
export const useTaskMutation = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (taskData: Partial<Task>) => taskService.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create task';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      taskService.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Task updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update task';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete task';
      toast.error(message);
    },
  });

  return {
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

/**
 * Hook for bulk update mutation
 */
export const useBulkUpdateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateRequest) => taskService.bulkUpdateTasks(data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Use the count from response if available, otherwise use the request count
      const count = (result as any)?.updated_count || variables.task_ids.length;
      toast.success(`${count} task${count !== 1 ? 's' : ''} updated successfully!`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Bulk update failed';
      toast.error(message);
    },
  });
};

/**
 * Hook for optimistic task status update
 */
export const useOptimisticTaskUpdate = () => {
  const queryClient = useQueryClient();

  const updateTaskOptimistically = async (
    taskId: number,
    updates: Partial<Task>,
    currentTasks: Task[],
    users: any[],
    onError?: () => void
  ) => {
    console.log('updateTaskOptimistically called with tasks:', currentTasks?.length);
    console.log('Users provided:', users?.length);
    
    if (!currentTasks || currentTasks.length === 0) {
      console.error('No tasks provided');
      throw new Error('Tasks not loaded');
    }

    const currentTask = currentTasks.find(t => t.id === taskId);

    if (!currentTask) {
      console.error('Task not found. Task ID:', taskId);
      console.error('Available task IDs:', currentTasks.map(t => t.id));
      throw new Error('Task not found');
    }

    console.log('Found current task:', currentTask);

    // Snapshot previous value from cache
    const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

    // Optimistically update
    queryClient.setQueryData<Task[]>(['tasks'], (old) => {
      if (!old) return currentTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      return old.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      );
    });

    try {
      // For PUT requests, we need to send all required fields
      // Find the assigned user ID from the username
      console.log('Looking up user ID for:', currentTask.assigned_to);
      console.log('Available users:', users);
      
      // The assigned_to in the task object might already be a number or a username
      let assignedUserId: number;
      
      if (typeof currentTask.assigned_to === 'number') {
        // Already a user ID
        assignedUserId = currentTask.assigned_to;
        console.log('assigned_to is already a number:', assignedUserId);
      } else {
        // It's a username string, need to find the user ID
        const assignedUser = users?.find((u: any) => u.username === currentTask.assigned_to);
        console.log('Found assigned user:', assignedUser);
        
        if (assignedUser) {
          assignedUserId = assignedUser.id;
        } else {
          // If we can't find the user in the provided array, throw error
          console.error('Could not find user ID for username:', currentTask.assigned_to);
          console.error('Available users:', users?.map((u: any) => u.username));
          throw new Error(`Cannot find user ID for assigned user: ${currentTask.assigned_to}. Please ensure users are loaded.`);
        }
      }

      const fullTaskData = {
        title: currentTask.title,
        description: currentTask.description || '',
        status: updates.status || currentTask.status,
        priority: updates.priority || currentTask.priority,
        assigned_to: assignedUserId,
        parent_task: currentTask.parent_task,
        estimated_hours: currentTask.estimated_hours || null,
        actual_hours: currentTask.actual_hours || null,
        deadline: currentTask.deadline || null,
        tags: currentTask.tags?.map((tag: any) => tag.name) || [],
      };

      console.log('Sending full task data:', fullTaskData);

      // Perform actual update with full data
      await taskService.updateTask(taskId, fullTaskData);
      
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    } catch (error) {
      console.error('Update failed, rolling back:', error);
      // Rollback on error
      if (previousTasks) {
        queryClient.setQueryData(['tasks'], previousTasks);
      }
      toast.error('Failed to update task. Changes reverted.');
      
      if (onError) {
        onError();
      }
      
      throw error;
    }
  };

  return { updateTaskOptimistically };
};
