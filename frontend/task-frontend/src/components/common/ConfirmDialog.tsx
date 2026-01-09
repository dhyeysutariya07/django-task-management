import React from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
}) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const confirmButtonClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className={`btn ${confirmButtonClass}`} onClick={handleConfirm}>
                        {confirmText}
                    </button>
                </>
            }
        >
            <p>{message}</p>
        </Modal>
    );
};
