import React from 'react';
import '@/styles/index.css';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = ''
}) => {
    const sizeClass = size === 'sm' ? 'spinner-sm' : '';

    return (
        <div className={`spinner ${sizeClass} ${className}`} role="status" aria-label="Loading">
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export const LoadingPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-muted" style={{ marginTop: '1rem' }}>Loading...</p>
            </div>
        </div>
    );
};
