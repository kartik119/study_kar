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

  const tableRows = articles.map(article => [
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
        ariaLabel="Edit" 
        icon={<span style={{fontSize: '16px'}}>✏️</span>} 
        size="sm" 
        onClick={() => navigate(`/current-affairs/${article.id}/edit`)}
      />
      <DropdownMenu 
        trigger={<IconButton ariaLabel="More" icon={<span style={{fontSize: '16px'}}>⋮</span>} size="sm" />}
        items={[
          { label: 'Edit Article', onClick: () => navigate(`/current-affairs/${article.id}/edit`) },
          { label: 'Duplicate', onClick: () => handleDuplicate(article.id) },
          { label: 'Move to Trash', onClick: () => handleDelete(article.id), danger: true }
        ]}
      />
    </div>
  ]);

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
    </div>
  );
};
