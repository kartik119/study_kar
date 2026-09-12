import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { StudentPracticeProgressStats, PracticeSessionSummary, WeakAreaItem } from '@study-karnataka/shared-types';

export const PracticeHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentPracticeProgressStats | null>(null);
  const [history, setHistory] = useState<PracticeSessionSummary[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, historyData, weakData, catRes] = await Promise.all([
        StudentTopicPracticeApi.getStats().catch(() => null),
        StudentTopicPracticeApi.getHistory().catch(() => []),
        StudentTopicPracticeApi.getWeakAreas().catch(() => []),
        fetch('/api/v1/admin/academic-taxonomy/categories').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      setStats(statsData);
      setHistory(historyData);
      setWeakAreas(weakData);
      setCategories(catRes.data || []);
    } catch (err: any) {
      setError('Failed to load topic practice data');
    } finally {
      setLoading(false);
    }
  };

  const activeSession = history.find((s) => s.status === 'ACTIVE');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', fontFamily: 'Inter, sans-serif' }}>
      {/* Student Top Header */}
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
              Topic Practice & Learning Engine
            </h1>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Personalized Non-Ranked Practice</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Student Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/practice/history')}>
            Practice History
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '24px' }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* Active Session Alert Banner */}
        {activeSession && (
          <div
            style={{
              backgroundColor: '#EAF3F9',
              border: '1px solid #084B7A',
              borderRadius: '12px',
              padding: '18px 24px',
              marginBottom: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Badge label="Active Session" variant="info" />
                <span style={{ fontWeight: 700, color: '#084B7A' }}>{activeSession.categoryName}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
                {activeSession.actualQuestionCount} Questions • Mode: {activeSession.selectionMode} • Progress: {activeSession.attemptedCount} / {activeSession.actualQuestionCount}
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => navigate(`/practice/session/${activeSession.id}`)}>
              Resume Practice
            </Button>
          </div>
        )}

        {/* Overview Stats Cards */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <Card>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Questions Practiced</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                {stats.totalQuestionsAttempted}
              </div>
              <div style={{ fontSize: '12px', color: '#084B7A' }}>{stats.uniqueQuestionsSeen} Unique MCQs</div>
            </Card>

            <Card>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Overall Accuracy</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: stats.accuracyPercentage >= 70 ? '#16a34a' : '#d97706', margin: '4px 0' }}>
                {stats.accuracyPercentage}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {stats.totalCorrect} Correct / {stats.totalWrong} Incorrect
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Completed Sessions</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                {stats.completedSessionsCount}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Continuous Learning</div>
            </Card>

            <Card>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Weak Topics</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: stats.weakTopicsCount > 0 ? '#dc2626' : '#16a34a', margin: '4px 0' }}>
                {stats.weakTopicsCount}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Dynamic Weakness Signal</div>
            </Card>
          </div>
        )}

        {/* Action Shortcuts */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="lg" onClick={() => navigate('/practice/configure')}>
            + Start Custom Topic Practice
          </Button>
          {weakAreas.length > 0 && (
            <Button variant="outline" size="lg" onClick={() => navigate('/practice/weak-areas')}>
              🎯 Focus Weak Areas ({weakAreas.length})
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => navigate('/practice/incorrect')}>
            🔄 Retry Incorrect Questions
          </Button>
        </div>

        {/* Category Practice Grid */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Practice by Subject / Category
            </h2>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Choose any category to start learning</span>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading Academic Categories...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {categories.map((cat) => (
                <Card key={cat.id} title={cat.nameEn} subtitle={cat.nameKn}>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '8px 0 16px 0' }}>
                    {cat.descriptionEn || 'Comprehensive topic practice for Karnataka exams.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label={cat.code} variant="neutral" />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/practice/configure?categoryId=${cat.id}`)}
                    >
                      Practice Subject
                    </Button>
                  </div>
                </Card>
              ))}

              {categories.length === 0 && (
                <Card title="Indian Polity">
                  <p style={{ fontSize: '13px', color: '#64748B' }}>Fundamental Rights, Directive Principles & Executive</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/practice/configure')}>
                    Start Practice
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Recent Practice Sessions */}
        {history.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Recent Sessions</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/practice/history')}>
                View All History
              </Button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #DCE6EE', overflow: 'hidden' }}>
              {history.slice(0, 5).map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    padding: '16px 24px',
                    borderBottom: idx < 4 ? '1px solid #EAF3F9' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>{s.categoryName}</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      {new Date(s.startedAt).toLocaleDateString()} • Mode: {s.selectionMode} • {s.actualQuestionCount} Questions
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: s.accuracyPercentage >= 70 ? '#16a34a' : '#d97706' }}>
                        {s.accuracyPercentage}% Accuracy
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{s.correctCount} / {s.attemptedCount} Correct</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/practice/session/${s.id}/summary`)}>
                      Summary
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
