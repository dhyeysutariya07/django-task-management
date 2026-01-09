import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData, UserRole } from '@/types';
import { authService } from '@/services/authService';
import { tokenManager } from '@/utils/tokenManager';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isEmailVerified: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    verifyEmail: (code: string) => Promise<void>;
    refreshUser: () => Promise<void>;
    hasRole: (role: UserRole) => boolean;
    canPerformAction: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user on mount
    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const loadUser = async () => {
            const token = tokenManager.getAccessToken();

            if (token && !tokenManager.isTokenExpired()) {
                try {
                    const currentUser = await authService.getCurrentUser();
                    if (isMounted && !abortController.signal.aborted) {
                        setUser(currentUser);
                    }
                } catch (error) {
                    if (!abortController.signal.aborted) {
                        console.error('Failed to load user:', error);
                        tokenManager.clearTokens();
                    }
                }
            }

            if (isMounted) {
                setIsLoading(false);
            }
        };

        loadUser();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            await authService.login(credentials);

            // Fetch user details from /api/auth/me/
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            toast.success('Login successful!');
        } catch (error: any) {
            const message = error.response?.data?.detail || error.response?.data?.message || 'Login failed';
            toast.error(message);
            throw error;
        }
    };

    const register = async (data: RegisterData) => {
        try {
            await authService.register(data);
            toast.success('Registration successful! Please verify your email.');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
            setUser(null);
            toast.success('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const verifyEmail = async (token: string) => {
        try {
            await authService.verifyEmail(token);

            // Refresh user to get updated verification status
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            toast.success('Email verified successfully!');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Verification failed';
            toast.error(message);
            throw error;
        }
    };

    const refreshUser = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const hasRole = (role: UserRole): boolean => {
        return user?.role === role;
    };

    const canPerformAction = (action: string): boolean => {
        if (!user) return false;

        switch (action) {
            case 'create_task_for_others':
                return user.role === 'manager';
            case 'write':
                return user.role !== 'auditor';
            case 'read':
                return true; // All authenticated users can read
            default:
                return false;
        }
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isEmailVerified: user?.isEmailVerified || false,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
        refreshUser,
        hasRole,
        canPerformAction,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
