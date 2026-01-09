import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasksQuery, useOptimisticTaskUpdate } from '@/hooks/useTasks';
import { useUsersQuery } from '@/hooks/useUsers';
import { Task, TaskStatus } from '@/types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TaskDetailsModal } from './TaskDetailsModal';
import { dateUtils } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import '@/styles/components.css';

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'pending', title: 'Pending' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'blocked', title: 'Blocked' },
    { id: 'completed', title: 'Completed' },
];

export const TaskBoard: React.FC = () => {
    const { data: tasks, isLoading, error, refetch } = useTasksQuery();
    const { data: users } = useUsersQuery(); // Ensure users are loaded
    const { updateTaskOptimistically } = useOptimisticTaskUpdate();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const getTasksByStatus = (status: TaskStatus): Task[] => {
        return tasks?.filter(task => task.status === status) || [];
    };

    const getPriorityColor = (task: Task): string => {
        // Dynamic color based on deadline proximity
        if (!task.deadline) {
            // No deadline - use standard priority colors
            const priorityColors = {
                low: 'var(--success)',
                medium: 'var(--warning)',
                high: 'var(--danger)',
                critical: 'var(--danger)',
            };
            return priorityColors[task.priority];
        }

        const hoursUntilDeadline = dateUtils.getHoursUntilDeadline(task.deadline);

        if (hoursUntilDeadline < 0) {
            return 'var(--danger)'; // Overdue - Red
        } else if (hoursUntilDeadline < 24) {
            return 'var(--danger)'; // < 24 hours - Red
        } else if (hoursUntilDeadline < 72) {
            return '#ff6b35'; // < 3 days - Orange
        } else if (hoursUntilDeadline < 168) {
            return 'var(--warning)'; // < 7 days - Yellow
        }

        // > 7 days - use standard priority color
        const priorityColors = {
            low: 'var(--success)',
            medium: 'var(--info)',
            high: 'var(--warning)',
            critical: 'var(--danger)',
        };
        return priorityColors[task.priority];
    };

    const handleDragEnd = async (result: DropResult) => {
        console.log('handleDragEnd called', result);
        const { destination, source, draggableId } = result;

        // Dropped outside a valid droppable
        if (!destination) {
            console.log('No destination - dropped outside');
            return;
        }

        // Dropped in the same position
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            console.log('Dropped in same position');
            return;
        }

        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId as TaskStatus;

        console.log('Updating task:', taskId, 'to status:', newStatus);
        console.log('Current tasks:', tasks);
        console.log('Users loaded:', users?.length);

        // Find the task to see its full structure
        const taskToUpdate = tasks?.find(t => t.id === taskId);
        console.log('Full task object:', JSON.stringify(taskToUpdate, null, 2));

        try {
            // Optimistic update with rollback on error - pass current tasks
            await updateTaskOptimistically(taskId, { status: newStatus }, tasks || [], users || []);

            // Immediately refetch to ensure UI is in sync
            await refetch();

            toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
        } catch (error: any) {
            console.error('Drag-and-drop error:', error);
            // Error toast is already shown by the optimistic update hook
            const message = error.response?.data?.detail || error.response?.data?.message;
            if (message) {
                toast.error(message);
            }

            // Refetch to restore correct state
            await refetch();
        }
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
                <p className="empty-state-description">
                    Failed to load tasks. Please try again later.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '2rem' }}>Task Board</h1>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    {COLUMNS.map((column) => {
                        const columnTasks = getTasksByStatus(column.id);

                        return (
                            <div key={column.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div
                                    style={{
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{column.title}</h3>
                                    <span
                                        style={{
                                            background: 'var(--bg-primary)',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {columnTasks.length}
                                    </span>
                                </div>

                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            style={{
                                                flex: 1,
                                                minHeight: '200px',
                                                padding: '0.5rem',
                                                background: snapshot.isDraggingOver
                                                    ? 'rgba(139, 92, 246, 0.1)'
                                                    : 'transparent',
                                                borderRadius: 'var(--radius-md)',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            {columnTasks.map((task, index) => (
                                                <Draggable
                                                    key={task.id}
                                                    draggableId={task.id.toString()}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className="card"
                                                            onClick={() => setSelectedTask(task)}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                padding: '1rem',
                                                                marginBottom: '0.75rem',
                                                                cursor: 'pointer',
                                                                opacity: snapshot.isDragging ? 0.8 : 1,
                                                                transform: snapshot.isDragging
                                                                    ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                                                    : provided.draggableProps.style?.transform,
                                                                transition: 'transform 0.2s',
                                                            }}
                                                        >
                                                            {/* Task Title */}
                                                            <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                                                                {task.title}
                                                            </div>

                                                            {/* Priority Badge with Dynamic Color */}
                                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                <span
                                                                    style={{
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: 'var(--radius-full)',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 'bold',
                                                                        background: getPriorityColor(task),
                                                                        color: 'white',
                                                                    }}
                                                                >
                                                                    {task.priority}
                                                                </span>
                                                            </div>

                                                            {/* Deadline Info */}
                                                            {task.deadline && (
                                                                <div
                                                                    className="text-muted"
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        color: dateUtils.isOverdue(task.deadline)
                                                                            ? 'var(--danger)'
                                                                            : 'var(--text-muted)',
                                                                    }}
                                                                >
                                                                    {dateUtils.isOverdue(task.deadline) ? '⚠️ ' : '📅 '}
                                                                    {dateUtils.getTimeUntilDeadline(task.deadline)}
                                                                </div>
                                                            )}

                                                            {/* Assigned To */}
                                                            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                                                👤 {task.assigned_to}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

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
        </div>
    );
};
