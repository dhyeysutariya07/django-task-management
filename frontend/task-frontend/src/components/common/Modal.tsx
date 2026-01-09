import React, { ReactNode, useEffect } from 'react';
import '@/styles/components.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${sizeClass}`}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: size === 'sm' ? '400px' : size === 'lg' ? '900px' : '600px' }}
            >
                {title && (
                    <div className="modal-header">
                        <h3 className="modal-title">{title}</h3>
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            ×
                        </button>
                    </div>
                )}

                <div className="modal-body">{children}</div>

                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};
