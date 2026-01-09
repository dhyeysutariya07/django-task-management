import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { validators } from '@/utils/validators';
import '@/styles/components.css';

export const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [captchaQuestion, setCaptchaQuestion] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Check for CAPTCHA challenge
    useEffect(() => {
        const question = sessionStorage.getItem('captcha_question');
        if (question) {
            setCaptchaQuestion(question);
        }
    }, []);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        }

        if (captchaQuestion && !captchaAnswer) {
            newErrors.captcha = 'Please solve the CAPTCHA';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        try {
            // Save captcha answer to session storage for API interceptor
            if (captchaAnswer) {
                sessionStorage.setItem('captcha_answer', captchaAnswer);
            }

            await login({ username, password });
            navigate('/dashboard');
        } catch (error: any) {
            // Check if new CAPTCHA was issued
            const newQuestion = sessionStorage.getItem('captcha_question');
            if (newQuestion) {
                setCaptchaQuestion(newQuestion);
                setCaptchaAnswer('');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Redirect if already authenticated
    if (isAuthenticated) {
        navigate('/dashboard');
        return null;
    }

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="gradient-text" style={{ marginBottom: '0.5rem' }}>Welcome Back</h1>
                    <p className="text-muted">Sign in to your account</p>
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
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your_username"
                            disabled={isLoading}
                        />
                        {errors.username && <div className="form-error">{errors.username}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                        {errors.password && <div className="form-error">{errors.password}</div>}
                    </div>

                    {captchaQuestion && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="captcha">
                                Security Check: {captchaQuestion}
                            </label>
                            <input
                                id="captcha"
                                type="text"
                                className="form-input"
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                placeholder="Enter answer"
                                disabled={isLoading}
                            />
                            {errors.captcha && <div className="form-error">{errors.captcha}</div>}
                            <div className="form-helper">
                                Too many failed login attempts detected. Please solve this math problem.
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="loading-text">
                                <div className="spinner"></div>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-muted">
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--primary-start)', textDecoration: 'none' }}>
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
