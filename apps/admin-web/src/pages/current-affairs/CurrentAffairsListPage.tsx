import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Tabs,
  SearchInput,
  Select,
  Button,
  Table,
  Pagination,
  StatusBadge,
  DropdownMenu,
  IconButton
} from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';
import { X, Eye } from 'lucide-react';

export const CurrentAffairsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [articles, setArticles] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);

  const [previewArticle, setPreviewArticle] = useState<any | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'kn' | 'split'>('split');

  useEffect(() => {
    currentAffairsApi.getCategories().then((res) => {
      setCategories(res.data || []);
    });
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params: any = { page: currentPage, pageSize: 10 };
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (activeTab !== 'all') {
        if (activeTab === 'published') params.status = 'PUBLISHED';
        if (activeTab === 'drafts') params.status = 'DRAFT';
        if (activeTab === 'trash') params.status = 'TRASH';
      }

      const res = await currentAffairsApi.list(params);
      setArticles(res.data || []);
      setTotalItems(res.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch current affairs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [currentPage, search, categoryFilter, statusFilter, activeTab]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to move this article to trash?')) {
      await currentAffairsApi.softDelete(id);
      fetchArticles();
    }
  };

  const handleDuplicate = async (id: string) => {
    if (window.confirm('Are you sure you want to duplicate this article?')) {
      await currentAffairsApi.duplicate(id);
      fetchArticles();
    }
  };

  const handlePublish = async (id: string) => {
    if (window.confirm('Are you sure you want to publish this article?')) {
      await currentAffairsApi.publish(id);
      fetchArticles();
    }
  };

  const handleRevertToDraft = async (id: string) => {
    if (window.confirm('Are you sure you want to revert this article to draft?')) {
      await currentAffairsApi.update(id, { status: 'DRAFT' });
      fetchArticles();
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await currentAffairsApi.getById(id);
      setPreviewArticle(res.data);
      setPreviewLang('split');
    } catch (e) {
      alert('Failed to load preview');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <StatusBadge status="ACTIVE" label="Published" />;
      case 'DRAFT': return <StatusBadge status="INACTIVE" label="Draft" />;
      case 'TRASH': return <StatusBadge status="SUSPENDED" label="Trash" />;
      default: return <StatusBadge status={status} />;
    }
  };

  const tableHeaders = [
    <input type="checkbox" key="all" />,
    'Article',
    'Category',
    'Source',
    'Published Date',
    'Status',
    'Actions'
  ];

  const totalPages = Math.max(1, Math.ceil(totalItems / 10));

  const tableRows = articles.map(article => {
    const actionItems = [
      { label: 'Preview', onClick: () => handlePreview(article.id) },
      { label: 'Edit Article', onClick: () => navigate(`/current-affairs/${article.id}/edit`) }
    ];
    
    if (article.status === 'DRAFT') {
      actionItems.push({ label: 'Publish', onClick: () => handlePublish(article.id) });
    }
    
    if (article.status === 'PUBLISHED') {
      actionItems.push({ label: 'Revert to Draft', onClick: () => handleRevertToDraft(article.id) });
    }
    
    actionItems.push({ label: 'Duplicate', onClick: () => handleDuplicate(article.id) });
    actionItems.push({ label: 'Move to Trash', onClick: () => handleDelete(article.id), danger: true });

    return [
      <input type="checkbox" key={article.id} />,
      <div key="article">
        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px', cursor: 'pointer' }} onClick={() => navigate(`/current-affairs/${article.id}/edit`)}>
          {article.titleEn}
        </div>
        <div style={{ fontSize: '12px', color: '#64748B' }}>{article.titleKn}</div>
      </div>,
      <div key="category">{article.category?.nameEn || '-'}</div>,
      <div key="source">{article.source?.name || '-'}</div>,
      <div key="date">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '-'}</div>,
      getStatusBadge(article.status),
      <div key="actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <IconButton 
          ariaLabel="Preview" 
          icon={<Eye size={16} />} 
          size="sm" 
          onClick={() => handlePreview(article.id)}
        />
        <IconButton 
          ariaLabel="Edit" 
          icon={<span style={{fontSize: '16px'}}>✏️</span>} 
          size="sm" 
          onClick={() => navigate(`/current-affairs/${article.id}/edit`)}
        />
        <DropdownMenu 
          trigger={<IconButton ariaLabel="More" icon={<span style={{fontSize: '16px'}}>⋮</span>} size="sm" />}
          items={actionItems as any}
        />
      </div>
    ];
  });

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Current Affairs"
        subtitle="Manage daily current affairs, articles, and news updates."
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs' },
        ]}
        actions={
          <Button onClick={() => navigate('/current-affairs/new')}>+ Add Current Affair</Button>
        }
      />

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '24px' }}>
        <Tabs
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
          tabs={[
            { id: 'all', label: 'All Articles' },
            { id: 'published', label: 'Published' },
            { id: 'drafts', label: 'Drafts' },
            { id: 'trash', label: 'Trash' },
          ]}
        />

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 240px' }}>
            <SearchInput 
              placeholder="Search articles..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div style={{ width: '220px' }}>
            <Select 
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map(c => ({ label: c.nameEn, value: c.id }))
              ]} 
            />
          </div>
          <div style={{ width: '160px' }}>
            <Select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Published', value: 'PUBLISHED' },
                { label: 'Draft', value: 'DRAFT' },
              ]} 
            />
          </div>
          <Button variant="outline" onClick={() => {
            setSearch('');
            setCategoryFilter('all');
            setStatusFilter('all');
            setActiveTab('all');
          }}>Clear Filters</Button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading...</div>
        ) : articles.length > 0 ? (
          <>
            <Table headers={tableHeaders} rows={tableRows} />
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            No articles found matching your filters.
          </div>
        )}
      </div>

      {previewArticle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: previewLang === 'split' ? '1200px' : '800px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', transition: 'width 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Preview Content</h3>
              
              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button onClick={() => setPreviewLang('en')} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: previewLang === 'en' ? '#fff' : 'transparent', fontWeight: previewLang === 'en' ? 600 : 500, boxShadow: previewLang === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: '#1E293B', transition: 'all 0.15s ease' }}>English</button>
                <button onClick={() => setPreviewLang('kn')} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: previewLang === 'kn' ? '#fff' : 'transparent', fontWeight: previewLang === 'kn' ? 600 : 500, boxShadow: previewLang === 'kn' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: '#1E293B', transition: 'all 0.15s ease' }}>Kannada</button>
                <button onClick={() => setPreviewLang('split')} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: previewLang === 'split' ? '#fff' : 'transparent', fontWeight: previewLang === 'split' ? 600 : 500, boxShadow: previewLang === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: '#1E293B', transition: 'all 0.15s ease' }}>Bilingual</button>
              </div>

              <button onClick={() => setPreviewArticle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {previewLang === 'split' ? (
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px', borderRight: '1px solid #E2E8F0' }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{previewArticle.titleEn || 'Untitled English Article'}</h1>
                    {previewArticle.featuredImageUrl && <img src={previewArticle.featuredImageUrl} alt="Featured" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '20px' }} />}
                    <div style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: previewArticle.contentEn || '<p>No content provided yet.</p>' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: '12px' }}>
                    <h1 style={{ fontFamily: "'Noto Sans Kannada', sans-serif", fontSize: '24px', marginBottom: '16px' }}>{previewArticle.titleKn || 'Untitled Kannada Article'}</h1>
                    {previewArticle.featuredImageUrl && <img src={previewArticle.featuredImageUrl} alt="Featured" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '20px' }} />}
                    <div style={{ fontFamily: "'Noto Sans Kannada', sans-serif", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: previewArticle.contentKn || '<p>No content provided yet.</p>' }} />
                  </div>
                </div>
              ) : previewLang === 'kn' ? (
                <div>
                  <h1 style={{ fontFamily: "'Noto Sans Kannada', sans-serif", fontSize: '24px', marginBottom: '16px' }}>{previewArticle.titleKn || 'Untitled Kannada Article'}</h1>
                  {previewArticle.featuredImageUrl && <img src={previewArticle.featuredImageUrl} alt="Featured" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '20px' }} />}
                  <div style={{ fontFamily: "'Noto Sans Kannada', sans-serif", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: previewArticle.contentKn || '<p>No content provided yet.</p>' }} />
                </div>
              ) : (
                <div>
                  <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{previewArticle.titleEn || 'Untitled English Article'}</h1>
                  {previewArticle.featuredImageUrl && <img src={previewArticle.featuredImageUrl} alt="Featured" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '20px' }} />}
                  <div style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: previewArticle.contentEn || '<p>No content provided yet.</p>' }} />
                </div>
              )}
            </div>
            <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <Button variant="outline" onClick={() => setPreviewArticle(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
