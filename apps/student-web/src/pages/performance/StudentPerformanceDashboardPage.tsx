import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentPerformanceApi } from '../../api/student-performance.api';
import {
  StudentPerformanceOverview,
  TaxonomyPerformanceSummary,
  PerformanceRecommendationItem,
  PerformanceTimeframe,
} from '@study-karnataka/shared-types';

export const StudentPerformanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<StudentPerformanceOverview | null>(null);
  const [categories, setCategories] = useState<TaxonomyPerformanceSummary[]>([]);
  const [weakAreas, setWeakAreas] = useState<TaxonomyPerformanceSummary[]>([]);
  const [strongAreas, setStrongAreas] = useState<TaxonomyPerformanceSummary[]>([]);
  const [recommendations, setRecommendations] = useState<PerformanceRecommendationItem[]>([]);

  const [timeframe, setTimeframe] = useState<PerformanceTimeframe>('30D');
  const [sourceType, setSourceType] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [timeframe, sourceType]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, catData, weakData, strongData, recData] = await Promise.all([
        StudentPerformanceApi.getOverview(timeframe, sourceType),
        StudentPerformanceApi.getCategories(),
        StudentPerformanceApi.getWeakAreas(),
        StudentPerformanceApi.getStrongAreas(),
        StudentPerformanceApi.getRecommendations(),
      ]);

      setOverview(ovData);
      setCategories(catData);
      setWeakAreas(weakData);
      setStrongAreas(strongData);
      setRecommendations(recData);
    } catch (err: any) {
      setError(err.message || 'Failed to load performance analytics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'STRONG': return 'success';
      case 'NEEDS_REVIEW': return 'warning';
      case 'DEVELOPING': return 'info';
      case 'NEEDS_MORE_DATA': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1150px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Your Performance & Learning Intelligence
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            Unified analytics across Ranked Tests and Topic Practice sessions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', backgroundColor: '#E2E8F0', borderRadius: '6px', padding: '2px' }}>
            {(['7D', '30D', '90D', 'ALL_TIME'] as PerformanceTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: timeframe === tf ? '#FFFFFF' : 'transparent',
                  color: timeframe === tf ? '#084B7A' : '#475569',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: timeframe === tf ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tf === 'ALL_TIME' ? 'All Time' : tf}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Sources</option>
            <option value="RANKED_TEST">Ranked Tests Only</option>
            <option value="PRACTICE">Topic Practice Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading performance dashboard...</div>
      ) : overview && overview.totalAnswered === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Start practicing to build your performance insights
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px 0' }}>
            Complete topic practice sessions or ranked tests to generate personalized weak area insights and trends.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/practice')}>
            Start Topic Practice
          </Button>
        </Card>
      ) : (
        <>
          {/* Overview Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Questions Answered</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                {overview?.totalAnswered || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {overview?.uniqueQuestionsSeen || 0} Unique Questions
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Overall Accuracy</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: overview?.overallAccuracy && overview.overallAccuracy >= 50 ? '#16A34A' : '#D97706', margin: '4px 0' }}>
                {overview?.overallAccuracy !== null ? `${overview?.overallAccuracy}%` : '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Attempted accuracy
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Ranked vs Practice</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Ranked</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#084B7A' }}>
                    {overview?.rankedAccuracy !== null ? `${overview?.rankedAccuracy}%` : '—'}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Practice</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>
                    {overview?.practiceAccuracy !== null ? `${overview?.practiceAccuracy}%` : '—'}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Subject Status</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '12px' }}>
                  {overview?.needsReviewCount || 0} Review
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 700, fontSize: '12px' }}>
                  {overview?.strongCount || 0} Strong
                </span>
              </div>
            </Card>
          </div>

          {/* Recommendations Section */}
          {recommendations.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Recommended Practice Actions
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {recommendations.map((rec) => (
                  <Card key={rec.id} style={{ borderLeft: '4px solid #084B7A' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                      {rec.description}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px' }}>
                      <strong>Reason:</strong> {rec.reason}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!rec.isAvailable}
                      onClick={() => {
                        if (rec.type === 'RETRY_INCORRECT') {
                          navigate('/practice/configure?selectionMode=INCORRECT_RETRY');
                        } else if (rec.categoryId) {
                          navigate(`/practice/configure?categoryId=${rec.categoryId}&selectionMode=WEAK_AREA`);
                        } else {
                          navigate('/practice');
                        }
                      }}
                    >
                      {rec.isAvailable ? 'Practice Now →' : 'Content Unavailable'}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Subject Performance Grid */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                Performance by Subject Category
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {categories.map((cat) => (
                <Card key={cat.entityId} style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>
                      {cat.entityName}
                    </div>
                    <Badge label={cat.statusLabel} variant={getStatusBadgeVariant(cat.status)} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 12px 0' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>RECENT ACCURACY</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: cat.recentAccuracy && cat.recentAccuracy >= 50 ? '#16A34A' : '#D97706' }}>
                        {cat.recentAccuracy !== null ? `${cat.recentAccuracy}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>UNIQUE QUESTIONS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>
                        {cat.uniqueQuestionCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>TOTAL ANSWERED</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>
                        {cat.answeredEvents}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/performance/category/${cat.entityId}`)}>
                      Subcategory Details →
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/practice/configure?categoryId=${cat.entityId}`)}
                    >
                      Practice
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Links Footer Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <Card style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#92400E', marginBottom: '4px' }}>
                ⚠️ Needs Review Areas ({weakAreas.length})
              </div>
              <p style={{ fontSize: '13px', color: '#78350F', margin: '0 0 12px 0' }}>
                Topics requiring dedicated practice based on accuracy below 50% or repeated wrong questions.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/performance/weak-areas')}>
                View Weak Areas →
              </Button>
            </Card>

            <Card style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#166534', marginBottom: '4px' }}>
                🌟 Strong Areas ({strongAreas.length})
              </div>
              <p style={{ fontSize: '13px', color: '#14532D', margin: '0 0 12px 0' }}>
                Topics where your accuracy is at least 80% with 10+ unique questions mastered.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/performance/questions/frequently-wrong')}>
                View Question History →
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
