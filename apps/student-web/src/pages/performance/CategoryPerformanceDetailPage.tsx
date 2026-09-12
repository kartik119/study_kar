import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentPerformanceApi } from '../../api/student-performance.api';
import { TaxonomyPerformanceSummary } from '@study-karnataka/shared-types';

export const CategoryPerformanceDetailPage: React.FC = () => {
  const { id: categoryId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState<TaxonomyPerformanceSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryId) loadDetail();
  }, [categoryId]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await StudentPerformanceApi.getCategoryDetail(categoryId!);
      setSubcategories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load category detail');
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
          Subcategory Performance Breakdown
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Detailed subcategory metrics and practice status for this subject category.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading subcategories...</div>
      ) : subcategories.length === 0 ? (
        <Card style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
          No subcategory performance recorded yet. Start practicing questions in this subject!
          <div style={{ marginTop: '16px' }}>
            <Button variant="primary" size="md" onClick={() => navigate(`/practice/configure?categoryId=${categoryId}`)}>
              Practice Subject Now
            </Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {subcategories.map((sub) => (
            <Card key={sub.entityId} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge
                      label={sub.statusLabel}
                      variant={sub.status === 'STRONG' ? 'success' : sub.status === 'NEEDS_REVIEW' ? 'warning' : 'neutral'}
                    />
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{sub.entityCode}</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {sub.entityName}
                  </h3>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/practice/configure?categoryId=${sub.categoryId}&subcategoryId=${sub.entityId}`)}
                >
                  Practice Subcategory →
                </Button>
              </div>

              {/* Subcategory Metrics */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>RECENT ACCURACY</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: sub.recentAccuracy && sub.recentAccuracy >= 50 ? '#16A34A' : '#D97706' }}>
                    {sub.recentAccuracy !== null ? `${sub.recentAccuracy}%` : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>LATEST UNIQUE</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    {sub.latestUniqueAccuracy !== null ? `${sub.latestUniqueAccuracy}%` : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>UNIQUE QUESTIONS</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    {sub.uniqueQuestionCount}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>REPEATED WRONG</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: sub.repeatedWrongCount > 0 ? '#DC2626' : '#16A34A' }}>
                    {sub.repeatedWrongCount}
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
