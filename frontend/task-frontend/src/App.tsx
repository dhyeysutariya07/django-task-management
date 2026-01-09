import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { EmailVerification } from './components/auth/EmailVerification';
import { TaskList } from './components/tasks/TaskList';
import { TaskBoard } from './components/tasks/TaskBoard';
import { DependencyGraph } from './components/tasks/DependencyGraph';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import './styles/index.css';
import './styles/components.css';

// Create React Query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
        },
    },
});

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<LoginForm />} />
                            <Route path="/register" element={<RegisterForm />} />
                            <Route path="/verify-email" element={<EmailVerification />} />

                            {/* Protected routes */}
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <TaskList />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/board"
                                element={
                                    <ProtectedRoute>
                                        <TaskBoard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/analytics"
                                element={
                                    <ProtectedRoute>
                                        <AnalyticsDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dependency-graph"
                                element={
                                    <ProtectedRoute>
                                        <DependencyGraph />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </BrowserRouter>

                    {/* Toast notifications */}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                            },
                            success: {
                                iconTheme: {
                                    primary: 'var(--success)',
                                    secondary: 'white',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: 'var(--danger)',
                                    secondary: 'white',
                                },
                            },
                        }}
                    />
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;
