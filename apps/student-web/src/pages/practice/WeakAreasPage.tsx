import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { WeakAreaItem } from '@study-karnataka/shared-types';

export const WeakAreasPage: React.FC = () => {
  const navigate = useNavigate();
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    StudentTopicPracticeApi.getWeakAreas()
      .then((res) => setWeakAreas(res))
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
            Personal Weak Areas
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
            Derived from your personal practice history. Practicing weak areas helps strengthen low-accuracy topics dynamically.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Analyzing practice history...</div>
        ) : weakAreas.length === 0 ? (
          <Card title="No Weak Areas Identified" subtitle="Great job! Keep practicing to track performance metrics across topics.">
            <Button variant="primary" size="md" onClick={() => navigate('/practice/configure')}>
              Start Custom Practice
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {weakAreas.map((item, idx) => (
              <div
                key={idx}
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
                    <Badge label={item.statusLabel} variant={item.statusLabel === 'WEAK' ? 'warning' : 'neutral'} />
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    {item.totalAttempted} Attempted • {item.totalCorrect} Correct / {item.totalWrong} Incorrect
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: item.accuracyPercentage < 50 ? '#DC2626' : '#D97706' }}>
                      {item.accuracyPercentage}% Accuracy
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/practice/configure?categoryId=${item.categoryId}${
                          item.subcategoryId ? `&subcategoryId=${item.subcategoryId}` : ''
                        }`
                      )
                    }
                  >
                    Practice This Area
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
