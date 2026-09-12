import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Input, FormField } from '@study-karnataka/ui';
import { AdminPerformanceOverview } from '@study-karnataka/shared-types';

export const AdminPerformanceAnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminPerformanceOverview | null>(null);
  const [reconcileStudentId, setReconcileStudentId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    fetchAdminAnalytics();
  }, []);

  const fetchAdminAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/performance/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch admin performance analytics');
      }
      setOverview(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin performance overview');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileStudentId.trim()) return;
    setReconciling(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/performance/reconcile-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId: reconcileStudentId.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Reconciliation failed');
      }

      setMessage(`Successfully reconciled performance events and projections for student ID: ${reconcileStudentId}`);
      setReconcileStudentId('');
      fetchAdminAnalytics();
    } catch (err: any) {
      setError(err.message || 'Failed to reconcile student');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
          Student Performance & Learning Analytics (Admin)
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Aggregate academic response statistics, subject accuracy trends, and student reconciliation tools.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {message && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="success" title="Success" message={message} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading admin analytics...</div>
      ) : (
        <>
          {/* Top Aggregate Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Students</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#084B7A', margin: '4px 0' }}>
                {overview?.totalStudentsWithActivity || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Students with learning activity</div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Academic Responses</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>
                {overview?.totalAcademicResponses || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Total primary answers evaluated</div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Overall Platform Accuracy</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#16A34A', margin: '4px 0' }}>
                {overview?.overallAccuracy !== null ? `${overview?.overallAccuracy}%` : '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>All visible learning activities</div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Ranked vs Practice Split</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Ranked Acc</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#084B7A' }}>
                    {overview?.rankedAccuracy !== null ? `${overview?.rankedAccuracy}%` : '—'}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Practice Acc</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>
                    {overview?.practiceAccuracy !== null ? `${overview?.practiceAccuracy}%` : '—'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Top & Lowest Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <Card title="Top Performing Subject Categories">
              {overview?.topCategories.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No category data available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {overview?.topCategories.map((c) => (
                    <div key={c.categoryId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{c.categoryName}</span>
                      <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '14px' }}>{c.accuracy}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Lowest Accuracy Subject Categories">
              {overview?.lowestCategories.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No category data available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {overview?.lowestCategories.map((c) => (
                    <div key={c.categoryId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{c.categoryName}</span>
                      <span style={{ fontWeight: 800, color: '#DC2626', fontSize: '14px' }}>{c.accuracy}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Student Reconciliation Tool */}
          <Card title="Idempotent Student Performance Reconciliation" subtitle="Super Admin tool to rebuild performance facts & projections">
            <form onSubmit={handleReconcileStudent} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div style={{ flex: 1 }}>
                <FormField label="Student User ID" required>
                  <Input
                    type="text"
                    placeholder="Enter Student UUID"
                    value={reconcileStudentId}
                    onChange={(e) => setReconcileStudentId(e.target.value)}
                    required
                  />
                </FormField>
              </div>
              <Button type="submit" variant="primary" size="md" disabled={reconciling}>
                {reconciling ? 'Reconciling...' : 'Reconcile Performance'}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
};
