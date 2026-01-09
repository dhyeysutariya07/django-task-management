import React, { useState, useMemo } from 'react';
import { useTasksQuery } from '@/hooks/useTasks';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TaskDetailsModal } from './TaskDetailsModal';
import { CreateTaskModal } from './CreateTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { dateUtils } from '@/utils/dateUtils';
import '@/styles/components.css';

export const TaskList: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { hasRole } = useAuth();
    const canCreateTask = !hasRole('auditor'); // Auditors cannot create tasks

    // Fetch all tasks without backend filtering
    const { data: allTasks, isLoading, error, refetch } = useTasksQuery();

    // Client-side filtering
    const tasks = useMemo(() => {
        if (!allTasks) return [];

        return allTasks.filter(task => {
            const matchesStatus = !statusFilter || task.status === statusFilter;
            const matchesPriority = !priorityFilter || task.priority === priorityFilter;
            return matchesStatus && matchesPriority;
        });
    }, [allTasks, statusFilter, priorityFilter]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center" style={{ padding: '4rem' }}>
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <h2 className="empty-state-title">Error Loading Tasks</h2>
                <p className="empty-state-description">
                    Failed to load tasks. Please try again later.
                </p>
            </div>
        );
    }

    const getPriorityClass = (priority: TaskPriority) => {
        return `priority-badge priority-${priority}`;
    };

    const getStatusClass = (status: TaskStatus) => {
        return `status-badge status-${status.replace('_', '-')}`;
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Tasks</h1>
                    {canCreateTask && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            + Create Task
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label className="form-label" htmlFor="status-filter">Status</label>
                        <select
                            id="status-filter"
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="priority-filter">Priority</label>
                        <select
                            id="priority-filter"
                            className="form-select"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    {(statusFilter || priorityFilter) && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setStatusFilter('');
                                setPriorityFilter('');
                            }}
                            style={{ alignSelf: 'flex-end' }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Task List */}
            {!tasks || tasks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h2 className="empty-state-title">No Tasks Found</h2>
                    <p className="empty-state-description">
                        {statusFilter || priorityFilter
                            ? 'No tasks match your filters. Try adjusting your search.'
                            : 'Get started by creating your first task.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="card"
                            style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => setSelectedTask(task)}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{task.title}</h3>
                                    <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                        {task.description}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                    <span className={getPriorityClass(task.priority)}>
                                        {task.priority}
                                    </span>
                                    <span className={getStatusClass(task.status)}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                                <div>
                                    <span className="text-muted">Assigned to:</span>{' '}
                                    <span>{task.assigned_to}</span>
                                </div>
                                <div>
                                    <span className="text-muted">Created by:</span>{' '}
                                    <span>{task.created_by}</span>
                                </div>
                                {task.deadline && (
                                    <div>
                                        <span className="text-muted">Deadline:</span>{' '}
                                        <span style={{ color: dateUtils.isOverdue(task.deadline) ? 'var(--danger)' : 'inherit' }}>
                                            {dateUtils.getTimeUntilDeadline(task.deadline)}
                                        </span>
                                    </div>
                                )}
                                {task.estimated_hours && (
                                    <div>
                                        <span className="text-muted">Estimated:</span>{' '}
                                        <span>{task.estimated_hours}h</span>
                                    </div>
                                )}
                            </div>

                            {task.tags && task.tags.length > 0 && (
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {task.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="badge badge-primary"
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Task Count */}
            {tasks && tasks.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-muted">
                        Showing {tasks.length} of {allTasks?.length || 0} task{tasks.length !== 1 ? 's' : ''}
                        {(statusFilter || priorityFilter) && ' (filtered)'}
                    </p>
                </div>
            )}

            {/* Task Details Modal */}
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onTaskUpdated={() => {
                        refetch();
                        setSelectedTask(null);
                    }}
                    onTaskDeleted={() => {
                        refetch();
                        setSelectedTask(null);
                    }}
                />
            )}

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onTaskCreated={() => {
                    refetch();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
};
