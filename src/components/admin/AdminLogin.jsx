import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin, registerFirstAdmin } from '../../services/authService';

function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFirstAdmin, setIsFirstAdmin] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isFirstAdmin) {
                // Register first admin
                await registerFirstAdmin(email, password);
                alert('Admin account created successfully!');
            } else {
                // Sign in existing admin
                await signInAdmin(email, password);
            }
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '450px' }}>
                <div className="page-header">
                    <h1 className="page-title">🔐 Admin Login</h1>
                    <p className="page-subtitle">Manage stories and subjects</p>
                </div>

                <div className="glass-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isFirstAdmin}
                                    onChange={(e) => setIsFirstAdmin(e.target.checked)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                <span>Register as first admin</span>
                            </label>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>
                                Check this only if you're creating the first admin account
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid var(--error)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem',
                                color: 'var(--error)'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-large"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : (isFirstAdmin ? 'Create Admin Account' : 'Sign In')}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <a
                            href="/"
                            style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                textDecoration: 'none',
                                fontSize: '0.9rem'
                            }}
                        >
                            ← Back to App
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;
