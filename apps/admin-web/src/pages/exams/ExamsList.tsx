import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Filter, Eye, Edit3, Send, CheckCircle, Globe, Archive, Lock, ListTree, Trash2, RotateCcw, MoreVertical } from 'lucide-react';
import { Button, Input, Select, Badge, Card, EmptyState } from '@study-karnataka/ui';
import { ExamCycle, ExamAuthority, ExamProgramme, PermissionKey } from '@study-karnataka/shared-types';
import { fetchExams, fetchAuthorities, fetchProgrammes, triggerWorkflowAction, deleteExam } from '../../services/examApi';

const ActionMenu: React.FC<{ 
  exam: ExamCycle; 
  hasPerm: (perm: PermissionKey) => boolean; 
  onRequestConfirm: (examId: string, action: string, message: string) => void;
}> = ({ exam, hasPerm, onRequestConfirm }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmAction = (action: string, label: string) => {
    setIsOpen(false);
    onRequestConfirm(exam.id, action, `Are you sure you want to ${label.toLowerCase()} this exam?`);
  };

  const handleConfirmDelete = () => {
    setIsOpen(false);
    onRequestConfirm(exam.id, 'DELETE', 'Are you sure you want to permanently delete this exam cycle? This action cannot be undone.');
  };

  return (
    <div className="relative inline-block text-left" style={{ position: 'relative' }}>
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
            {hasPerm('exams.submit_review') && (exam.status === 'DRAFT' || exam.status === 'CHANGES_REQUESTED') && (
              <button
                type="button"
                onClick={() => handleConfirmAction('SUBMIT_REVIEW', 'Submit for Review')}
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
            )}

            {hasPerm('exams.review') && exam.status === 'REVIEW_PENDING' && (
              <button
                type="button"
                onClick={() => handleConfirmAction('REQUEST_CHANGES', 'Request Changes for')}
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
            )}

            {hasPerm('exams.approve') && exam.status === 'REVIEW_PENDING' && (
              <button
                type="button"
                onClick={() => handleConfirmAction('APPROVE', 'Approve')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <CheckCircle size={15} color="#059669" />
                <span>Approve</span>
              </button>
            )}

            {hasPerm('exams.publish') && exam.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => handleConfirmAction('PUBLISH', 'Publish')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Globe size={15} color="#059669" />
                <span>Publish</span>
              </button>
            )}

            {hasPerm('exams.update') && (exam.status === 'PUBLISHED' || exam.status === 'APPROVED') && (
              <button
                type="button"
                onClick={() => handleConfirmAction('REOPEN', 'Take back and edit')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCcw size={15} color="#2563EB" />
                <span>Take back and edit</span>
              </button>
            )}

            {hasPerm('exams.close') && exam.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => handleConfirmAction('CLOSE', 'Close')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#475569', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Lock size={15} color="#475569" />
                <span>Close</span>
              </button>
            )}

            {hasPerm('exams.archive') && (exam.status === 'CLOSED' || exam.status === 'DRAFT') && (
              <button
                type="button"
                onClick={() => handleConfirmAction('ARCHIVE', 'Archive')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#D97706', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Archive size={15} color="#D97706" />
                <span>Archive</span>
              </button>
            )}

            {hasPerm('exams.archive') && (exam.status === 'CLOSED' || exam.status === 'ARCHIVED') && (
              <button
                type="button"
                onClick={() => handleConfirmAction('REOPEN', 'Reopen')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#0284C7', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCcw size={15} color="#0284C7" />
                <span>Reopen</span>
              </button>
            )}

            {(hasPerm('exams.update') || hasPerm('exams.create')) && (
              <>
                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }} />
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                    color: '#EF2323', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={15} color="#EF2323" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const ExamsList: React.FC = () => {
  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [authorities, setAuthorities] = useState<ExamAuthority[]>([]);
  const [programmes, setProgrammes] = useState<ExamProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom Confirm Modal State
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; action: string; examId: string; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');

  const navigate = useNavigate();

  // User permissions
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');

  const hasPerm = (perm: PermissionKey) => isSuperAdmin || userPermissions.includes(perm);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [authData, progData, examData] = await Promise.all([
        fetchAuthorities(),
        fetchProgrammes(),
        fetchExams({
          authorityId: selectedAuthority || undefined,
          programmeId: selectedProgramme || undefined,
          status: selectedStatus || undefined,
          visibility: selectedVisibility || undefined,
          search: search || undefined,
        }),
      ]);
      setAuthorities(authData);
      setProgrammes(progData);
      setExams(examData);
    } catch (err: any) {
      setError(err.message || 'Failed to load exams list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedAuthority, selectedProgramme, selectedStatus, selectedVisibility]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await triggerWorkflowAction(id, action);
      await loadData();
    } catch (err: any) {
      alert(err.message || `Failed to execute ${action}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExam(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam cycle');
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmState) return;
    
    if (confirmState.action === 'DELETE') {
      await handleDelete(confirmState.examId);
    } else {
      await handleAction(confirmState.examId, confirmState.action);
    }
    setConfirmState(null);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge label="Draft" variant="neutral" />;
      case 'REVIEW_PENDING':
        return <Badge label="Review Pending" variant="warning" />;
      case 'CHANGES_REQUESTED':
        return <Badge label="Changes Requested" variant="error" />;
      case 'APPROVED':
        return <Badge label="Approved" variant="info" />;
      case 'PUBLISHED':
        return <Badge label="Published" variant="success" />;
      case 'CLOSED':
        return <Badge label="Closed" variant="neutral" />;
      case 'ARCHIVED':
        return <Badge label="Archived" variant="neutral" />;
      default:
        return <Badge label={status} variant="neutral" />;
    }
  };

  const renderReadinessBadge = (readiness?: any) => {
    if (!readiness) return null;
    switch (readiness.state) {
      case 'BOTH_COMPLETE':
        return <Badge label="Both (EN+KN) Complete" variant="success" />;
      case 'ENGLISH_COMPLETE':
        return <Badge label="English Complete" variant="info" />;
      case 'KANNADA_COMPLETE':
        return <Badge label="Kannada Complete" variant="warning" />;
      default:
        return <Badge label="Incomplete" variant="error" />;
    }
  };

  return (
    <div style={{ padding: '8px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>All Exams</h1>
        </div>
        {hasPerm('exams.create') && (
          <Button variant="primary" onClick={() => navigate('/exams/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} /> Add Exam Cycle
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: '16px', padding: '8px 16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input
              placeholder="Search title, code, notification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ flex: '0 0 auto', width: '160px' }}>
            <Select
              value={selectedAuthority}
              onChange={(e) => setSelectedAuthority(e.target.value)}
              options={[
                { value: '', label: 'All Authorities' },
                ...authorities.map((a) => ({ value: a.id, label: `${a.code} — ${a.nameEn}` })),
              ]}
            />
          </div>

          <div style={{ flex: '0 0 auto', width: '160px' }}>
            <Select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              options={[
                { value: '', label: 'All Programmes' },
                ...programmes.map((p) => ({ value: p.id, label: `${p.code} — ${p.nameEn}` })),
              ]}
            />
          </div>

          <div style={{ flex: '0 0 auto', width: '140px' }}>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'REVIEW_PENDING', label: 'Review Pending' },
                { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'CLOSED', label: 'Closed' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </div>

          <div style={{ flex: '0 0 auto', width: '130px' }}>
            <Select
              value={selectedVisibility}
              onChange={(e) => setSelectedVisibility(e.target.value)}
              options={[
                { value: '', label: 'All Visibility' },
                { value: 'PRIVATE', label: 'Private' },
                { value: 'UNLISTED', label: 'Unlisted' },
                { value: 'PUBLIC', label: 'Public' },
              ]}
            />
          </div>

          <Button type="submit" variant="secondary" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            <Filter size={16} style={{ marginRight: '6px' }} /> Apply Search
          </Button>
        </form>
      </Card>

      {/* Content State */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          Loading exam records from database...
        </Card>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No Exam Records Found"
          description="There are currently no competitive exam cycles matching your selected filters."
          actionLabel={hasPerm('exams.create') ? 'Create First Exam' : undefined}
          onAction={hasPerm('exams.create') ? () => navigate('/exams/new') : undefined}
        />
      ) : (
        <Card style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Exam Title</th>
                <th style={{ padding: '12px 16px' }}>Authority & Programme</th>
                <th style={{ padding: '12px 16px' }}>Cycle & Year</th>
                <th style={{ padding: '12px 16px' }}>Readiness</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Visibility</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {c.logoUrl || c.programme?.authority?.logoUrl ? (
                        <img
                          src={(c.logoUrl || c.programme?.authority?.logoUrl) || ''}
                          alt="Logo"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const next = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                            if (next) next.style.display = 'flex';
                          }}
                          style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}
                        />
                      ) : null}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: '#084B7A',
                          borderRadius: '4px',
                          display: c.logoUrl || c.programme?.authority?.logoUrl ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {(c.programme?.authority?.code || c.cycleCode || 'EX').slice(0, 4)}
                      </div>
                      <Link to={`/exams/${c.id}`} style={{ textDecoration: 'none', color: '#1e293b' }}>
                        <div>{c.titleEn}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{c.titleKn}</div>
                      </Link>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{c.programme?.authority?.code || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{c.programme?.code || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div>Year: {c.cycleYear}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Code: {c.cycleCode}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{renderReadinessBadge(c.readiness)}</td>
                  <td style={{ padding: '14px 16px' }}>{renderStatusBadge(c.status)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge label={c.visibility} variant={c.visibility === 'PUBLIC' ? 'success' : c.visibility === 'UNLISTED' ? 'warning' : 'neutral'} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link to={`/exams/${c.id}`} title="View Preview">
                        <Button variant="ghost" style={{ padding: '6px' }}>
                          <Eye size={16} />
                        </Button>
                      </Link>

                      <Link to={`/exams/syllabus?examId=${c.id}`} title="View Syllabus">
                        <Button variant="ghost" style={{ padding: '6px' }}>
                          <ListTree size={16} />
                        </Button>
                      </Link>

                      {hasPerm('exams.update') && (
                        <Link to={`/exams/${c.id}/edit`} title="Edit Record">
                          <Button variant="ghost" style={{ padding: '6px' }}>
                            <Edit3 size={16} />
                          </Button>
                        </Link>
                      )}

                      {/* Workflow Actions */}
                      <ActionMenu 
                        exam={c} 
                        hasPerm={hasPerm} 
                        onRequestConfirm={(examId, action, message) => setConfirmState({ isOpen: true, action, examId, message })} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState?.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Confirm Action</h3>
            <p style={{ margin: '0 0 24px 0', color: '#475569' }}>{confirmState.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="outline" onClick={() => setConfirmState(null)}>Cancel</Button>
              <Button variant={confirmState.action === 'DELETE' ? 'danger' : 'primary'} onClick={executeConfirmAction}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
