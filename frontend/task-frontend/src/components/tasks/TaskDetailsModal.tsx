import React, { useState, useEffect } from 'react';
import { Task, TaskWrite, TaskStatus, TaskPriority } from '@/types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useTaskMutation } from '@/hooks/useTasks';
import { useUsersQuery } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { dateUtils } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import '@/styles/components.css';

interface TaskDetailsModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
    task,
    isOpen,
    onClose,
    onTaskUpdated,
    onTaskDeleted,
}) => {
    // Debug: Log task to see what we're receiving
    console.log('TaskDetailsModal - Full task object:', task);
    console.log('TaskDetailsModal - task.id:', task?.id);
    console.log('TaskDetailsModal - task keys:', task ? Object.keys(task) : 'task is null/undefined');

    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState<Partial<TaskWrite>>({});

    const { updateTask, deleteTask, isUpdating, isDeleting } = useTaskMutation();
    const { user, hasRole } = useAuth();
    const { data: users, isLoading: isLoadingUsers } = useUsersQuery();

    // Check permissions
    const isAuditor = hasRole('auditor');
    const isManager = hasRole('manager');
    const canEdit = !isAuditor; // Auditors can only view
    const canDelete = !isAuditor; // Auditors cannot delete

    // Initialize form data when task changes
    useEffect(() => {
        if (task) {
            // Find the user ID from username
            const assignedUser = users?.find(u => u.username === task.assigned_to);

            setFormData({
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigned_to: assignedUser?.id, // Store user ID for backend
                estimated_hours: task.estimated_hours,
                actual_hours: task.actual_hours,
                deadline: task.deadline,
            });
        }
    }, [task, users]);

    const handleEdit = () => {
        if (!canEdit) {
            toast.error('Auditors have read-only access');
            return;
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Reset form data
        const assignedUser = users?.find(u => u.username === task.assigned_to);
        setFormData({
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigned_to: assignedUser?.id,
            estimated_hours: task.estimated_hours,
            actual_hours: task.actual_hours,
            deadline: task.deadline,
        });
    };

    const handleSave = async () => {
        console.log('handleSave - task.id:', task.id);
        console.log('handleSave - formData:', formData);

        if (!task.id) {
            toast.error('Task ID is missing. Cannot update task.');
            console.error('Task object is missing ID:', task);
            return;
        }

        try {
            await updateTask({ id: task.id, data: formData });
            toast.success('Task updated successfully!');
            setIsEditing(false);
            onTaskUpdated?.();
        } catch (error: any) {
            const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to update task';
            toast.error(message);
        }
    };

    const handleDelete = async () => {
        if (!canDelete) {
            toast.error('Auditors cannot delete tasks');
            return;
        }

        try {
            await deleteTask(task.id);
            toast.success('Task deleted successfully!');
            setShowDeleteConfirm(false);
            onClose();
            onTaskDeleted?.();
        } catch (error: any) {
            const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to delete task';
            toast.error(message);
        }
    };

    const handleChange = (field: keyof TaskWrite, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Task' : 'Task Details'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Role-based warning for auditors */}
                    {isAuditor && (
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem',
                                color: 'var(--warning)',
                            }}
                        >
                            ℹ️ You have read-only access as an Auditor
                        </div>
                    )}

                    {/* Title */}
                    {isEditing ? (
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0' }}>{task.title}</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority}
                                </span>
                                <span className={`status-badge status-${task.status.replace('_', '-')}`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {isEditing ? (
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input"
                                rows={4}
                                value={formData.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="form-label">Description</label>
                            <p style={{ margin: '0.5rem 0 0 0' }}>{task.description}</p>
                        </div>
                    )}

                    {/* Status and Priority */}
                    {isEditing && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={formData.status || ''}
                                    onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="blocked">Blocked</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select
                                    className="form-select"
                                    value={formData.priority || ''}
                                    onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Assigned To - Show dropdown for managers in edit mode */}
                    {isEditing && isManager ? (
                        <div className="form-group">
                            <label className="form-label">Assigned To</label>
                            <select
                                className="form-select"
                                value={formData.assigned_to || ''}
                                onChange={(e) => handleChange('assigned_to', parseInt(e.target.value))}
                                disabled={isLoadingUsers}
                            >
                                <option value="">Select user...</option>
                                {users?.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.username} ({u.role})
                                    </option>
                                ))}
                            </select>
                            <div className="form-helper">
                                Managers can assign tasks to any user
                            </div>
                        </div>
                    ) : (
                        /* Details Grid for view mode */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                            <div>
                                <span className="text-muted">Assigned to:</span>
                                <div>{task.assigned_to}</div>
                                {!isManager && isEditing && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {hasRole('developer') && '(Developers can only assign to themselves)'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="text-muted">Created by:</span>
                                <div>{task.created_by}</div>
                            </div>
                            <div>
                                <span className="text-muted">Created:</span>
                                <div>{new Date(task.created_at).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <span className="text-muted">Updated:</span>
                                <div>{new Date(task.updated_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    )}

                    {/* Hours and Deadline */}
                    {isEditing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Estimated Hours</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    value={formData.estimated_hours || ''}
                                    onChange={(e) => handleChange('estimated_hours', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Actual Hours</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    value={formData.actual_hours || ''}
                                    onChange={(e) => handleChange('actual_hours', e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.deadline ? formData.deadline.slice(0, 16) : ''}
                                    onChange={(e) => handleChange('deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                            {task.estimated_hours && (
                                <div>
                                    <span className="text-muted">Estimated:</span>
                                    <div>{task.estimated_hours}h</div>
                                </div>
                            )}
                            {task.actual_hours && (
                                <div>
                                    <span className="text-muted">Actual:</span>
                                    <div>{task.actual_hours}h</div>
                                </div>
                            )}
                            {task.deadline && (
                                <div>
                                    <span className="text-muted">Deadline:</span>
                                    <div style={{ color: dateUtils.isOverdue(task.deadline) ? 'var(--danger)' : 'inherit' }}>
                                        {dateUtils.getTimeUntilDeadline(task.deadline)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                        <div>
                            <label className="form-label">Tags</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {task.tags.map((tag) => (
                                    <span key={tag.id} className="badge badge-primary">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        {isEditing ? (
                            <>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleCancelEdit}
                                    disabled={isUpdating}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <>
                                {canDelete && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        Delete
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleEdit}
                                    >
                                        Edit
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Task"
                message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </>
    );
};
