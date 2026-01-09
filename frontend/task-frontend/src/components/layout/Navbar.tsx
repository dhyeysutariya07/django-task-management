import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/components.css';

export const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <h2 className="gradient-text" style={{ margin: 0 }}>
                    Task Manager
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => navigate('/dashboard')}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        Dashboard
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => navigate('/board')}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        Board
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => navigate('/analytics')}
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        Analytics
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-start), var(--primary-end))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                        }}
                    >
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                            {user.username}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    className="btn btn-secondary"
                    onClick={handleLogout}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};
