import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PageHeader,
  Card,
  Button,
  FormField,
  Textarea,
  Badge,
  ErrorState,
  LoadingSpinner,
} from '@study-karnataka/ui';
import { StudyMaterialApi } from '../../api/study-materials.api';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Send,
  Globe,
  Search,
  History,
  FileCheck,
  RotateCcw,
} from 'lucide-react';

export const ReviewScreenPage: React.FC = () => {
  const navigate = useNavigate();
  const { studyMaterialId, language, revisionId } = useParams<{
    studyMaterialId: string;
    language: 'en' | 'kn';
    revisionId: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<any>(null);
  const [reviewEvents, setReviewEvents] = useState<any[]>([]);

  // Action Modals & Input
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [changesComment, setChangesComment] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviewDetails = async () => {
    if (!studyMaterialId || !language || !revisionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [data, events] = await Promise.all([
        StudyMaterialApi.getPreviewData(studyMaterialId, language, revisionId),
        StudyMaterialApi.getReviewEvents(studyMaterialId, language, revisionId),
      ]);
      setPreviewData(data);
      setReviewEvents(events);
    } catch (err: any) {
      setError(err.message || 'Failed to load revision details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviewDetails();
  }, [studyMaterialId, language, revisionId]);

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changesComment.trim()) {
      alert('Comment/Reason is required when requesting changes.');
      return;
    }

    setIsSubmitting(true);
    try {
      await StudyMaterialApi.requestChanges(studyMaterialId!, language!, revisionId!, changesComment.trim());
      setShowRequestChangesModal(false);
      setChangesComment('');
      loadReviewDetails();
      alert('Changes requested successfully!');
    } catch (err: any) {
      alert(`Error requesting changes: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await StudyMaterialApi.approveRevision(studyMaterialId!, language!, revisionId!, approveComment.trim() || undefined);
      setShowApproveModal(false);
      setApproveComment('');
      loadReviewDetails();
      alert('Revision approved successfully!');
    } catch (err: any) {
      alert(`Error approving revision: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this approved locale revision to live portal?')) return;
    setIsSubmitting(true);
    try {
      await StudyMaterialApi.publishRevision(studyMaterialId!, language!, revisionId!);
      loadReviewDetails();
      alert('Locale revision successfully published!');
    } catch (err: any) {
      alert(`Publication Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneNewRevision = async () => {
    try {
      setIsSubmitting(true);
      const newDraft = await StudyMaterialApi.cloneNewRevision(studyMaterialId!, language!, revisionId!);
      alert(`Cloned new DRAFT Revision #${newDraft.revisionNumber}`);
      navigate(`/study-materials/${studyMaterialId}/edit`);
    } catch (err: any) {
      alert(`Error cloning revision: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <LoadingSpinner size="lg" />
        <p style={{ marginTop: '16px', color: '#64748B' }}>Loading revision review workspace...</p>
      </div>
    );
  }
  if (error || !previewData) return <ErrorState title="Review Error" message={error || 'Revision data not found'} onRetry={loadReviewDetails} />;

  const rev = previewData.revision;
  const sm = previewData.studyMaterial;

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
      <PageHeader
        title={`Review ${language === 'kn' ? 'Kannada' : 'English'} Revision #${rev.revisionNumber}: ${rev.title}`}
        subtitle={`Material Code: ${sm.code} • Taxonomy: ${previewData.taxonomyPath}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/study-materials/review-queue')} leftIcon={<ArrowLeft size={16} />}>
            Back to Review Queue
          </Button>
        }
      />

      {/* Main Review Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Document & SEO Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} color="#D97706" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Document Content Inspection</h3>
              </div>
              <Badge label={`Rev #${rev.revisionNumber}`} variant="neutral" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Title</label>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>{rev.title}</h2>
              {rev.shortTitle && <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Short Title: {rev.shortTitle}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748B' }}>URL Slug:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#111827', marginLeft: '6px' }}>/{rev.slug}</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Revision Status:</span>
                <span style={{ fontWeight: 600, color: '#111827', marginLeft: '6px' }}>{rev.status}</span>
              </div>
            </div>

            {rev.summary && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Summary</label>
                <p style={{ fontSize: '14px', color: '#334155', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                  {rev.summary}
                </p>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Plain Text Extract Preview</label>
              <div style={{ padding: '16px', border: '1px solid #E6EAF0', borderRadius: '8px', backgroundColor: '#FFFFFF', fontSize: '14px', lineHeight: 1.6, color: '#1E293B', maxHeight: '380px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {rev.plainTextContent || 'No plain text content available.'}
              </div>
            </div>
          </Card>

          {/* SEO Audit Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
              <Search size={20} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>SEO & Search Engine Audit</h3>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E6EAF0', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#047857', fontFamily: 'monospace' }}>
                https://studykarnataka.com/{language === 'kn' ? 'kn/' : ''}study-notes/{rev.slug}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1E40AF', marginTop: '2px' }}>
                {rev.metaTitle || rev.title} | Study Karnataka
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                {rev.metaDescription || rev.summary || 'Search engine summary description...'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748B' }}>Meta Title:</span>
                <p style={{ fontWeight: 600, color: '#111827', margin: '2px 0 0 0' }}>{rev.metaTitle || 'Default Title'}</p>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Robots Directive:</span>
                <p style={{ fontWeight: 600, color: '#111827', margin: '2px 0 0 0' }}>
                  {rev.robotsIndex ? 'INDEX' : 'NOINDEX'}, {rev.robotsFollow ? 'FOLLOW' : 'NOFOLLOW'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Workflow Action Panel & Review Events History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={20} color="#059669" />
              Workflow Actions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rev.status === 'REVIEW_PENDING' && (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setShowRequestChangesModal(true)}
                    leftIcon={<AlertCircle size={16} />}
                  >
                    Request Changes
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowApproveModal(true)}
                    leftIcon={<CheckCircle size={16} />}
                  >
                    Approve Revision
                  </Button>
                </>
              )}

              {rev.status === 'APPROVED' && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handlePublish}
                  isLoading={isSubmitting}
                  leftIcon={<Send size={16} />}
                >
                  Publish Approved Revision
                </Button>
              )}

              {rev.status === 'PUBLISHED' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloneNewRevision}
                  isLoading={isSubmitting}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Clone into New DRAFT
                </Button>
              )}
            </div>
          </Card>

          {/* Review Audit Events Trail */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} color="#7C3AED" />
              Review Events History
            </h3>

            {reviewEvents.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic', margin: 0 }}>No review events logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                {reviewEvents.map((evt) => (
                  <div key={evt.id} style={{ padding: '12px', border: '1px solid #E6EAF0', borderRadius: '8px', backgroundColor: '#F8FAFC', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#111827' }}>
                      <span>{evt.action}</span>
                      <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {evt.comment && <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '4px', margin: '6px 0 0 0', border: '1px solid #E6EAF0' }}>{evt.comment}</p>}
                    <div style={{ color: '#94A3B8', marginTop: '4px', fontSize: '11px' }}>By Admin: {evt.adminUserId}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleRequestChanges} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', margin: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>Request Content Changes</h3>
            <FormField label="Reason / Editorial Feedback (Required)" required>
              <Textarea
                value={changesComment}
                onChange={(e) => setChangesComment(e.target.value)}
                rows={4}
                placeholder="Explain what changes are needed before this note can be approved..."
                required
              />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRequestChangesModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="danger" isLoading={isSubmitting}>
                Submit Changes Request
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleApprove} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', margin: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>Approve Locale Revision</h3>
            <FormField label="Editorial Comment (Optional)">
              <Textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                rows={3}
                placeholder="Optional approval notes..."
              />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowApproveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Approve Revision
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
