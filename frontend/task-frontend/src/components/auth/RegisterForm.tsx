import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { validators } from '@/utils/validators';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import '@/styles/components.css';

export const RegisterForm: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'developer' as UserRole,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (!validators.isValidEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        const passwordValidation = validators.isValidPassword(formData.password);
        if (!passwordValidation.valid) {
            newErrors.password = passwordValidation.message || 'Invalid password';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        try {
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });

            // Show success message instead of redirecting to OTP page
            toast.success('Registration successful! Please check your mailbox to verify your email address.', {
                duration: 5000,
                icon: '📧',
            });

            // Redirect to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error) {
            console.error('Registration error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="gradient-text" style={{ marginBottom: '0.5rem' }}>Create Account</h1>
                    <p className="text-muted">Join our task management platform</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            placeholder="your_username"
                            disabled={isLoading}
                        />
                        {errors.username && <div className="form-error">{errors.username}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="you@example.com"
                            disabled={isLoading}
                        />
                        {errors.email && <div className="form-error">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="role">
                            Role
                        </label>
                        <select
                            id="role"
                            className="form-select"
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="developer">Developer</option>
                            <option value="manager">Manager</option>
                            <option value="auditor">Auditor</option>
                        </select>
                        <div className="form-helper">
                            Developers can manage their own tasks. Managers can assign tasks to anyone. Auditors have read-only access.
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                        {errors.password && <div className="form-error">{errors.password}</div>}
                        <div className="form-helper">
                            At least 8 characters with uppercase, lowercase, and number
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="form-input"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                        {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="loading-text">
                                <div className="spinner"></div>
                                Creating Account...
                            </span>
                        ) : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-muted">
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--primary-start)', textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
