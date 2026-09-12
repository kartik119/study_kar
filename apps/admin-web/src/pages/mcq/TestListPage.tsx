import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testApi } from '../../api/mcq-library.api';
import { MoreVertical, Edit2, Send, Edit3, CheckCircle, Globe, Archive, Trash2, RotateCw, Eye } from 'lucide-react';
import './TestListPage.css';
import { TestPreviewModal } from './TestPreviewModal';

export const TestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [previewTest, setPreviewTest] = useState<any | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await testApi.getTests({
        search,
        selectionMode: selectionMode || undefined,
        status: status || undefined,
        page,
        pageSize: 15,
      });

      setTests(res.data || []);
      if (res.meta) {
        setTotalPages((res.meta as any).totalPages || 1);
        setTotalCount((res.meta as any).total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [search, selectionMode, status, page]);

  const handleDelete = async (testId: string) => {
    if (window.confirm("Are you sure you want to delete this test? This action cannot be undone.")) {
      try {
        await testApi.deleteTest(testId);
        fetchTests();
      } catch (err: any) {
        alert(err.message || "Failed to delete test. It might be published or in use.");
      }
    }
  };

  const handleArchive = async (testId: string) => {
    if (window.confirm("Are you sure you want to archive this test? It will be unpublished and hidden from students.")) {
      try {
        await testApi.archiveTest(testId);
        fetchTests();
      } catch (err: any) {
        alert(err.message || "Failed to archive test.");
      }
    }
  };

  const handleWorkflowAction = async (testId: string, action: string) => {
    try {
      if (action === 'submit') {
        await testApi.submitForReview(testId);
      } else if (action === 'request-changes') {
        const reason = window.prompt("Reason for requesting changes:");
        if (reason === null) return;
        await testApi.requestChanges(testId, reason || 'Changes requested');
      } else if (action === 'approve') {
        await testApi.approveTest(testId);
      } else if (action === 'publish') {
        await testApi.publishTest(testId);
      } else if (action === 'reopen') {
        await testApi.reopenTest(testId);
      } else if (action === 'archive') {
        return handleArchive(testId);
      } else if (action === 'delete') {
        return handleDelete(testId);
      }
      fetchTests();
    } catch (err: any) {
      alert(err.message || `Failed to perform action: ${action}`);
    }
  };

  return (
    <div className="test-list-page" data-testid="test-list-page">
      <div className="test-list-header">
        <div>
          <h1>Mock Tests & Assessment Library</h1>
          <p>Create, auto-generate, review, and publish bilingual mock tests using approved canonical MCQs.</p>
        </div>
        <div className="test-list-actions">
          <button
            className="btn-primary"
            onClick={() => navigate('/mcq-library/tests/new')}
            data-testid="create-test-btn"
          >
            + Create New Test
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="test-filters-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Search by Test Code or Title (EN / KN)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          data-testid="test-search-input"
        />

        <select
          className="filter-select"
          value={selectionMode}
          onChange={(e) => {
            setSelectionMode(e.target.value);
            setPage(1);
          }}
          data-testid="mode-filter-select"
        >
          <option value="">All Selection Modes</option>
          <option value="MANUAL">Manual</option>
          <option value="AUTOMATIC">Automatic</option>
        </select>

        <select
          className="filter-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          data-testid="status-filter-select"
        >
          <option value="">All Workflow Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="REVIEW_PENDING">Review Pending</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="test-table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading mock tests...</div>
        ) : tests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            No mock tests found matching criteria. Click <strong>+ Create New Test</strong> to start authoring.
          </div>
        ) : (
          <table className="test-table" data-testid="test-list-table">
            <thead>
              <tr>
                <th>Test Code</th>
                <th>Title</th>
                <th>Exam Context</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Marks</th>
                <th>Selection Mode</th>
                <th>Workflow Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} data-testid={`test-row-${test.id}`}>
                  <td style={{ maxWidth: '160px', wordBreak: 'break-all' }}>
                    <span className="test-code-badge">{test.code}</span>
                  </td>
                  <td style={{ minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', lineHeight: '1.4' }}>{test.titleEn}</div>
                    <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4', marginTop: '2px' }}>{test.titleKn}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      {test.examCycle?.titleEn || 'General Academic'}
                    </div>
                    {test.examStage && (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {test.examStage.nameEn} {test.examPaper ? `› ${test.examPaper.nameEn}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{test.selectedCount || 0}</strong> / {test.totalQuestions}
                  </td>
                  <td>{test.durationMinutes} min</td>
                  <td>{test.totalMarks}</td>
                  <td>
                    <span className={`mode-tag ${test.selectionMode}`}>{test.selectionMode}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${test.status}`}>{test.status.replace('_', ' ')}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        title="Preview Test"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B', display: 'flex', alignItems: 'center' }}
                        onClick={() => setPreviewTest(test)}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                        onClick={() => navigate(`/mcq-library/tests/${test.id}/edit`)}
                        data-testid={`edit-test-${test.id}`}
                      >
                        Manage
                      </button>
                      <TestActionMenu
                        test={test}
                        onAction={handleWorkflowAction}
                        onEdit={() => navigate(`/mcq-library/tests/${test.id}/edit`)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination-container">
          <div className="pagination-info">
            Showing {tests.length} of {totalCount} tests (Page {page} of {totalPages})
          </div>
          <div className="pagination-buttons">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      {previewTest && (
        <TestPreviewModal test={previewTest} onClose={() => setPreviewTest(null)} />
      )}
    </div>
  );
};

const TestActionMenu: React.FC<{ test: any; onAction: (id: string, action: string) => void; onEdit: () => void }> = ({ test, onAction, onEdit }) => {
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
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <MoreVertical size={16} color="#475569" />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setIsOpen(false)}
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
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              minWidth: '180px',
              zIndex: 50,
              padding: '4px',
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
                color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Edit2 size={15} color="#2563EB" />
              <span>Edit Content</span>
            </button>

            {(test.status === 'DRAFT' || test.status === 'CHANGES_REQUESTED') && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(test.id, 'submit'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Send size={15} color="#2563EB" />
                  <span>Submit for Review</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(test.id, 'publish'); }}
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

            {test.status === 'REVIEW_PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(test.id, 'approve'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <CheckCircle size={15} color="#059669" />
                  <span>Approve Test</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onAction(test.id, 'request-changes'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#D97706', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Edit3 size={15} color="#D97706" />
                  <span>Request Changes</span>
                </button>
              </>
            )}

            {test.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(test.id, 'publish'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Globe size={15} color="#059669" />
                <span>Publish Test</span>
              </button>
            )}

            {(test.status === 'PUBLISHED' || test.status === 'APPROVED') && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(test.id, 'reopen'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCw size={15} color="#2563EB" />
                <span>Take back and edit</span>
              </button>
            )}

            {test.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(test.id, 'archive'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#D97706', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Archive size={15} color="#D97706" />
                <span>Archive Test</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setIsOpen(false); onAction(test.id, 'delete'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                color: '#EF4444', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 size={15} color="#EF4444" />
              <span>{test.status === 'DRAFT' ? 'Delete Draft' : 'Delete Test'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TestListPage;
