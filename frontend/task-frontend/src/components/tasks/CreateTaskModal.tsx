import React, { useState } from 'react';
import { TaskWrite, TaskStatus, TaskPriority } from '@/types';
import { Modal } from '../common/Modal';
import { useTaskMutation } from '@/hooks/useTasks';
import { useUsersQuery } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import '@/styles/components.css';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    onTaskCreated,
}) => {
    const [formData, setFormData] = useState<Partial<TaskWrite>>({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        estimated_hours: '',
        actual_hours: '',
        deadline: '',
        tags: [],
    });

    const { createTask, isCreating } = useTaskMutation();
    const { user, hasRole } = useAuth();
    const { data: users, isLoading: isLoadingUsers } = useUsersQuery();

    const isManager = hasRole('manager');

    const handleChange = (field: keyof TaskWrite, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title?.trim()) {
            toast.error('Title is required');
            return;
        }

        if (!formData.assigned_to) {
            toast.error('Please assign the task to a user');
            return;
        }

        try {
            // Clean up form data - remove empty strings and convert to proper types
            const taskData: any = {
                title: formData.title.trim(),
                assigned_to: formData.assigned_to,
                status: formData.status || 'pending',
                priority: formData.priority || 'medium',
            };

            // Add optional fields only if they have values
            if (formData.description?.trim()) {
                taskData.description = formData.description.trim();
            }

            if (formData.estimated_hours && formData.estimated_hours !== '') {
                taskData.estimated_hours = formData.estimated_hours.toString();
            }

            if (formData.actual_hours && formData.actual_hours !== '') {
                taskData.actual_hours = formData.actual_hours.toString();
            }

            if (formData.deadline && formData.deadline !== '') {
                taskData.deadline = formData.deadline;
            }

            if (formData.tags && formData.tags.length > 0) {
                taskData.tags = formData.tags;
            }

            console.log('Sending task data:', taskData);

            await createTask(taskData);
            toast.success('Task created successfully!');
            onClose();
            onTaskCreated?.();

            // Reset form
            setFormData({
                title: '',
                description: '',
                status: 'pending',
                priority: 'medium',
                estimated_hours: '',
                actual_hours: '',
                deadline: '',
                tags: [],
            });
        } catch (error: any) {
            console.error('Create task error:', error);
            const errorData = error.response?.data;

            // Handle validation errors
            if (errorData && typeof errorData === 'object') {
                const errorMessages = Object.entries(errorData)
                    .map(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            return `${field}: ${messages.join(', ')}`;
                        }
                        return `${field}: ${messages}`;
                    })
                    .join('\n');
                toast.error(errorMessages || 'Failed to create task');
            } else {
                const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to create task';
                toast.error(message);
            }
        }
    };

    const handleCancel = () => {
        onClose();
        // Reset form
        setFormData({
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            estimated_hours: '',
            actual_hours: '',
            deadline: '',
            tags: [],
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} title="Create New Task">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Title */}
                <div className="form-group">
                    <label className="form-label" htmlFor="title">
                        Title <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                        id="title"
                        type="text"
                        className="form-input"
                        value={formData.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Enter task title"
                        required
                    />
                </div>

                {/* Description */}
                <div className="form-group">
                    <label className="form-label" htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        className="form-input"
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Enter task description"
                    />
                </div>

                {/* Status and Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="status">Status</label>
                        <select
                            id="status"
                            className="form-select"
                            value={formData.status || 'pending'}
                            onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                        >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="priority">Priority</label>
                        <select
                            id="priority"
                            className="form-select"
                            value={formData.priority || 'medium'}
                            onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>

                {/* Assigned To */}
                <div className="form-group">
                    <label className="form-label" htmlFor="assigned_to">
                        Assigned To <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                        id="assigned_to"
                        className="form-select"
                        value={formData.assigned_to || ''}
                        onChange={(e) => handleChange('assigned_to', parseInt(e.target.value))}
                        disabled={isLoadingUsers}
                        required
                    >
                        <option value="">Select user...</option>
                        {isManager ? (
                            // Managers can assign to anyone
                            users?.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.username} ({u.role})
                                </option>
                            ))
                        ) : (
                            // Developers can only assign to themselves
                            <option value={user?.id}>{user?.username} (You)</option>
                        )}
                    </select>
                    {!isManager && (
                        <div className="form-helper">
                            Developers can only assign tasks to themselves
                        </div>
                    )}
                </div>

                {/* Hours and Deadline */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="estimated_hours">Estimated Hours</label>
                        <input
                            id="estimated_hours"
                            type="number"
                            step="0.5"
                            className="form-input"
                            value={formData.estimated_hours || ''}
                            onChange={(e) => handleChange('estimated_hours', e.target.value)}
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="actual_hours">Actual Hours</label>
                        <input
                            id="actual_hours"
                            type="number"
                            step="0.5"
                            className="form-input"
                            value={formData.actual_hours || ''}
                            onChange={(e) => handleChange('actual_hours', e.target.value)}
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="deadline">Deadline</label>
                        <input
                            id="deadline"
                            type="datetime-local"
                            className="form-input"
                            value={formData.deadline ? formData.deadline.slice(0, 16) : ''}
                            onChange={(e) => handleChange('deadline', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Task'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
