import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Input,
  FormField,
  Select,
  Alert,
  EmptyState,
} from '@study-karnataka/ui';
import { isMinor } from '@study-karnataka/validation';
import { StudentRankedTestListPage } from './pages/ranked-tests/StudentRankedTestListPage';
import { StudentPreStartPage } from './pages/ranked-tests/StudentPreStartPage';
import { StudentAttemptPage } from './pages/ranked-tests/StudentAttemptPage';
import { StudentPostSubmitPage } from './pages/ranked-tests/StudentPostSubmitPage';
import { StudentResultPage } from './pages/ranked-tests/StudentResultPage';
import { StudentSolutionReviewPage } from './pages/ranked-tests/StudentSolutionReviewPage';
import { PracticeHomePage } from './pages/practice/PracticeHomePage';
import { PracticeConfigurePage } from './pages/practice/PracticeConfigurePage';
import { PracticeSessionPage } from './pages/practice/PracticeSessionPage';
import { PracticeSummaryPage } from './pages/practice/PracticeSummaryPage';
import { PracticeHistoryPage } from './pages/practice/PracticeHistoryPage';
import { WeakAreasPage } from './pages/practice/WeakAreasPage';
import { IncorrectQuestionsPage } from './pages/practice/IncorrectQuestionsPage';
import { StudentResultsPage } from './pages/performance/StudentResultsPage';
import { StudentPerformanceDashboardPage } from './pages/performance/StudentPerformanceDashboardPage';
import { CategoryPerformanceDetailPage } from './pages/performance/CategoryPerformanceDetailPage';
import { StudentWeakAreasPage } from './pages/performance/StudentWeakAreasPage';
import { FrequentlyWrongQuestionsPage } from './pages/performance/FrequentlyWrongQuestionsPage';
import { StudentCreatePlanPage } from './pages/study-plans/StudentCreatePlanPage';
import { StudentWeeklyPlannerPage } from './pages/study-plans/StudentWeeklyPlannerPage';

// Protected Route Component
const ProtectedStudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('student_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// 1. Student Auth & Registration Screen
const StudentAuthPage: React.FC = () => {
  const [step, setStep] = useState<'MOBILE' | 'OTP' | 'REGISTER' | 'GUARDIAN'>('MOBILE');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [preparationLanguage, setPreparationLanguage] = useState<'kn' | 'en'>('kn');
  const [email, setEmail] = useState('');

  // Guardian State for Minors
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Father');
  const [guardianMobile, setGuardianMobile] = useState('');
  const [guardianOtp, setGuardianOtp] = useState('');
  const [createdStudentUserId, setCreatedStudentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Resend Timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'OTP' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/student/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, purpose: 'STUDENT_REGISTRATION' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Failed to request OTP');
        setLoading(false);
        return;
      }

      setDevOtp(data.data.devOtp || '123456');
      setStep('OTP');
      setResendTimer(60);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/student/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, purpose: 'STUDENT_REGISTRATION' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Invalid OTP code');
        setLoading(false);
        return;
      }

      if (data.data.isRegistered) {
        localStorage.setItem('student_token', data.data.accessToken);
        localStorage.setItem('student_user', JSON.stringify(data.data.user));
        navigate('/dashboard');
      } else {
        setStep('REGISTER');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const userIsMinor = isMinor(dateOfBirth);

    try {
      const payload: any = {
        mobile,
        fullName,
        dateOfBirth,
        preparationLanguage,
        email: email || undefined,
      };

      if (userIsMinor) {
        payload.guardianDetails = {
          guardianName,
          guardianRelationship,
          guardianMobile,
        };
      }

      const res = await fetch('http://localhost:4000/api/v1/auth/student/registration/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Registration failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('student_token', data.data.accessToken);
      localStorage.setItem('student_user', JSON.stringify(data.data.user));

      if (userIsMinor) {
        setCreatedStudentUserId(data.data.user.id);
        setStep('GUARDIAN');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Guardian OTP
  const handleVerifyGuardianOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/guardian/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianMobile,
          otp: guardianOtp,
          studentUserId: createdStudentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Invalid Guardian OTP');
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch {
      setError('Failed to verify guardian consent');
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
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E6EAF0',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#EF2323',
              color: '#FFFFFF',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '22px',
              marginBottom: '12px',
            }}
          >
            SK
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
            Student Portal
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Karnataka Competitive Exam Preparation
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* STEP 1: MOBILE ENTRY */}
        {step === 'MOBILE' && (
          <form onSubmit={handleRequestOtp}>
            <FormField label="Indian Mobile Number" required helperText="10-digit mobile number starting with 6-9">
              <Input
                type="tel"
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                required
              />
            </FormField>
            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending OTP...' : 'Get OTP Code'}
            </Button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp}>
            {devOtp && (
              <div style={{ marginBottom: '16px' }}>
                <Alert
                  variant="info"
                  title="Development Mode OTP"
                  message={`Your local test OTP code is: ${devOtp}`}
                />
              </div>
            )}
            <FormField label={`Enter 6-Digit OTP sent to ${mobile}`} required>
              <Input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>
                {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend available now'}
              </span>
              <button
                type="button"
                onClick={() => setStep('MOBILE')}
                style={{ background: 'none', border: 'none', color: '#EF2323', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                Change Number
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </form>
        )}

        {/* STEP 3: REGISTRATION DETAILS */}
        {step === 'REGISTER' && (
          <form onSubmit={handleCompleteRegistration}>
            <FormField label="Full Name" required>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Date of Birth" required helperText="Mandatory for age verification">
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </FormField>

            {dateOfBirth && isMinor(dateOfBirth) && (
              <div style={{ marginBottom: '16px' }}>
                <Alert
                  variant="warning"
                  title="Under-18 Registration"
                  message="Since you are under 18, parent or guardian details are required below."
                />
                <div style={{ borderTop: '1px solid #E6EAF0', paddingTop: '16px', marginTop: '12px' }}>
                  <FormField label="Guardian Full Name" required>
                    <Input
                      type="text"
                      placeholder="Father / Mother / Guardian Name"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Relationship" required>
                    <Input
                      type="text"
                      placeholder="e.g. Father, Mother, Legal Guardian"
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label="Guardian Mobile Number" required>
                    <Input
                      type="tel"
                      placeholder="Guardian 10-digit mobile"
                      value={guardianMobile}
                      onChange={(e) => setGuardianMobile(e.target.value)}
                      maxLength={10}
                      required
                    />
                  </FormField>
                </div>
              </div>
            )}

            <FormField
              label="Preparation Language"
              required
              helperText="Your study materials, MCQs, and tests will be shown in this language. Changeable until study plan begins."
            >
              <Select
                value={preparationLanguage}
                onChange={(e) => setPreparationLanguage(e.target.value as 'kn' | 'en')}
                options={[
                  { value: 'kn', label: 'Kannada Medium (ಕನ್ನಡ)' },
                  { value: 'en', label: 'English Medium' },
                ]}
              />
            </FormField>

            <FormField label="Email Address (Optional)">
              <Input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Completing Registration...' : 'Complete Profile & Access Dashboard'}
            </Button>
          </form>
        )}

        {/* STEP 4: GUARDIAN OTP CONSENT */}
        {step === 'GUARDIAN' && (
          <form onSubmit={handleVerifyGuardianOtp}>
            <div style={{ marginBottom: '16px' }}>
              <Alert
                variant="warning"
                title="Guardian Consent Pending"
                message={`Please enter the OTP code sent to guardian mobile (${guardianMobile}) to verify consent.`}
              />
            </div>

            <FormField label="Guardian 6-Digit OTP" required>
              <Input
                type="text"
                placeholder="123456"
                value={guardianOtp}
                onChange={(e) => setGuardianOtp(e.target.value)}
                maxLength={6}
                required
              />
            </FormField>

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying Consent...' : 'Verify Guardian Consent'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

// 2. Authenticated Student Dashboard Page
const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const storedUserRaw = localStorage.getItem('student_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;

  const [language, setLanguage] = useState<'kn' | 'en'>(user?.preparationLanguage || 'kn');
  const [isLocked, setIsLocked] = useState<boolean>(user?.isLanguageLocked || false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = localStorage.getItem('student_token');

  // Handle Preparation Language Update
  const handleUpdateLanguage = async (newLang: 'kn' | 'en') => {
    if (isLocked) return;
    setMessage(null);
    setUpdating(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/students/me/preparation-language', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preparationLanguage: newLang }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to update language' });
        return;
      }

      setLanguage(newLang);
      setMessage({ type: 'success', text: `Preparation language updated to ${newLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}.` });
    } catch {
      setMessage({ type: 'error', text: 'Network error updating language.' });
    } finally {
      setUpdating(false);
    }
  };

  // Handle Lock Language (Simulates starting a study plan in future prompts)
  const handleLockLanguage = async () => {
    setMessage(null);
    setUpdating(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/students/me/preparation-language/lock', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to lock language' });
        return;
      }

      setIsLocked(true);
      setMessage({ type: 'success', text: 'Preparation language is now locked for your active study plan.' });
    } catch {
      setMessage({ type: 'error', text: 'Network error locking language.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FC', fontFamily: 'Inter, sans-serif' }}>
      {/* Student Top Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E6EAF0',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#EF2323',
              color: '#FFFFFF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            SK
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Study Karnataka</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Badge label={language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English Medium'} variant="info" />
          <Badge label={isLocked ? 'Language Locked' : 'Language Unlocked'} variant={isLocked ? 'warning' : 'success'} />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '960px', margin: '36px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Welcome, {user?.fullName || 'Student'}!
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', margin: '4px 0 0 0' }}>
            Authenticated Student Account Dashboard
          </p>
        </div>

        {message && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant={message.type === 'error' ? 'error' : 'success'} title="Notification" message={message.text} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Language Preference Card */}
          <Card title="Preparation Language Preference" subtitle="Controls study material & test language">
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 12px 0' }}>
                Current Language: <strong style={{ color: '#111827' }}>{language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}</strong>
              </p>
              <div style={{ display: 'flex', gap: '12px', opacity: isLocked ? 0.6 : 1 }}>
                <Button
                  variant={language === 'kn' ? 'primary' : 'outline'}
                  size="sm"
                  disabled={isLocked || updating}
                  onClick={() => handleUpdateLanguage('kn')}
                >
                  Kannada (ಕನ್ನಡ)
                </Button>
                <Button
                  variant={language === 'en' ? 'primary' : 'outline'}
                  size="sm"
                  disabled={isLocked || updating}
                  onClick={() => handleUpdateLanguage('en')}
                >
                  English Medium
                </Button>
              </div>
            </div>

            {isLocked ? (
              <Alert
                variant="info"
                title="Language Locked"
                message="Your preparation language is locked for your active study plan. It cannot be changed."
              />
            ) : (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px 0' }}>
                  Simulate locking preparation language (occurs when starting a Study Plan in future prompts):
                </p>
                <Button variant="secondary" size="sm" onClick={handleLockLanguage} disabled={updating}>
                  Lock Preparation Language
                </Button>
              </div>
            )}
          </Card>

          {/* Academic Modules Placeholder Card */}
          <Card title="Topic Practice & Learning Engine" subtitle="Continuous Practice & Weak-Area Mastery">
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px 0' }}>
              Personalized non-ranked topic practice, instant bilingual explanations, and dynamic weak-area repetition.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="primary" size="md" onClick={() => navigate('/practice')}>
                Open Topic Practice Engine →
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/ranked-tests')}>
                Go to Ranked Tests
              </Button>
            </div>
          </Card>

          {/* Weekly Planner Card */}
          <Card title="My Weekly Planner" subtitle="Your personalized day-by-day study schedule">
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px 0' }}>
              View the specific concepts and topics assigned to you for today and the upcoming week.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="primary" size="md" onClick={() => navigate('/study-plans/weekly')}>
                View My Weekly Planner →
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/study-plans/create')}>
                Create New Study Plan
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<StudentAuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedStudentRoute>
            <StudentDashboardPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests"
        element={
          <ProtectedStudentRoute>
            <StudentRankedTestListPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests/:id"
        element={
          <ProtectedStudentRoute>
            <StudentPreStartPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests/:id/attempt"
        element={
          <ProtectedStudentRoute>
            <StudentAttemptPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests/:id/submitted"
        element={
          <ProtectedStudentRoute>
            <StudentPostSubmitPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests/:id/result"
        element={
          <ProtectedStudentRoute>
            <StudentResultPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/ranked-tests/:id/result/review"
        element={
          <ProtectedStudentRoute>
            <StudentSolutionReviewPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedStudentRoute>
            <PracticeHomePage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/configure"
        element={
          <ProtectedStudentRoute>
            <PracticeConfigurePage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/session/:id"
        element={
          <ProtectedStudentRoute>
            <PracticeSessionPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/session/:id/summary"
        element={
          <ProtectedStudentRoute>
            <PracticeSummaryPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/history"
        element={
          <ProtectedStudentRoute>
            <PracticeHistoryPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/weak-areas"
        element={
          <ProtectedStudentRoute>
            <WeakAreasPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/practice/incorrect"
        element={
          <ProtectedStudentRoute>
            <IncorrectQuestionsPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedStudentRoute>
            <StudentResultsPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedStudentRoute>
            <StudentPerformanceDashboardPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/study-plans/create"
        element={
          <ProtectedStudentRoute>
            <StudentCreatePlanPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/study-plans/weekly"
        element={
          <ProtectedStudentRoute>
            <StudentWeeklyPlannerPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/performance/category/:id"
        element={
          <ProtectedStudentRoute>
            <CategoryPerformanceDetailPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/performance/weak-areas"
        element={
          <ProtectedStudentRoute>
            <StudentWeakAreasPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/performance/questions/frequently-wrong"
        element={
          <ProtectedStudentRoute>
            <FrequentlyWrongQuestionsPage />
          </ProtectedStudentRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
            <EmptyState title="404 — Not Found" description="The requested student page does not exist." />
          </div>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;
