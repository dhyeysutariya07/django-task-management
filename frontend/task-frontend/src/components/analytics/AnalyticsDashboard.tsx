import React from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalytics';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '@/styles/components.css';

export const AnalyticsDashboard: React.FC = () => {
    const { data: analytics, isLoading, error } = useAnalyticsQuery();

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
                <h2 className="empty-state-title">Error Loading Analytics</h2>
                <p className="empty-state-description">
                    Failed to load analytics data. Please try again later.
                </p>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '2rem' }}>Analytics Dashboard</h1>

            {/* Efficiency Score */}
            <div className="card" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Efficiency Score</h2>
                <div
                    style={{
                        fontSize: '4rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {analytics.efficiency_score}%
                </div>
            </div>

            {/* My Tasks Section */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>My Tasks</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Total Tasks
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analytics.my_tasks.total}</div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Pending
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                            {analytics.my_tasks.by_status.pending || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            In Progress
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--info)' }}>
                            {analytics.my_tasks.by_status.in_progress || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Completed
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                            {analytics.my_tasks.by_status.completed || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Blocked
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            {analytics.my_tasks.by_status.blocked || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Overdue
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            {analytics.my_tasks.overdue_count}
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Average Completion Time
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {analytics.my_tasks.avg_completion_time}
                    </div>
                </div>
            </div>

            {/* Team Tasks Section */}
            <div>
                <h2 style={{ marginBottom: '1rem' }}>Team Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Total Team Tasks
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analytics.team_tasks.total}</div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Low Priority
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {analytics.team_tasks.priority_distribution.low || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Medium Priority
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                            {analytics.team_tasks.priority_distribution.medium || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            High Priority
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            {analytics.team_tasks.priority_distribution.high || 0}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Critical Priority
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            {analytics.team_tasks.priority_distribution.critical || 0}
                        </div>
                    </div>
                </div>

                {/* Blocked Tasks Needing Attention */}
                {analytics.team_tasks.blocked_tasks_needing_attention.length > 0 && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>
                            Blocked Tasks Needing Attention ({analytics.team_tasks.blocked_tasks_needing_attention.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {analytics.team_tasks.blocked_tasks_needing_attention.map((task) => (
                                <div
                                    key={task.id}
                                    style={{
                                        padding: '1rem',
                                        background: 'var(--bg-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                    }}
                                >
                                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{task.title}</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        Task ID: {task.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
