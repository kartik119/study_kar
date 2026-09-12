import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { PracticeSessionSummary } from '@study-karnataka/shared-types';

export const IncorrectQuestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<PracticeSessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    StudentTopicPracticeApi.getHistory()
      .then((res) => setHistory(res.filter((s) => s.wrongCount > 0)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleStartIncorrectRetry = async (sessionId: string) => {
    try {
      const newSession = await StudentTopicPracticeApi.retryIncorrectSession(sessionId);
      navigate(`/practice/session/${newSession.session.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

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
          <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
            ← Back to Practice Home
          </Button>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Retry Incorrect Questions
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '900px', margin: '32px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>
            Select a previous session containing incorrect answers to generate a targeted retry session.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading incorrect questions history...</div>
        ) : history.length === 0 ? (
          <Card title="No Incorrect Questions Pending" subtitle="You currently have no recorded incorrect questions to retry!">
            <Button variant="primary" size="md" onClick={() => navigate('/practice/configure')}>
              Start New Practice Session
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #DCE6EE',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#111827' }}>
                      {item.categoryName} {item.subcategoryName ? `› ${item.subcategoryName}` : ''}
                    </span>
                    <Badge label={`${item.wrongCount} Incorrect`} variant="warning" />
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    Session Date: {new Date(item.startedAt).toLocaleDateString()} • {item.actualQuestionCount} Questions Total
                  </div>
                </div>

                <Button variant="primary" size="sm" onClick={() => handleStartIncorrectRetry(item.id)}>
                  Retry {item.wrongCount} Questions
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
