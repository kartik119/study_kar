import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { PracticeSessionSummary } from '@study-karnataka/shared-types';

export const PracticeSummaryPage: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<PracticeSessionSummary | null>(null);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    StudentTopicPracticeApi.completeSession(sessionId)
      .then((res) => {
        setSummary(res);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load session summary');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleRetryIncorrect = async () => {
    if (!sessionId || retrying) return;
    setRetrying(true);
    setError(null);

    try {
      const newSession = await StudentTopicPracticeApi.retryIncorrectSession(sessionId);
      navigate(`/practice/session/${newSession.session.id}`);
    } catch (err: any) {
      setError(err.message || 'No incorrect questions available to retry.');
      setRetrying(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Loading practice summary...</div>;
  }

  if (error && !summary) {
    return (
      <div style={{ maxWidth: '500px', margin: '60px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
        <Alert variant="error" title="Summary Error" message={error} />
        <div style={{ marginTop: '16px' }}>
          <Button variant="primary" onClick={() => navigate('/practice')}>Back to Practice Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #DCE6EE',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#084B7A',
              color: '#FFFFFF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            SK
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Practice Session Complete
            </h1>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Learning Summary & Analytics</span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
          Back to Practice Home
        </Button>
      </header>

      {/* Main Content Container */}
      <main style={{ maxWidth: '900px', margin: '32px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Notification" message={error} />
          </div>
        )}

        {summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Banner */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #DCE6EE',
                padding: '32px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#EAF3F9',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  color: '#084B7A',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                🎉 Topic Practice Completed
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0' }}>
                {summary.categoryName} {summary.subcategoryName ? `› ${summary.subcategoryName}` : ''}
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Mode: {summary.selectionMode} • Total Questions: {summary.actualQuestionCount}
              </p>
            </div>

            {/* Score Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <Card>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Attempted Accuracy</div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    color: summary.accuracyPercentage >= 70 ? '#16A34A' : '#D97706',
                    margin: '4px 0',
                  }}
                >
                  {summary.accuracyPercentage}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Among attempted MCQs</div>
              </Card>

              <Card>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Correct Answers</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#16A34A', margin: '4px 0' }}>
                  {summary.correctCount}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Out of {summary.attemptedCount} attempted</div>
              </Card>

              <Card>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Incorrect Answers</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#DC2626', margin: '4px 0' }}>
                  {summary.wrongCount}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Eligible for retry</div>
              </Card>

              <Card>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Unanswered / Skipped</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#64748B', margin: '4px 0' }}>
                  {summary.unansweredCount}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Not counted as wrong</div>
              </Card>

              <Card>
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Marked for Revision</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#D97706', margin: '4px 0' }}>
                  {summary.markedForRevisionCount}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Bookmarked for review</div>
              </Card>
            </div>

            {/* Recommendations */}
            {summary.recommendations && summary.recommendations.length > 0 && (
              <Card title="Suggested Next Learning Steps">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#F8FAFC',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        borderLeft: '4px solid #084B7A',
                        fontSize: '14px',
                        color: '#334155',
                        fontWeight: 500,
                      }}
                    >
                      💡 {rec}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Action CTAs */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #DCE6EE',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <Button
                variant="primary"
                size="lg"
                onClick={handleRetryIncorrect}
                disabled={retrying || summary.wrongCount === 0}
              >
                {retrying ? 'Starting Retry Session...' : `🔄 Retry ${summary.wrongCount} Incorrect Questions`}
              </Button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="outline" size="lg" onClick={() => navigate('/practice/weak-areas')}>
                  Practice Weak Areas
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate('/practice/configure')}>
                  Start New Session
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
