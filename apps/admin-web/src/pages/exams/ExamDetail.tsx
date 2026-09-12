import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Globe, ExternalLink, CheckCircle, Send, BookOpen } from 'lucide-react';
import { Button, Card, Badge } from '@study-karnataka/ui';
import { ExamCycle, PermissionKey } from '@study-karnataka/shared-types';
import { fetchExamById, triggerWorkflowAction } from '../../services/examApi';

export const ExamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'kn'>('en');

  // User permissions
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');

  const hasPerm = (perm: PermissionKey) => isSuperAdmin || userPermissions.includes(perm);

  const loadExam = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchExamById(id);
      setExam(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [id]);

  const handleAction = async (action: string) => {
    if (!id) return;
    try {
      await triggerWorkflowAction(id, action);
      await loadExam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading exam details...</div>;
  }

  if (error || !exam) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Error Loading Exam</h2>
        <p style={{ color: '#64748b' }}>{error || 'Exam not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/exams')}>Back to All Exams</Button>
      </div>
    );
  }

  const isKn = previewLang === 'kn';
  const displayTitle = isKn ? exam.titleKn || exam.titleEn : exam.titleEn;
  const displayDesc = isKn ? exam.descriptionKn || exam.descriptionEn : exam.descriptionEn;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back button and actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button variant="ghost" onClick={() => navigate('/exams')}>
            <ArrowLeft size={18} />
          </Button>
          {(exam.logoUrl || exam.programme?.authority?.logoUrl) && (
            <div style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={(exam.logoUrl || exam.programme?.authority?.logoUrl) || ''} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {exam.programme?.authority?.code} • {exam.programme?.code} ({exam.cycleYear})
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 0 0' }}>{displayTitle}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Language Switcher */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setPreviewLang('en')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                background: previewLang === 'en' ? '#ffffff' : 'transparent',
                fontWeight: previewLang === 'en' ? 600 : 400,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              English
            </button>
            <button
              onClick={() => setPreviewLang('kn')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                background: previewLang === 'kn' ? '#ffffff' : 'transparent',
                fontWeight: previewLang === 'kn' ? 600 : 400,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ಕನ್ನಡ
            </button>
          </div>

          <Link to={`/exams/${exam.id}/syllabus`}>
            <Button variant="primary">
              <BookOpen size={16} style={{ marginRight: '6px' }} /> Exam Syllabus
            </Button>
          </Link>

          {hasPerm('exams.update') && (
            <Link to={`/exams/${exam.id}/edit`}>
              <Button variant="outline">
                <Edit3 size={16} style={{ marginRight: '6px' }} /> Edit Exam
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Badges Bar */}
      <Card style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Status</span>
          <Badge label={exam.status} variant={exam.status === 'PUBLISHED' ? 'success' : exam.status === 'APPROVED' ? 'info' : 'warning'} />
        </div>

        <div>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Visibility</span>
          <Badge label={exam.visibility} variant={exam.visibility === 'PUBLIC' ? 'success' : 'neutral'} />
        </div>

        <div>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Bilingual Readiness</span>
          <Badge label={exam.readiness?.state || 'INCOMPLETE'} variant={exam.readiness?.state === 'BOTH_COMPLETE' ? 'success' : 'error'} />
        </div>

        {/* Workflow buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {hasPerm('exams.submit_review') && (exam.status === 'DRAFT' || exam.status === 'CHANGES_REQUESTED') && (
            <Button variant="primary" onClick={() => handleAction('SUBMIT_REVIEW')}>
              <Send size={16} style={{ marginRight: '6px' }} /> Submit for Review
            </Button>
          )}

          {hasPerm('exams.review') && exam.status === 'REVIEW_PENDING' && (
            <Button variant="outline" style={{ color: '#dc2626' }} onClick={() => handleAction('REQUEST_CHANGES')}>
              Request Changes
            </Button>
          )}

          {hasPerm('exams.approve') && exam.status === 'REVIEW_PENDING' && (
            <Button variant="outline" style={{ color: '#16a34a' }} onClick={() => handleAction('APPROVE')}>
              <CheckCircle size={16} style={{ marginRight: '6px' }} /> Approve
            </Button>
          )}

          {hasPerm('exams.publish') && exam.status === 'APPROVED' && (
            <Button variant="primary" onClick={() => handleAction('PUBLISH')}>
              <Globe size={16} style={{ marginRight: '6px' }} /> Publish Record
            </Button>
          )}
        </div>
      </Card>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Overview Card */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Exam Overview ({previewLang.toUpperCase()})</h3>
            <p style={{ color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {displayDesc || 'No description provided.'}
            </p>
          </Card>

          {/* Exam Pattern & Stages Summary Card */}
          <Card style={{ padding: '24px', border: '1px solid #fde68a', background: '#fffbeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#78350f' }}>Exam Pattern & Academic Stages</h3>
                <span style={{ fontSize: '12px', color: '#92400e' }}>Configured stages, papers, and mark rollups</span>
              </div>
              <Link
                to={`/exams/${exam.id}/pattern`}
                style={{
                  padding: '8px 16px',
                  background: '#084B7A',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Open Pattern Builder →
              </Link>
            </div>

            {(exam as any).patterns && (exam as any).patterns.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>REVISION</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#78350f' }}>Rev {(exam as any).patterns[0].revisionNumber}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>STAGES</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#78350f' }}>{(exam as any).patterns[0].stages?.length || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>TOTAL MARKS</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#084B7A' }}>{(exam as any).patterns[0].totals?.totalMarks || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>STATUS</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#78350f', marginTop: '2px' }}>{(exam as any).patterns[0].status}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#92400e' }}>
                No exam pattern configured for this cycle. Click <strong>Open Pattern Builder</strong> to initialize Revision 1.
              </div>
            )}
          </Card>

          {/* Eligibility Card */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Eligibility Criteria</h3>
            {exam.eligibility ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div>
                  <strong>Min Age:</strong> {exam.eligibility.minimumAge || '—'}
                </div>
                <div>
                  <strong>Max Age:</strong> {exam.eligibility.maximumAge || '—'}
                </div>
                <div>
                  <strong>Education:</strong> {isKn ? exam.eligibility.minimumEducationKn || exam.eligibility.minimumEducationEn : exam.eligibility.minimumEducationEn || '—'}
                </div>
                <div>
                  <strong>Nationality:</strong> {isKn ? exam.eligibility.nationalityRequirementKn || exam.eligibility.nationalityRequirementEn : exam.eligibility.nationalityRequirementEn || '—'}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No specific eligibility criteria specified.</p>
            )}
          </Card>

          {/* Important Dates */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Important Event Dates</h3>
            {exam.importantDates && exam.importantDates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exam.importantDates.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>{isKn ? d.labelKn : d.labelEn}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Type: {d.type} {d.isTentative ? '(Tentative)' : ''}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {new Date(d.startAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No event dates added.</p>
            )}
          </Card>
        </div>

        {/* Sidebar Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Metadata Card */}
          <Card style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Record Metadata</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#475569' }}>
              <div><strong>Notification No:</strong> {exam.notificationNumber || '—'}</div>
              <div><strong>Cycle Year:</strong> {exam.cycleYear}</div>
              <div><strong>Cycle Code:</strong> {exam.cycleCode}</div>
              <div><strong>Version:</strong> v{exam.version}</div>
              <div><strong>Created:</strong> {new Date(exam.createdAt).toLocaleDateString()}</div>
              <div><strong>Last Updated:</strong> {new Date(exam.updatedAt).toLocaleDateString()}</div>
            </div>
          </Card>

          {/* Official Links */}
          <Card style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Official Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {exam.officialNotificationUrl && (
                <a href={exam.officialNotificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#084B7A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <ExternalLink size={14} /> Official Notification PDF
                </a>
              )}
              {exam.applicationUrl && (
                <a href={exam.applicationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#084B7A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <ExternalLink size={14} /> Application Portal
                </a>
              )}
              {(!exam.officialNotificationUrl && !exam.applicationUrl) && (
                <span style={{ color: '#64748b', fontSize: '13px' }}>No official links attached.</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
