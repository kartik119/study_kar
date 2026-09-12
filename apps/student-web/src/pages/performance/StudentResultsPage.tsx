import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentPerformanceApi } from '../../api/student-performance.api';
import { UnifiedResultItem } from '@study-karnataka/shared-types';

export const StudentResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<UnifiedResultItem[]>([]);
  const [sourceType, setSourceType] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [sourceType, page]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await StudentPerformanceApi.getUnifiedResults({ sourceType, page, pageSize: 8 });
      setResults(data.results);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0 }}>
          Results & Attempt History
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Unified history of completed Ranked Tests and Topic Practice sessions.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {/* Source Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { key: 'ALL', label: 'All Learning Activity' },
          { key: 'RANKED_TEST', label: 'Ranked Tests' },
          { key: 'PRACTICE', label: 'Topic Practice' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setSourceType(tab.key); setPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: sourceType === tab.key ? '1px solid #084B7A' : '1px solid #CBD5E1',
              backgroundColor: sourceType === tab.key ? '#084B7A' : '#FFFFFF',
              color: sourceType === tab.key ? '#FFFFFF' : '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading results...</div>
      ) : results.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            No Results Found
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 16px 0' }}>
            Your results will appear here after you complete Practice sessions or Ranked Tests.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/practice')}>
            Start Topic Practice
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map((item) => (
            <Card key={item.id} style={{ padding: '20px', borderLeft: item.sourceType === 'RANKED_TEST' ? '4px solid #084B7A' : '4px solid #16A34A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge
                      label={item.sourceType === 'RANKED_TEST' ? 'Ranked Test' : 'Topic Practice'}
                      variant={item.sourceType === 'RANKED_TEST' ? 'info' : 'success'}
                    />
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '4px 0 2px 0' }}>
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <div style={{ fontSize: '13px', color: '#64748B' }}>{item.subtitle}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button variant="outline" size="sm" onClick={() => navigate(item.detailUrl)}>
                    View Details →
                  </Button>
                </div>
              </div>

              {/* Status & Metrics */}
              {item.isResultsAwaited ? (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '6px', color: '#92400E', fontWeight: 600, fontSize: '13px' }}>
                  ⏳ Submitted — Results Awaited (Academic performance & rank will be available after official result publication)
                </div>
              ) : (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  {item.sourceType === 'RANKED_TEST' && item.score !== null && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SCORE</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#084B7A' }}>
                        {item.score} / {item.maxScore}
                      </div>
                    </div>
                  )}

                  {item.sourceType === 'RANKED_TEST' && item.rank !== null && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>STATE RANK</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706' }}>
                        #{item.rank} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>of {item.totalParticipants}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ATTEMPTED</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                      {item.attemptedCount} / {item.totalQuestions}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CORRECT / WRONG</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A' }}>
                      {item.correctCount || 0} <span style={{ color: '#DC2626' }}>/ {item.wrongCount || 0}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>ACCURACY</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: item.accuracyPercentage && item.accuracyPercentage >= 50 ? '#16A34A' : '#D97706' }}>
                      {item.accuracyPercentage !== null ? `${item.accuracyPercentage}%` : '—'}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
};
