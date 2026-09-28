import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input, Button, Card } from '@study-karnataka/ui';
import { Check, X, Shield, Lock, Eye, EyeOff } from 'lucide-react';

export const AdminActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState<{ email: string, fullName: string } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('Activation token is missing.');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/v1/admin/team/validate-activation?token=${token}`).then(res => { if (!res.ok) throw new Error('Invalid'); return res.json(); });
        if (response.data.success) {
          setUserData(response.data.data);
          setStatus('valid');
        } else {
          setStatus('invalid');
          setErrorMessage(response.data.message || 'Invalid or expired token.');
        }
      } catch (error: any) {
        setStatus('invalid');
        setErrorMessage(error.response?.data?.message || 'Failed to validate token. It may be expired or already used.');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/admin/team/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) }).then(res => { if (!res.ok) throw new Error('Invalid'); return res.json(); });
      if (response.data.success) {
        setStatus('success');
      } else {
        setPasswordError(response.data.message || 'Failed to activate account.');
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Failed to activate account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' }}></div>
          <p>Validating invitation...</p>
        </div>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px' }}>
        <Card style={{ maxWidth: '440px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <X size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Invalid Link</h1>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>{errorMessage}</p>
          <Button variant="primary" onClick={() => navigate('/admin/login')} style={{ width: '100%' }}>
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px' }}>
        <Card style={{ maxWidth: '440px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <Check size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>Account Activated!</h1>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>Your account has been successfully set up. You can now log in to the admin platform.</p>
          <Button variant="primary" onClick={() => navigate('/admin/login')} style={{ width: '100%' }}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '24px' }}>
      <Card style={{ maxWidth: '480px', width: '100%', padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} />
          </div>
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0', textAlign: 'center' }}>Set up your account</h1>
        <p style={{ color: '#64748B', margin: '0 0 32px 0', textAlign: 'center', fontSize: '14px' }}>
          Welcome, <span style={{ fontWeight: 600, color: '#0F172A' }}>{userData?.fullName}</span>. Please set a strong password to activate your account.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>Email Address</label>
            <Input value={userData?.email} disabled style={{ backgroundColor: '#F1F5F9', color: '#64748B' }} />
          </div>

          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>Create Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '10px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {passwordError && (
            <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <X size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{passwordError}</span>
            </div>
          )}

          <Button type="submit" variant="primary" style={{ width: '100%', padding: '12px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Activating Account...' : 'Activate Account'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
