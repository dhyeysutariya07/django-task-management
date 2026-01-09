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
    // Define size dimensions
    const sizeMap = {
        sm: { width: '16px', height: '16px', borderWidth: '2px' },
        md: { width: '24px', height: '24px', borderWidth: '3px' },
        lg: { width: '40px', height: '40px', borderWidth: '4px' }
    };

    const dimensions = sizeMap[size];

    return (
        <div 
            className={`spinner ${className}`}
            style={{
                width: dimensions.width,
                height: dimensions.height,
                borderWidth: dimensions.borderWidth,
                borderColor: 'rgba(139, 92, 246, 0.3)',
                borderTopColor: 'var(--primary-start)'
            }}
            role="status" 
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export const LoadingPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="text-center">
                <div className="loading-text" style={{ fontSize: '1.125rem', justifyContent: 'center', color: 'var(--text-primary)' }}>
                    <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', borderColor: 'rgba(139, 92, 246, 0.3)', borderTopColor: 'var(--primary-start)' }}></div>
                    Loading...
                </div>
            </div>
        </div>
    );
};
