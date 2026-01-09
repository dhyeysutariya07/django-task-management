import React from 'react';
import { TaskStatus } from '@/types';
import '@/styles/components.css';

interface BulkActionToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkUpdate: (status: TaskStatus) => void;
    isUpdating: boolean;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
    selectedCount,
    onClearSelection,
    onBulkUpdate,
    isUpdating,
}) => {
    const [selectedStatus, setSelectedStatus] = React.useState<TaskStatus>('pending');

    const handleUpdate = () => {
        if (window.confirm(`Update ${selectedCount} task(s) to "${selectedStatus}"?`)) {
            onBulkUpdate(selectedStatus);
        }
    };

    if (selectedCount === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-secondary)',
                border: '2px solid var(--primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
            }}
        >
            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="bulk-status" style={{ fontSize: '0.875rem' }}>
                    Change status to:
                </label>
                <select
                    id="bulk-status"
                    className="form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)}
                    disabled={isUpdating}
                    style={{ minWidth: '150px' }}
                >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={isUpdating}
            >
                {isUpdating ? 'Updating...' : 'Update Selected'}
            </button>

            <button
                className="btn btn-secondary"
                onClick={onClearSelection}
                disabled={isUpdating}
            >
                Clear Selection
            </button>
        </div>
    );
};
