import React, { useEffect, useState } from 'react';
import { Card, EmptyState, Button, Table, Badge, PageHeader, LoadingSpinner, DropdownMenu, IconButton } from '@study-karnataka/ui';
import { Plus, Trash2, BookOpen, MoreVertical, Eye, Edit2, X, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quickRevisionApi } from '../../services/quickRevisionApi';

interface RevisionCard {
  id: string;
  titleEn: string;
  titleKn?: string;
  slug: string;
  priority?: string;
  contentEn?: any;
  contentKn?: any;
  imageEn?: string;
  imageKn?: string;
  category?: {
    id: string;
    nameEn: string;
    nameKn: string;
    code: string;
    subcategories?: { id: string; nameEn: string; nameKn: string; code: string }[];
  };
  subcategory?: { id: string; nameEn: string; nameKn: string; code: string };
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
}

function renderTiptapContent(doc: any): string {
  if (!doc) return '<p style="color: #94a3b8; font-style: italic;">No content provided.</p>';
  if (typeof doc === 'string') return doc;
  if (!doc.content || !Array.isArray(doc.content)) return '';

  const renderNode = (node: any): string => {
    if (!node) return '';
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        node.marks.forEach((m: any) => {
          if (m.type === 'bold') text = `<strong>${text}</strong>`;
          if (m.type === 'italic') text = `<em>${text}</em>`;
          if (m.type === 'underline') text = `<u>${text}</u>`;
        });
      }
      return text;
    }
    const children = (node.content || []).map(renderNode).join('');
    switch (node.type) {
      case 'paragraph': return `<p style="margin-bottom: 8px;">${children || '&nbsp;'}</p>`;
      case 'heading': {
        const level = node.attrs?.level || 2;
        return `<h${level} style="font-weight: 700; margin: 12px 0 6px 0;">${children}</h${level}>`;
      }
      case 'bulletList': return `<ul style="padding-left: 20px; margin-bottom: 8px;">${children}</ul>`;
      case 'orderedList': return `<ol style="padding-left: 20px; margin-bottom: 8px;">${children}</ol>`;
      case 'listItem': return `<li style="margin-bottom: 4px;">${children}</li>`;
      case 'blockquote': return `<blockquote style="border-left: 3px solid #cbd5e1; padding-left: 12px; margin: 8px 0; color: #64748b;">${children}</blockquote>`;
      default: return children;
    }
  };

  return doc.content.map(renderNode).join('');
}

export const RevisionLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<RevisionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCard, setPreviewCard] = useState<RevisionCard | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'kn' | 'split'>('en');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await quickRevisionApi.getCards({ pageSize: 50 });
      if (res?.success) {
        setCards(res.data?.items || []);
      }
    } catch (err) {
      console.error('Error fetching cards', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await quickRevisionApi.deleteCard(id);
      fetchCards();
    } catch (err: any) {
      alert(err.message || 'Failed to delete card');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <Badge label="Published" variant="success" />;
      case 'DRAFT': return <Badge label="Draft" variant="neutral" />;
      case 'IN_REVIEW': return <Badge label="In Review" variant="warning" />;
      default: return <Badge label={status} variant="neutral" />;
    }
  };

  const headers = ['Card Title', 'Category & Subcategory', 'Language', 'Status', 'Date Added', 'Actions'];
  const rows = cards.map(c => [
    <div key={`title-${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {(c.imageEn || c.imageKn) ? (
        <img 
          src={c.imageEn || c.imageKn} 
          alt="thumbnail" 
          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} 
        />
      ) : (
        <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={18} color="#94a3b8" />
        </div>
      )}
      <div>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.titleEn}</div>
        {c.titleKn && <div style={{ fontSize: '12px', color: '#64748b' }}>{c.titleKn}</div>}
      </div>
    </div>,
    <div key={`cat-${c.id}`}>
      {c.category ? (
        <DropdownMenu
          align="left"
          direction="auto"
          trigger={
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#93C5FD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
              title="Click to view subcategories"
            >
              <span>📁</span>
              <span>{c.category.nameEn}</span>
              {c.category.subcategories && c.category.subcategories.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: '#E2E8F0',
                    color: '#475569',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                  title={`${c.category.subcategories.length} subcategories`}
                >
                  {c.category.subcategories.length}
                </span>
              )}
              <ChevronDown size={14} color="#64748B" />
            </button>
          }
          items={
            (c.category.subcategories && c.category.subcategories.length > 0)
              ? c.category.subcategories.map(sub => {
                  const isAssigned = sub.id === c.subcategory?.id || sub.nameEn === c.subcategory?.nameEn;
                  return {
                    label: `${sub.nameEn}${sub.nameKn ? ` (${sub.nameKn})` : ''}${isAssigned ? ' • Selected' : ''}`,
                    icon: isAssigned 
                      ? <Check size={14} color="#059669" /> 
                      : <span style={{ color: '#94A3B8', fontSize: '13px' }}>└─</span>,
                    onClick: () => {},
                  };
                })
              : c.subcategory
                ? [{
                    label: `${c.subcategory.nameEn}${c.subcategory.nameKn ? ` (${c.subcategory.nameKn})` : ''} • Selected`,
                    icon: <Check size={14} color="#059669" />,
                    onClick: () => {},
                  }]
                : [{
                    label: 'No subcategories found',
                    icon: <span style={{ color: '#94A3B8' }}>•</span>,
                    onClick: () => {},
                  }]
          }
        />
      ) : (
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Unassigned</span>
      )}
    </div>,
    <div key={`lang-${c.id}`}>
      <Badge 
        label={c.titleKn ? 'EN + KN' : 'EN Only'} 
        variant={c.titleKn ? 'info' : 'neutral'} 
      />
    </div>,
    <div key={`status-${c.id}`}>{getStatusBadge(c.status)}</div>,
    <div key={`date-${c.id}`} style={{ fontSize: '13px', color: '#64748b' }}>
      {new Date(c.createdAt).toLocaleDateString()}
    </div>,
    <div key={`actions-${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <IconButton
        ariaLabel="Preview Card"
        title="Preview Card"
        variant="outline"
        size="sm"
        icon={<Eye size={16} color="#084B7A" />}
        onClick={() => setPreviewCard(c)}
      />
      <DropdownMenu
        direction="up"
        align="right"
        trigger={
          <IconButton
            ariaLabel="More actions"
            title="More actions"
            variant="outline"
            size="sm"
            icon={<MoreVertical size={16} color="#475569" />}
          />
        }
        items={[
          {
            label: 'View Card',
            icon: <Eye size={15} color="#084B7A" />,
            onClick: () => setPreviewCard(c),
          },
          {
            label: 'Edit Card',
            icon: <Edit2 size={15} color="#2563EB" />,
            onClick: () => navigate(`/quick-revision/edit/${c.id}`),
          },
          {
            label: 'Delete Card',
            icon: <Trash2 size={15} color="#EF4444" />,
            danger: true,
            onClick: () => handleDelete(c.id, c.titleEn),
          },
        ]}
      />
    </div>
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader 
        title="Revision Library" 
        actions={
          <Button onClick={() => navigate('/quick-revision/add')} leftIcon={<Plus size={16} />}>
            Add New Card
          </Button>
        }
      />

      <Card style={{ marginTop: '20px' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            title="No Revision Cards Found"
            description="You haven't created any revision cards yet. Start by adding a new one."
            actionLabel="Add New Card"
            onAction={() => navigate('/quick-revision/add')}
          />
        ) : (
          <Table headers={headers} rows={rows} />
        )}
      </Card>

      {/* View / Preview Modal ("how it looks and that all") */}
      {previewCard && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: previewLang === 'split' ? '960px' : '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={20} color="#084B7A" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                  Revision Card Preview
                </h3>
                {getStatusBadge(previewCard.status)}
              </div>

              {/* Language Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
                  <button
                    onClick={() => setPreviewLang('en')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: previewLang === 'en' ? '#084B7A' : 'transparent',
                      color: previewLang === 'en' ? '#FFFFFF' : '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    onClick={() => setPreviewLang('kn')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: previewLang === 'kn' ? '#047857' : 'transparent',
                      color: previewLang === 'kn' ? '#FFFFFF' : '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🇮🇳 ಕನ್ನಡ
                  </button>
                  <button
                    onClick={() => setPreviewLang('split')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: previewLang === 'split' ? '#FFFFFF' : 'transparent',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: previewLang === 'split' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    50/50 Dual
                  </button>
                </div>

                <button
                  onClick={() => setPreviewCard(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} color="#64748B" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Category & Metadata Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {previewCard.category && (
                  <span style={{ fontSize: '12px', padding: '3px 10px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '12px', fontWeight: 600 }}>
                    📁 {previewCard.category.nameEn}
                  </span>
                )}
                {previewCard.subcategory && (
                  <span style={{ fontSize: '12px', padding: '3px 10px', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '12px', fontWeight: 600 }}>
                    └─ {previewCard.subcategory.nameEn}
                  </span>
                )}
                {previewCard.priority && (
                  <span style={{ fontSize: '12px', padding: '3px 10px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '12px', fontWeight: 600 }}>
                    Priority: {previewCard.priority}
                  </span>
                )}
              </div>

              {previewLang === 'split' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* English Column */}
                  <div style={{ paddingRight: '12px', borderRight: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <span>🇬🇧</span>
                      <strong style={{ fontSize: '13px', color: '#084B7A' }}>English Note</strong>
                    </div>
                    {previewCard.imageEn && (
                      <img
                        src={previewCard.imageEn}
                        alt="English Cover"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                      />
                    )}
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                      {previewCard.titleEn}
                    </h2>
                    <div
                      style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155' }}
                      dangerouslySetInnerHTML={{ __html: renderTiptapContent(previewCard.contentEn) }}
                    />
                  </div>

                  {/* Kannada Column */}
                  <div style={{ paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <span>🇮🇳</span>
                      <strong style={{ fontSize: '13px', color: '#047857' }}>ಕನ್ನಡ ಟಿಪ್ಪಣಿ</strong>
                    </div>
                    {previewCard.imageKn && (
                      <img
                        src={previewCard.imageKn}
                        alt="Kannada Cover"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                      />
                    )}
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                      {previewCard.titleKn || <span style={{ color: '#94A3B8' }}>ಕನ್ನಡ ಶೀರ್ಷಿಕೆ ಇಲ್ಲ</span>}
                    </h2>
                    <div
                      style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155' }}
                      dangerouslySetInnerHTML={{ __html: renderTiptapContent(previewCard.contentKn) }}
                    />
                  </div>
                </div>
              ) : previewLang === 'kn' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span>🇮🇳</span>
                    <strong style={{ fontSize: '13px', color: '#047857' }}>ಕನ್ನಡ ಟಿಪ್ಪಣಿ</strong>
                  </div>
                  {previewCard.imageKn && (
                    <img
                      src={previewCard.imageKn}
                      alt="Kannada Cover"
                      style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    />
                  )}
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                    {previewCard.titleKn || <span style={{ color: '#94A3B8' }}>ಕನ್ನಡ ಶೀರ್ಷಿಕೆ ಇಲ್ಲ</span>}
                  </h2>
                  <div
                    style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155' }}
                    dangerouslySetInnerHTML={{ __html: renderTiptapContent(previewCard.contentKn) }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span>🇬🇧</span>
                    <strong style={{ fontSize: '13px', color: '#084B7A' }}>English Note</strong>
                  </div>
                  {previewCard.imageEn && (
                    <img
                      src={previewCard.imageEn}
                      alt="English Cover"
                      style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', marginBottom: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    />
                  )}
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                    {previewCard.titleEn}
                  </h2>
                  <div
                    style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155' }}
                    dangerouslySetInnerHTML={{ __html: renderTiptapContent(previewCard.contentEn) }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Slug: <code>{previewCard.slug}</code>
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={() => setPreviewCard(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => {
                    const cardId = previewCard.id;
                    setPreviewCard(null);
                    navigate(`/quick-revision/edit/${cardId}`);
                  }}
                >
                  Edit Card
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
