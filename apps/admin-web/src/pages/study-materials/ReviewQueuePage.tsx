import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReviewQueueItem,
  StudyMaterialLocaleRevisionStatus,
} from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  ErrorState,
  LoadingSpinner,
  Pagination,
} from '@study-karnataka/ui';
import { StudyMaterialApi } from '../../api/study-materials.api';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileCheck,
  Layers,
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'awaiting_review' | 'changes_requested' | 'approved' | 'recently_published'>('awaiting_review');
  const [language, setLanguage] = useState<'en' | 'kn' | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await StudyMaterialApi.getReviewQueue({
        search,
        tab,
        language: language || undefined,
        page,
        pageSize: 15,
      });
      setItems(res.items);
      setTotalPages(res.meta.totalPages);
      setTotalCount(res.meta.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch review queue items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [search, tab, language, page]);

  const renderStatusBadge = (status: StudyMaterialLocaleRevisionStatus) => {
    switch (status) {
      case 'REVIEW_PENDING':
        return <Badge label="Review Pending" variant="warning" />;
      case 'CHANGES_REQUESTED':
        return <Badge label="Changes Requested" variant="error" />;
      case 'APPROVED':
        return <Badge label="Approved" variant="info" />;
      case 'PUBLISHED':
        return <Badge label="Published" variant="success" />;
      default:
        return <Badge label={status} variant="neutral" />;
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
      <PageHeader
        title="Study Materials Review Queue"
        subtitle="Editorial workflow dashboard for inspecting, reviewing, requesting changes, approving, and publishing English & Kannada study content"
        actions={
          <Button variant="outline" onClick={() => navigate('/study-materials')} leftIcon={<Layers size={16} />}>
            All Content Library
          </Button>
        }
      />

      {/* Workflow Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E6EAF0', marginBottom: '20px', overflowX: 'auto', gap: '4px' }}>
        <button
          type="button"
          onClick={() => {
            setTab('awaiting_review');
            setPage(1);
          }}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: tab === 'awaiting_review' ? 600 : 500,
            borderBottom: tab === 'awaiting_review' ? '2px solid #D97706' : '2px solid transparent',
            color: tab === 'awaiting_review' ? '#D97706' : '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Clock size={16} color="#D97706" />
          <span>Awaiting Review</span>
          {tab === 'awaiting_review' && <Badge label={String(totalCount)} variant="warning" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('changes_requested');
            setPage(1);
          }}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: tab === 'changes_requested' ? 600 : 500,
            borderBottom: tab === 'changes_requested' ? '2px solid #DC2626' : '2px solid transparent',
            color: tab === 'changes_requested' ? '#DC2626' : '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} color="#DC2626" />
          <span>Changes Requested</span>
          {tab === 'changes_requested' && <Badge label={String(totalCount)} variant="error" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('approved');
            setPage(1);
          }}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: tab === 'approved' ? 600 : 500,
            borderBottom: tab === 'approved' ? '2px solid #2563EB' : '2px solid transparent',
            color: tab === 'approved' ? '#2563EB' : '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileCheck size={16} color="#2563EB" />
          <span>Approved (Ready to Publish)</span>
          {tab === 'approved' && <Badge label={String(totalCount)} variant="info" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('recently_published');
            setPage(1);
          }}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: tab === 'recently_published' ? 600 : 500,
            borderBottom: tab === 'recently_published' ? '2px solid #059669' : '2px solid transparent',
            color: tab === 'recently_published' ? '#059669' : '#64748B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} color="#059669" />
          <span>Recently Published</span>
          {tab === 'recently_published' && <Badge label={String(totalCount)} variant="success" />}
        </button>
      </div>

      {/* Filter Controls Bar */}
      <Card style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, slug, or material code..."
              />
            </div>

            <div style={{ width: '180px' }}>
              <Select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as any);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Languages' },
                  { value: 'en', label: '🇬🇧 English Only' },
                  { value: 'kn', label: '🇮🇳 Kannada Only' },
                ]}
              />
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Showing <strong>{items.length}</strong> of <strong>{totalCount}</strong> revisions
          </div>
        </div>
      </Card>

      {/* Error & Loading */}
      {error && <ErrorState title="Failed to Load Review Queue" message={error} onRetry={fetchQueue} />}

      {isLoading ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: '#64748B' }}>Fetching review queue items...</p>
        </Card>
      ) : items.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <FileCheck size={48} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>No Revisions Found</h3>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
            There are currently no locale revisions matching tab <strong>{tab}</strong>.
          </p>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6EAF0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Material & Language</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Revision Details</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Taxonomy Path</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Submitted By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>Review Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.revisionId} style={{ borderBottom: '1px solid #E6EAF0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{item.language === 'kn' ? '🇮🇳' : '🇬🇧'}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{item.code}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>/{item.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Rev #{item.revisionNumber} • {item.contentType}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569' }}>
                      {item.primaryTaxonomyPath}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                      <div>{item.submittedBy}</div>
                      <div style={{ color: '#94A3B8', fontSize: '11px' }}>{new Date(item.submittedAt).toLocaleDateString()}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>{renderStatusBadge(item.status)}</td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/study-materials/${item.studyMaterialId}/locales/${item.language}/revisions/${item.revisionId}/review`)}
                        leftIcon={<Eye size={14} />}
                      >
                        Review & Publish
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: '16px', borderTop: '1px solid #E6EAF0' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
