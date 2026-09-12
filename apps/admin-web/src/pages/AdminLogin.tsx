import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Button, Input, FormField, Alert } from '@study-karnataka/ui';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', data.data.accessToken);
      localStorage.setItem('admin_user', JSON.stringify(data.data.user));

      navigate('/');
    } catch {
      setError('Unable to connect to administration server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F7F8FC',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E6EAF0',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/branding/study-karnataka-logo.png"
            alt="Study Karnataka"
            style={{
              maxWidth: '220px',
              height: 'auto',
              marginBottom: '16px',
              objectFit: 'contain',
            }}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
            Admin Portal Login
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Study Karnataka Platform Administration
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Authentication Error" message={error} />
          </div>
        )}

        <form onSubmit={handleLogin}>
          <FormField label="Administrator Email" required>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <Input
                type="email"
                placeholder="admin@studykarnataka.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
                required
              />
            </div>
          </FormField>

          <FormField label="Password" required>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            style={{ marginTop: '12px', width: '100%' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
          </Button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
          <ShieldAlert size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Authorized administrative personnel only. Failed login attempts are logged.
        </div>
      </div>
    </div>
  );
};
