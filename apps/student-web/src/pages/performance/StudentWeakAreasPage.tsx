import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentPerformanceApi } from '../../api/student-performance.api';
import { TaxonomyPerformanceSummary } from '@study-karnataka/shared-types';

export const StudentWeakAreasPage: React.FC = () => {
  const navigate = useNavigate();
  const [weakAreas, setWeakAreas] = useState<TaxonomyPerformanceSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeakAreas();
  }, []);

  const fetchWeakAreas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await StudentPerformanceApi.getWeakAreas();
      setWeakAreas(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load weak areas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="outline" size="sm" onClick={() => navigate('/performance')}>
          ← Back to Performance
        </Button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
          Personal Weak Areas (Needs Review)
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Deterministically classified topics with recent practice accuracy below 50% or repeated wrong answers.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading weak areas...</div>
      ) : weakAreas.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
            🎉 No Weak Areas Detected!
          </div>
          <p style={{ fontSize: '14px', color: '#14532D', margin: '0 0 16px 0' }}>
            Your recent practice accuracy across configured subjects is above 50%. Keep up the regular practice!
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/practice')}>
            Continue Topic Practice
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weakAreas.map((area, idx) => (
            <Card key={area.entityId} style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '11px' }}>
                      Priority #{idx + 1}
                    </span>
                    <Badge label="Needs Review" variant="warning" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '4px 0 2px 0' }}>
                    {area.entityName}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{area.entityCode}</div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/practice/configure?categoryId=${area.categoryId}&subcategoryId=${area.subcategoryId || ''}&selectionMode=WEAK_AREA`)}
                >
                  Practice This Area →
                </Button>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>RECENT ACCURACY</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
                    {area.recentAccuracy !== null ? `${area.recentAccuracy}%` : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>LATEST UNIQUE</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    {area.latestUniqueAccuracy !== null ? `${area.latestUniqueAccuracy}%` : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>REPEATED WRONG</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>
                    {area.repeatedWrongCount} questions
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>UNIQUE SEEN</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    {area.uniqueQuestionCount}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
