import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { PracticeSessionSummary } from '@study-karnataka/shared-types';

export const PracticeHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<PracticeSessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    StudentTopicPracticeApi.getHistory()
      .then((res) => setHistory(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
            Practice Session History
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '32px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading practice history...</div>
        ) : history.length === 0 ? (
          <Card title="No Practice History Found" subtitle="You have not started any topic practice sessions yet.">
            <Button variant="primary" size="md" onClick={() => navigate('/practice/configure')}>
              Start First Practice Session
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((s) => (
              <div
                key={s.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #DCE6EE',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: '#111827' }}>{s.categoryName}</span>
                    {s.subcategoryName && <Badge label={s.subcategoryName} variant="info" />}
                    <Badge label={s.status} variant={s.status === 'COMPLETED' ? 'success' : s.status === 'ACTIVE' ? 'warning' : 'neutral'} />
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    Date: {new Date(s.startedAt).toLocaleString()} • Mode: {s.selectionMode} • Questions: {s.actualQuestionCount}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: s.accuracyPercentage >= 70 ? '#16A34A' : '#D97706' }}>
                      {s.accuracyPercentage}% Accuracy
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{s.correctCount} / {s.attemptedCount} Correct</div>
                  </div>

                  {s.status === 'ACTIVE' ? (
                    <Button variant="primary" size="sm" onClick={() => navigate(`/practice/session/${s.id}`)}>
                      Resume
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/practice/session/${s.id}/summary`)}>
                      View Summary
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
