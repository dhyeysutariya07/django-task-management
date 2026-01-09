import React, { useState, useCallback } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTasksQuery } from '@/hooks/useTasks';
import { Task } from '@/types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { TaskDetailsModal } from './TaskDetailsModal';
import '@/styles/components.css';

const getStatusColor = (status: string): string => {
    const colors = {
        pending: '#f59e0b',
        in_progress: '#3b82f6',
        blocked: '#ef4444',
        completed: '#10b981',
    };
    return colors[status as keyof typeof colors] || '#6b7280';
};

export const DependencyGraph: React.FC = () => {
    const { data: tasks, isLoading, error, refetch } = useTasksQuery();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Convert tasks to React Flow nodes and edges
    const createNodesAndEdges = useCallback(() => {
        if (!tasks) return { nodes: [], edges: [] };

        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const taskMap = new Map<number, Task>();

        // Create a map of tasks
        tasks.forEach(task => taskMap.set(task.id, task));

        // Calculate layout positions
        const levels = new Map<number, number>();
        const visited = new Set<number>();

        const calculateLevel = (taskId: number, level: number = 0): number => {
            if (visited.has(taskId)) return levels.get(taskId) || 0;
            visited.add(taskId);

            const task = taskMap.get(taskId);
            if (!task) return level;

            let maxChildLevel = level;
            tasks.forEach(t => {
                if (t.parent_task === taskId) {
                    const childLevel = calculateLevel(t.id, level + 1);
                    maxChildLevel = Math.max(maxChildLevel, childLevel);
                }
            });

            levels.set(taskId, level);
            return maxChildLevel;
        };

        // Calculate levels for all tasks
        tasks.forEach(task => {
            if (!task.parent_task) {
                calculateLevel(task.id);
            }
        });

        // Group tasks by level
        const tasksByLevel = new Map<number, Task[]>();
        tasks.forEach(task => {
            const level = levels.get(task.id) || 0;
            if (!tasksByLevel.has(level)) {
                tasksByLevel.set(level, []);
            }
            tasksByLevel.get(level)!.push(task);
        });

        // Create nodes with positions
        tasksByLevel.forEach((levelTasks, level) => {
            levelTasks.forEach((task, index) => {
                const ySpacing = 150;
                const xSpacing = 300;
                const xOffset = (levelTasks.length - 1) * xSpacing / 2;

                nodes.push({
                    id: task.id.toString(),
                    type: 'default',
                    position: {
                        x: index * xSpacing - xOffset,
                        y: level * ySpacing,
                    },
                    data: {
                        label: (
                            <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    {task.title}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {task.assigned_to}
                                </div>
                            </div>
                        ),
                    },
                    style: {
                        background: getStatusColor(task.status),
                        color: 'white',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '8px',
                        padding: '10px',
                        minWidth: '200px',
                        cursor: 'pointer',
                    },
                });

                // Create edge if task has a parent
                if (task.parent_task) {
                    edges.push({
                        id: `e${task.parent_task}-${task.id}`,
                        source: task.parent_task.toString(),
                        target: task.id.toString(),
                        type: 'smoothstep',
                        animated: task.status === 'in_progress',
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: getStatusColor(task.status),
                        },
                        style: {
                            stroke: getStatusColor(task.status),
                            strokeWidth: 2,
                        },
                    });
                }
            });
        });

        return { nodes, edges };
    }, [tasks]);

    const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes and edges when tasks change
    React.useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = createNodesAndEdges();
        setNodes(newNodes);
        setEdges(newEdges);
    }, [tasks, createNodesAndEdges, setNodes, setEdges]);

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        const taskId = parseInt(node.id);
        const task = tasks?.find(t => t.id === taskId);
        if (task) {
            setSelectedTask(task);
        }
    }, [tasks]);

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
                    Failed to load task dependencies. Please try again later.
                </p>
            </div>
        );
    }

    if (!tasks || tasks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔗</div>
                <h2 className="empty-state-title">No Tasks</h2>
                <p className="empty-state-description">
                    Create some tasks to see the dependency graph.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', height: 'calc(100vh - 100px)' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>Task Dependency Graph</h1>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '20px', height: '20px', background: '#f59e0b', borderRadius: '4px' }}></div>
                        <span>Pending</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '20px', height: '20px', background: '#3b82f6', borderRadius: '4px' }}></div>
                        <span>In Progress</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '4px' }}></div>
                        <span>Blocked</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '20px', height: '20px', background: '#10b981', borderRadius: '4px' }}></div>
                        <span>Completed</span>
                    </div>
                </div>
            </div>

            <div style={{ height: 'calc(100% - 60px)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitView
                    attributionPosition="bottom-left"
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>

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
