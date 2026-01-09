import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';
import '@/styles/components.css';

export const EmailVerification: React.FC = () => {
    const navigate = useNavigate();
    const { verifyEmail, user } = useAuth();

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!code.trim()) {
            toast.error('Please enter verification code');
            return;
        }

        setIsLoading(true);

        try {
            await verifyEmail(code);
            navigate('/dashboard');
        } catch (error) {
            console.error('Verification error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!user?.email) {
            toast.error('No email address found');
            return;
        }

        setIsResending(true);

        try {
            await authService.resendVerification(user.email);
            toast.success('Verification email sent!');
        } catch (error) {
            toast.error('Failed to resend verification email');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
                    <h1 className="gradient-text" style={{ marginBottom: '0.5rem' }}>Verify Your Email</h1>
                    <p className="text-muted">
                        We've sent a verification code to your email address. Please enter it below.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="code">
                            Verification Code
                        </label>
                        <input
                            id="code"
                            type="text"
                            className="form-input"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            disabled={isLoading}
                            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-muted">
                        Didn't receive the code?{' '}
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-start)',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: 0,
                                font: 'inherit',
                            }}
                        >
                            {isResending ? 'Sending...' : 'Resend'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
