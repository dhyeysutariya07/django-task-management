import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '../common/LoadingSpinner';
import { AppLayout } from '../layout/AppLayout';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireEmailVerification?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireEmailVerification = false,
}) => {
    const { isAuthenticated, isEmailVerified, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingPage />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireEmailVerification && !isEmailVerified) {
        return <Navigate to="/verify-email" replace />;
    }

    return <AppLayout>{children}</AppLayout>;
};
