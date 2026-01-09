import React, { useState, useMemo } from 'react';
import { useTasksQuery, useBulkUpdateMutation } from '@/hooks/useTasks';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TaskDetailsModal } from './TaskDetailsModal';
import { CreateTaskModal } from './CreateTaskModal';
import { BulkActionToolbar } from './BulkActionToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { dateUtils } from '@/utils/dateUtils';
import '@/styles/components.css';

export const TaskList: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());

    const { hasRole } = useAuth();
    const canCreateTask = !hasRole('auditor');

    const { data: allTasks, isLoading, error, refetch } = useTasksQuery();
    const bulkUpdateMutation = useBulkUpdateMutation();

    // Client-side filtering
    const filteredTasks = useMemo(() => {
        if (!allTasks) return [];
        return allTasks.filter(task => {
            const matchesStatus = !statusFilter || task.status === statusFilter;
            const matchesPriority = !priorityFilter || task.priority === priorityFilter;
            return matchesStatus && matchesPriority;
        });
    }, [allTasks, statusFilter, priorityFilter]);

    // Organize tasks by parent-child relationship
    const { parentTasks, childTasksByParent } = useMemo(() => {
        const parents: Task[] = [];
        const children: Map<number, Task[]> = new Map();

        filteredTasks.forEach(task => {
            if (task.parent_task) {
                const siblings = children.get(task.parent_task) || [];
                siblings.push(task);
                children.set(task.parent_task, siblings);
            } else {
                parents.push(task);
            }
        });

        return { parentTasks: parents, childTasksByParent: children };
    }, [filteredTasks]);

    const handleSelectTask = (taskId: number) => {
        const newSelected = new Set(selectedTaskIds);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTaskIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTaskIds.size === filteredTasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    };

    const handleBulkUpdate = async (status: TaskStatus) => {
        try {
            await bulkUpdateMutation.mutateAsync({
                task_ids: Array.from(selectedTaskIds),
                updates: { status },
            });
            setSelectedTaskIds(new Set());
            refetch();
        } catch (error) {
            console.error('Bulk update failed:', error);
        }
    };

    const toggleParentExpand = (parentId: number) => {
        const newExpanded = new Set(expandedParents);
        if (newExpanded.has(parentId)) {
            newExpanded.delete(parentId);
        } else {
            newExpanded.add(parentId);
        }
        setExpandedParents(newExpanded);
    };

    const renderTask = (task: Task, isChild: boolean = false) => {
        const isSelected = selectedTaskIds.has(task.id);
        const children = childTasksByParent.get(task.id) || [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedParents.has(task.id);

        return (
            <React.Fragment key={task.id}>
                <div
                    className="card"
                    style={{
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        marginLeft: isChild ? '2rem' : '0',
                        borderLeft: isChild ? '3px solid var(--primary)' : 'none',
                        background: isSelected ? 'rgba(139, 92, 246, 0.1)' : undefined,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        {/* Checkbox */}
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectTask(task.id)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                marginTop: '0.25rem',
                            }}
                        />

                        {/* Expand/Collapse for parent tasks */}
                        {hasChildren && (
                            <button
                                onClick={() => toggleParentExpand(task.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: 0,
                                    marginTop: '0.25rem',
                                }}
                            >
                                {isExpanded ? '📂' : '📁'}
                            </button>
                        )}

                        {/* Task Content */}
                        <div
                            style={{ flex: 1, cursor: 'pointer' }}
                            onClick={() => setSelectedTask(task)}
                        >
                            {/* Title with parent/child indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {hasChildren && <span style={{ fontSize: '0.875rem' }}>👥</span>}
                                {isChild && <span style={{ fontSize: '0.875rem' }}>🔗</span>}
                                <h3 style={{ margin: 0, fontWeight: hasChildren ? 'bold' : '500' }}>
                                    {task.title}
                                </h3>
                                {hasChildren && (
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            background: 'var(--bg-secondary)',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: 'var(--radius-full)',
                                        }}
                                    >
                                        {children.length} child{children.length !== 1 ? 'ren' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Status and Priority Badges */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span className={`badge badge-${task.status}`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                <span className={`badge badge-${task.priority}`}>
                                    {task.priority}
                                </span>
                            </div>

                            {/* Metadata */}
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <span>👤 {task.assigned_to}</span>
                                {task.deadline && (
                                    <span style={{ color: dateUtils.isOverdue(task.deadline) ? 'var(--danger)' : undefined }}>
                                        📅 {dateUtils.getTimeUntilDeadline(task.deadline)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && children.map(child => renderTask(child, true))}
            </React.Fragment>
        );
    };

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
                <p className="empty-state-description">Failed to load tasks. Please try again later.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', paddingBottom: '6rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Tasks</h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {canCreateTask && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                + Create Task
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters and Select All */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                            onChange={handleSelectAll}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>Select All</span>
                    </label>

                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
                        style={{ flex: 1 }}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                    </select>

                    <select
                        className="form-select"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
                        style={{ flex: 1 }}
                    >
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h2 className="empty-state-title">No Tasks Found</h2>
                    <p className="empty-state-description">
                        {statusFilter || priorityFilter
                            ? 'Try adjusting your filters'
                            : 'Create your first task to get started'}
                    </p>
                </div>
            ) : (
                <div>{parentTasks.map(task => renderTask(task))}</div>
            )}

            {/* Modals */}
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

            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onTaskCreated={() => {
                    refetch();
                    setShowCreateModal(false);
                }}
            />

            {/* Bulk Action Toolbar */}
            <BulkActionToolbar
                selectedCount={selectedTaskIds.size}
                onClearSelection={() => setSelectedTaskIds(new Set())}
                onBulkUpdate={handleBulkUpdate}
                isUpdating={bulkUpdateMutation.isPending}
            />
        </div>
    );
};
