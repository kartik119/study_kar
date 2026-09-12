import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestSeriesResponse, TestSeriesWorkflowStatus, TestSeriesReleaseMode, SeriesQuestionReusePolicy, TestAccessClassification } from '@study-karnataka/shared-types';
import { TestSeriesApi } from '../../api/test-series.api';
import { MoreVertical, Edit2, Send, Globe, CheckCircle, Edit3, RotateCw, Archive, Trash2 } from 'lucide-react';

export const TestSeriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState<TestSeriesResponse[]>([]);
  const [examProgrammes, setExamProgrammes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [examProgrammeId, setExamProgrammeId] = useState('');
  const [status, setStatus] = useState<string>('');
  const [accessClassification, setAccessClassification] = useState<string>('');
  const [releaseMode, setReleaseMode] = useState<string>('');
  const [questionReusePolicy, setQuestionReusePolicy] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadExamProgrammes();
  }, []);

  useEffect(() => {
    loadTestSeries();
  }, [search, examProgrammeId, status, accessClassification, releaseMode, questionReusePolicy, page]);

  const loadExamProgrammes = async () => {
    try {
      const data = await TestSeriesApi.getExamProgrammes();
      setExamProgrammes(data);
    } catch (err: any) {
      console.error('Failed to load exam programmes', err);
    }
  };

  
  const handleWorkflowAction = async (id: string, action: string) => {
    try {
      if (action === 'submit') {
        // Not implemented in API yet, skipping
      } else if (action === 'approve') {
        await TestSeriesApi.approveSeries(id);
      } else if (action === 'publish') {
        await TestSeriesApi.publishSeries(id);
      } else if (action === 'request-changes') {
        // Not implemented in API yet
      } else if (action === 'archive') {
        await TestSeriesApi.archiveSeries(id);
      } else if (action === 'reopen') {
        await TestSeriesApi.reopenSeries(id);
      } else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this test series?')) return;
        await TestSeriesApi.deleteSeries(id);
      }
      loadTestSeries();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const loadTestSeries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await TestSeriesApi.getTestSeriesList({
        search: search || undefined,
        examProgrammeId: examProgrammeId || undefined,
        status: (status as TestSeriesWorkflowStatus) || undefined,
        accessClassification: (accessClassification as TestAccessClassification) || undefined,
        releaseMode: (releaseMode as TestSeriesReleaseMode) || undefined,
        questionReusePolicy: (questionReusePolicy as SeriesQuestionReusePolicy) || undefined,
        page,
        pageSize: 10,
      });
      setSeriesList(result.items);
      setTotalPages(result.meta.totalPages || 1);
      setTotalCount(result.meta.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load test series');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (st: TestSeriesWorkflowStatus) => {
    switch (st) {
      case 'DRAFT': return { backgroundColor: '#F1F5F9', color: '#334155', borderColor: '#CBD5E1' };
      case 'REVIEW_PENDING': return { backgroundColor: '#FFFBEB', color: '#92400E', borderColor: '#FCD34D' };
      case 'CHANGES_REQUESTED': return { backgroundColor: '#FEF2F2', color: '#991B1B', borderColor: '#FCA5A5' };
      case 'APPROVED': return { backgroundColor: '#F0F9FF', color: '#075985', borderColor: '#7DD3FC' };
      case 'PUBLISHED': return { backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#6EE7B7' };
      case 'ARCHIVED': return { backgroundColor: '#F3F4F6', color: '#4B5563', borderColor: '#D1D5DB' };
      default: return { backgroundColor: '#F1F5F9', color: '#334155', borderColor: '#CBD5E1' };
    }
  };

  const draftCount = seriesList.filter((s) => s.status === 'DRAFT').length;
  const publishedCount = seriesList.filter((s) => s.status === 'PUBLISHED').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid #DCE6EE', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Test Series Management</h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>Organize bilingual Tests into structured exam preparation series.</p>
        </div>
        <button
          onClick={() => navigate('/mcq-library/test-series/new')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', backgroundColor: '#084B7A', color: 'white', fontWeight: 500, fontSize: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
        >
          + Create Test Series
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Series', value: totalCount, color: '#111827' },
          { label: 'Draft', value: draftCount, color: '#084B7A' },
          { label: 'Published', value: publishedCount, color: '#059669' },
          { label: 'Tests Assigned', value: seriesList.reduce((acc, curr) => acc + curr.totalTests, 0), color: '#111827' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search Series Code or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
          />
          <select
            value={examProgrammeId}
            onChange={(e) => setExamProgrammeId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }}
          >
            <option value="">All Exam Programmes</option>
            {examProgrammes.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.nameEn} ({cycle.code})
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW_PENDING">Review Pending</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            value={accessClassification}
            onChange={(e) => setAccessClassification(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }}
          >
            <option value="">All Access Types</option>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
            <option value="FREEMIUM">Freemium</option>
          </select>
          <select
            value={releaseMode}
            onChange={(e) => setReleaseMode(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }}
          >
            <option value="">All Release Modes</option>
            <option value="ALL_AVAILABLE">All Available</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="SEQUENTIAL">Sequential</option>
          </select>
          <select
            value={questionReusePolicy}
            onChange={(e) => setQuestionReusePolicy(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #DCE6EE', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }}
          >
            <option value="">All Question Policies</option>
            <option value="NO_REPEAT">No Repeat</option>
            <option value="ALLOW_REPEATS">Allow Repeats</option>
          </select>
        </div>
      </div>

      {/* Series Table */}
      {isLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading Test Series...</div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: '6px' }}>{error}</div>
      ) : seriesList.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>No Test Series Found</p>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Get started by creating a new bilingual Test Series container.</p>
          <button
            onClick={() => navigate('/mcq-library/test-series/new')}
            style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#084B7A', color: 'white', fontSize: '14px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer' }}
          >
            + Create Test Series
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #DCE6EE' }}>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Series Code</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Series Name</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exam Programme</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tests</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reuse Policy</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px', color: '#334155' }}>
              {seriesList.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#084B7A' }}>{s.code}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{s.titleEn}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{s.titleKn}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '12px' }}>{(s as any).examProgramme?.nameEn || s.examProgrammeId}</td>
                  <td style={{ padding: '16px', fontSize: '12px', fontWeight: 600 }}>{s.totalTests} Tests</td>
                  <td style={{ padding: '16px', fontSize: '12px' }}>{s.releaseMode}</td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid',
                        ...(s.questionReusePolicy === 'NO_REPEAT'
                          ? { backgroundColor: '#FAF5FF', color: '#7E22CE', borderColor: '#E9D5FF' }
                          : { backgroundColor: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' })
                      }}
                    >
                      {s.questionReusePolicy}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '2px 8px', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      {s.accessClassification}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, border: '1px solid', ...(getStatusStyle(s.status)) }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/mcq-library/test-series/${s.id}`)}
                        style={{ padding: '4px 12px', backgroundColor: 'white', border: '1px solid #DCE6EE', color: '#084B7A', fontSize: '12px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Manage
                      </button>
                      <TestSeriesActionMenu
                        series={s}
                        onAction={handleWorkflowAction}
                        onEdit={() => navigate(`/mcq-library/test-series/${s.id}`)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ padding: '16px', borderTop: '1px solid #DCE6EE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
            <span>
              Page {page} of {totalPages} ({totalCount} items)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ padding: '4px 12px', backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '4px 12px', backgroundColor: 'white', border: '1px solid #DCE6EE', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const TestSeriesActionMenu: React.FC<{ series: any; onAction: (id: string, action: string) => void; onEdit: () => void }> = ({ series, onAction, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More Actions"
        style={{
          border: '1px solid #E2E8F0',
          backgroundColor: isOpen ? '#F1F5F9' : '#FFFFFF',
          borderRadius: '6px',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOpen ? '#F1F5F9' : '#FFFFFF')}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '6px',
              minWidth: '200px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => { setIsOpen(false); onEdit(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                color: '#334155', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Edit2 size={15} color="#334155" />
              <span>Edit / Manage</span>
            </button>

            {(series.status === 'DRAFT' || series.status === 'CHANGES_REQUESTED') && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(series.id, 'publish'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Globe size={15} color="#059669" />
                  <span>Publish Directly</span>
                </button>
              </>
            )}

            {series.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'publish'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Globe size={15} color="#059669" />
                <span>Publish Series</span>
              </button>
            )}

            {(series.status === 'PUBLISHED' || series.status === 'APPROVED') && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'reopen'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCw size={15} color="#2563EB" />
                <span>Retake and Edit</span>
              </button>
            )}

            {series.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(series.id, 'archive'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#D97706', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Archive size={15} color="#D97706" />
                <span>Archive Series</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setIsOpen(false); onAction(series.id, 'delete'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                color: '#EF4444', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 size={15} color="#EF4444" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
