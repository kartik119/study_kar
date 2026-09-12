import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Edit,
  HelpCircle,
  MoreVertical,
  Trash2,
  CheckCircle,
  Archive,
  Send,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  McqQuestion,
  AcademicCategory,
  AcademicSubcategory,
  McqQueryParams,
} from '@study-karnataka/shared-types';
import {
  Button,
  IconButton,
  SearchInput,
  Select,
  Card,
  Badge,
  DropdownMenu,
  Pagination,
  Modal,
} from '@study-karnataka/ui';
import { mcqLibraryApi } from '../../api/mcq-library.api';
import { AcademicTaxonomyApi } from '../../api/academic-taxonomy.api';
import { McqPreviewModal } from './McqPreviewModal';

export const McqLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  /** Strip HTML tags to display plain text in table cells */
  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);

  // Delete Modals State
  const [deletingQuestion, setDeletingQuestion] = useState<McqQuestion | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('ALL');
  const [mergedCatSub, setMergedCatSub] = useState<string[]>([]);
  const [isCatSubOpen, setIsCatSubOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [readiness, setReadiness] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [isPyqFilter, setIsPyqFilter] = useState<string>('ALL');

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<McqQuestion | null>(null);

  // Taxonomy Master Data
  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, AcademicSubcategory[]>>({});

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    setSelectedIds([]); // Clear selection when page or filters change
    fetchQuestions();
  }, [page, pageSize, difficulty, mergedCatSub, readiness, status, isPyqFilter]);

  const loadTaxonomy = async () => {
    try {
      const catData = await AcademicTaxonomyApi.getCategories({ moduleType: 'MCQ' });
      let cats: AcademicCategory[] = [];
      if (Array.isArray(catData)) cats = catData;
      setCategories(cats);

      const subMap: Record<string, AcademicSubcategory[]> = {};
      for (const c of cats) {
        try {
          const subs = await AcademicTaxonomyApi.getSubcategories(c.id);
          if (Array.isArray(subs)) subMap[c.id] = subs;
        } catch {
          subMap[c.id] = [];
        }
      }
      setSubcategoriesMap(subMap);
    } catch {
      // Ignore taxonomy load fail
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      let catId: string[] = [];
      let subcatId: string[] = [];

      mergedCatSub.forEach((item) => {
        if (item.startsWith('sub:')) {
          subcatId.push(item.split(':')[1]);
        } else if (item.startsWith('cat:')) {
          catId.push(item.replace('cat:', ''));
        }
      });

      const params: McqQueryParams = {
        search: search.trim() || undefined,
        difficulty: difficulty !== 'ALL' ? difficulty : undefined,
        categoryId: catId.length > 0 ? catId : undefined,
        subcategoryId: subcatId.length > 0 ? subcatId : undefined,
        readiness: readiness !== 'ALL' ? readiness : undefined,
        status: status !== 'ALL' ? status : undefined,
        isPyq: isPyqFilter === 'PYQ_ONLY' ? true : isPyqFilter === 'NON_PYQ' ? false : undefined,
        page,
        limit: pageSize,
      };

      const res = await mcqLibraryApi.getQuestions(params);
      if (res.data) {
        setQuestions(res.data);
      }
      if (res.meta) {
        const metaObj = res.meta as any;
        setTotalPages(metaObj.totalPages || 1);
        setTotalQuestions(metaObj.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedIds([]);
    fetchQuestions();
  };

  // Multi-select Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (questions.length === 0) return;
    const currentPageIds = questions.map((q) => q.id);
    const allSelectedOnPage = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Workflow Actions
  const handleWorkflowAction = async (
    id: string,
    action: 'submit' | 'request-changes' | 'approve' | 'archive' | 'delete'
  ) => {
    if (action === 'delete') {
      const target = questions.find((q) => q.id === id);
      if (target) {
        setDeletingQuestion(target);
      }
      return;
    }

    try {
      setActionNotice(null);
      if (action === 'submit') {
        await mcqLibraryApi.submitReview(id);
      } else if (action === 'request-changes') {
        await mcqLibraryApi.requestChanges(id);
      } else if (action === 'approve') {
        await mcqLibraryApi.approveQuestion(id);
      } else if (action === 'archive') {
        await mcqLibraryApi.archiveQuestion(id);
      }
      setActionNotice({ type: 'success', message: `Question updated successfully!` });
      fetchQuestions();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || `Failed to perform ${action}` });
    }
  };

  // Confirm Single Delete
  const confirmSingleDelete = async () => {
    if (!deletingQuestion) return;
    setBulkActionLoading(true);
    setActionNotice(null);
    try {
      await mcqLibraryApi.deleteQuestion(deletingQuestion.id);
      setActionNotice({ type: 'success', message: `MCQ ${deletingQuestion.code} deleted successfully!` });
      setSelectedIds((prev) => prev.filter((id) => id !== deletingQuestion.id));
      setDeletingQuestion(null);
      fetchQuestions();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to delete question' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Confirm Bulk Delete
  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    setActionNotice(null);
    try {
      const res = await mcqLibraryApi.bulkDeleteQuestions(selectedIds);
      const data = res.data;
      let msg = `Successfully deleted ${data?.deletedCount || 0} question(s).`;
      if (data?.skipped && data.skipped.length > 0) {
        msg += ` Skipped ${data.skipped.length} question(s) referenced in active Mock Tests.`;
      }
      setActionNotice({ type: 'success', message: msg });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      fetchQuestions();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to perform bulk delete' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Status Update Handler
  const handleBulkStatusUpdate = async (action: 'submit' | 'approve' | 'archive') => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    setActionNotice(null);
    try {
      const res = await mcqLibraryApi.bulkUpdateStatus(selectedIds, action);
      setActionNotice({
        type: 'success',
        message: `Successfully performed ${action} on ${res.data?.updatedCount || 0} question(s).`,
      });
      setSelectedIds([]);
      fetchQuestions();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || `Failed to perform bulk ${action}` });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Real stats calculation
  const stats = {
    total: totalQuestions,
    bilingualReady: questions.filter((q) => q.readiness === 'BILINGUAL_READY').length,
    reviewPending: questions.filter((q) => q.status === 'REVIEW_PENDING').length,
    approved: questions.filter((q) => q.status === 'APPROVED').length,
    draft: questions.filter((q) => q.status === 'DRAFT').length,
  };

  // Category & Subcategory Select Options
  const mergedCatSubOptions = [
    ...categories.flatMap((cat) => [
      { label: `📁 ${cat.nameEn}`, value: `cat:${cat.id}` },
      ...(subcategoriesMap[cat.id] || []).map((sub) => ({
        label: `   └ ${cat.nameEn} › ${sub.nameEn}`,
        value: `sub:${sub.id}`,
      })),
    ]),
  ];

  const currentPageIds = questions.map((q) => q.id);
  const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* 1. Library Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #DCE6EE',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            MCQ Library & Question Bank
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            Manage canonical bilingual English/Kannada questions for tests and practice.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={() => navigate('/mcq-library/new')}
          style={{ backgroundColor: '#084B7A', borderColor: '#084B7A' }}
        >
          Add MCQ
        </Button>
      </div>

      {/* 2. Real Summary Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <Card style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', border: '1px solid #DCE6EE' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total MCQs
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
            {stats.total}
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', backgroundColor: '#F4F8FB', border: '1px solid #DCE6EE' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bilingual Ready
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#084B7A', marginTop: '4px' }}>
            {stats.bilingualReady}
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Review Pending
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
            {stats.reviewPending}
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Approved
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {stats.approved}
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Draft
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
            {stats.draft}
          </div>
        </Card>
      </div>

      {/* 3. Filter Toolbar */}
      <Card style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #DCE6EE' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search Row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code (e.g. MCQ_000001) or English/Kannada question text..."
              />
            </div>
            <Button variant="secondary" size="md" type="submit" leftIcon={<Search size={16} />}>
              Search
            </Button>
          </div>

          {/* Filters Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Classification
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setIsCatSubOpen(!isCatSubOpen)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #DCE6EE',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '38px'
                  }}
                >
                  <span style={{ color: mergedCatSub.length === 0 ? '#94A3B8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mergedCatSub.length === 0 ? 'All Categories' : `${mergedCatSub.length} Selected`}
                  </span>
                  <span style={{ fontSize: '10px' }}>▼</span>
                </div>
                {isCatSubOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: 'white',
                      border: '1px solid #DCE6EE',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      zIndex: 50,
                      maxHeight: '250px',
                      overflowY: 'auto',
                      padding: '8px'
                    }}
                  >
                    {categories.map((cat) => {
                      const isExpanded = expandedCats.includes(cat.id);
                      const subs = subcategoriesMap[cat.id] || [];
                      return (
                        <div key={cat.id}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', flex: 1, margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={mergedCatSub.includes(`cat:${cat.id}`)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMergedCatSub(prev => [...prev, `cat:${cat.id}`]);
                                  } else {
                                    setMergedCatSub(prev => prev.filter(v => v !== `cat:${cat.id}`));
                                  }
                                  setPage(1);
                                }}
                              />
                              📁 {cat.nameEn}
                            </label>
                            {subs.length > 0 && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCats(prev => isExpanded ? prev.filter(id => id !== cat.id) : [...prev, cat.id]);
                                }}
                                style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '10px', color: '#64748B' }}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </div>
                            )}
                          </div>
                          {isExpanded && subs.map(sub => (
                            <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 28px', cursor: 'pointer', fontSize: '13px', borderRadius: '4px', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={mergedCatSub.includes(`sub:${sub.id}`)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMergedCatSub(prev => [...prev, `sub:${sub.id}`]);
                                  } else {
                                    setMergedCatSub(prev => prev.filter(v => v !== `sub:${sub.id}`));
                                  }
                                  setPage(1);
                                }}
                              />
                              └ {sub.nameEn}
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {isCatSubOpen && (
                  <div
                    onClick={() => setIsCatSubOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                  />
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Difficulty
              </label>
              <Select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Difficulties', value: 'ALL' },
                  { label: 'Easy', value: 'EASY' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'Hard', value: 'HARD' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Readiness
              </label>
              <Select
                value={readiness}
                onChange={(e) => {
                  setReadiness(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Readiness', value: 'ALL' },
                  { label: 'Bilingual Ready', value: 'BILINGUAL_READY' },
                  { label: 'EN Incomplete', value: 'ENGLISH_INCOMPLETE' },
                  { label: 'KN Incomplete', value: 'KANNADA_INCOMPLETE' },
                  { label: 'Incomplete', value: 'INCOMPLETE' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Workflow Status
              </label>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Workflow Statuses', value: 'ALL' },
                  { label: 'Draft', value: 'DRAFT' },
                  { label: 'Review Pending', value: 'REVIEW_PENDING' },
                  { label: 'Changes Requested', value: 'CHANGES_REQUESTED' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Archived', value: 'ARCHIVED' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Source / PYQ
              </label>
              <Select
                value={isPyqFilter}
                onChange={(e) => {
                  setIsPyqFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Questions', value: 'ALL' },
                  { label: 'PYQs Only', value: 'PYQ_ONLY' },
                  { label: 'Non-PYQs Only', value: 'NON_PYQ' },
                ]}
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: actionNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${actionNotice.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            color: actionNotice.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* 4. Multi-Selection Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                backgroundColor: '#38BDF8',
                color: '#0F172A',
                fontWeight: 700,
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '14px', color: '#94A3B8' }}>
              Perform action on selected MCQ questions
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={15} />}
              disabled={bulkActionLoading}
              onClick={() => setShowBulkDeleteModal(true)}
              style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
            >
              Delete Selected ({selectedIds.length})
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Send size={15} />}
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('submit')}
              style={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderColor: '#334155' }}
            >
              Bulk Submit
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle size={15} />}
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('approve')}
              style={{ backgroundColor: '#059669', color: '#FFFFFF', borderColor: '#059669' }}
            >
              Bulk Approve
            </Button>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Archive size={15} />}
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('archive')}
              style={{ backgroundColor: '#334155', color: '#F8FAFC', borderColor: '#475569' }}
            >
              Bulk Archive
            </Button>

            <IconButton
              icon={<X size={16} />}
              ariaLabel="Clear Selection"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              style={{ color: '#94A3B8' }}
            />
          </div>
        </div>
      )}

      {/* 5. MCQ Question Table Container */}
      <Card style={{ padding: 0, backgroundColor: '#FFFFFF', border: '1px solid #DCE6EE', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            Loading MCQ library questions...
          </div>
        ) : questions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <HelpCircle size={40} style={{ color: '#94A3B8', marginBottom: '8px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>No MCQs Found</div>
            <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
              No questions matched your search criteria. Try adjusting filters or click "Add MCQ".
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #DCE6EE', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {/* Checkbox Column Header */}
                    <th style={{ padding: '14px 16px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={handleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#084B7A' }}
                        title="Select All on Page"
                      />
                    </th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>MCQ ID</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, minWidth: '260px' }}>Question Stems</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Classification</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Difficulty</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Readiness</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>Updated</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => {
                    const isBilingual = q.readiness === 'BILINGUAL_READY';
                    const isSelected = selectedIds.includes(q.id);

                    return (
                      <tr
                        key={q.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isSelected ? '#F0F7FF' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Checkbox Column */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(q.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#084B7A' }}
                          />
                        </td>

                        {/* MCQ ID */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#084B7A', backgroundColor: '#EAF3F9', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                            {q.code}
                          </span>
                          {q.isPyq && (
                            <span style={{ display: 'block', marginTop: '6px', fontSize: '10px', fontWeight: 700, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                              PYQ ({q.pyqYear || 'Exam'})
                            </span>
                          )}
                        </td>

                        {/* Question Stem (EN top, KN bottom muted) */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 500, color: '#111827', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {q.questionTextEn ? stripHtml(q.questionTextEn) : <em style={{ color: '#94A3B8' }}>No English question text</em>}
                          </div>
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '13px',
                              color: '#64748B',
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              fontFamily: "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif",
                            }}
                          >
                            {q.questionTextKn ? stripHtml(q.questionTextKn) : <em style={{ color: '#CBD5E1' }}>ಕನ್ನಡ ಪ್ರಶ್ನೆ ಇಲ್ಲ</em>}
                          </div>
                        </td>

                        {/* Classification: Category › Subcategory */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span>{q.categoryNameEn || 'Uncategorized'}</span>
                            <span style={{ color: '#94A3B8' }}>›</span>
                            <span style={{ color: '#64748B', fontWeight: 400 }}>{q.subcategoryNameEn || 'None'}</span>
                          </div>
                        </td>

                        {/* Difficulty */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          {q.difficulty === 'EASY' && <Badge label="Easy" variant="success" />}
                          {q.difficulty === 'MEDIUM' && <Badge label="Medium" variant="warning" />}
                          {q.difficulty === 'HARD' && <Badge label="Hard" variant="error" />}
                        </td>

                        {/* Readiness */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          {isBilingual ? (
                            <Badge label="EN ✓ KN ✓" variant="success" />
                          ) : q.readiness === 'ENGLISH_INCOMPLETE' ? (
                            <Badge label="EN Incomplete" variant="warning" />
                          ) : q.readiness === 'KANNADA_INCOMPLETE' ? (
                            <Badge label="KN Incomplete" variant="warning" />
                          ) : (
                            <Badge label="Incomplete" variant="error" />
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                          {q.status === 'APPROVED' && <Badge label="Approved" variant="success" />}
                          {q.status === 'REVIEW_PENDING' && <Badge label="Review Pending" variant="warning" />}
                          {q.status === 'CHANGES_REQUESTED' && <Badge label="Changes Requested" variant="error" />}
                          {q.status === 'ARCHIVED' && <Badge label="Archived" variant="neutral" />}
                          {q.status === 'DRAFT' && <Badge label="Draft" variant="neutral" />}
                        </td>

                        {/* Updated */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top', color: '#64748B', fontSize: '12px' }}>
                          {new Date(q.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <IconButton
                              icon={<Eye size={16} />}
                              ariaLabel="Preview Question"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewQuestion(q)}
                            />
                            <IconButton
                              icon={<Edit size={16} />}
                              ariaLabel="Edit Question"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/mcq-library/${q.id}/edit`)}
                            />
                            <DropdownMenu
                              trigger={<IconButton icon={<MoreVertical size={16} />} ariaLabel="More options" variant="ghost" size="sm" />}
                              items={[
                                ...(q.status === 'DRAFT' || q.status === 'CHANGES_REQUESTED'
                                  ? [{ label: 'Submit for Review', onClick: () => handleWorkflowAction(q.id, 'submit') }]
                                  : []),
                                ...(q.status === 'REVIEW_PENDING'
                                  ? [
                                      { label: 'Approve Question', onClick: () => handleWorkflowAction(q.id, 'approve') },
                                      { label: 'Request Changes', onClick: () => handleWorkflowAction(q.id, 'request-changes') },
                                    ]
                                  : []),
                                ...(q.status === 'APPROVED'
                                  ? [{ label: 'Archive Question', onClick: () => handleWorkflowAction(q.id, 'archive') }]
                                  : []),
                                {
                                  label: 'Delete Question',
                                  onClick: () => handleWorkflowAction(q.id, 'delete'),
                                  danger: true,
                                },
                              ].filter(Boolean)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 6. Pagination Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #DCE6EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Showing <strong style={{ color: '#111827' }}>{(page - 1) * pageSize + 1}</strong> –{' '}
                <strong style={{ color: '#111827' }}>{Math.min(page * pageSize, totalQuestions)}</strong> of{' '}
                <strong style={{ color: '#111827' }}>{totalQuestions}</strong> MCQs
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Select
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  options={[
                    { label: '25 per page', value: '25' },
                    { label: '50 per page', value: '50' },
                    { label: '100 per page', value: '100' },
                  ]}
                  style={{ width: '130px' }}
                />

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Single Question Delete Confirmation Modal */}
      {deletingQuestion && (
        <Modal
          isOpen={Boolean(deletingQuestion)}
          onClose={() => setDeletingQuestion(null)}
          title="Delete MCQ Question"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Warning: Permanently delete MCQ question?</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Deleting this question will remove it permanently from the MCQ library. If this question is referenced in active Mock Tests, deletion will be blocked safely.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#084B7A', fontFamily: 'monospace' }}>
                {deletingQuestion.code}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '6px' }}>
                {deletingQuestion.questionTextEn || 'No English Text'}
              </div>
              {deletingQuestion.questionTextKn && (
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', fontFamily: "'Kannada Sangam MN', sans-serif" }}>
                  {deletingQuestion.questionTextKn}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button
                variant="secondary"
                size="md"
                disabled={bulkActionLoading}
                onClick={() => setDeletingQuestion(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                leftIcon={<Trash2 size={16} />}
                disabled={bulkActionLoading}
                onClick={confirmSingleDelete}
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
              >
                {bulkActionLoading ? 'Deleting...' : 'Delete Question'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <Modal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          title={`Bulk Delete (${selectedIds.length}) MCQs`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Are you sure you want to delete {selectedIds.length} selected MCQ(s)?</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Unreferenced questions will be permanently removed. Any questions linked to active Mock Tests will be skipped automatically to maintain test integrity.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button
                variant="secondary"
                size="md"
                disabled={bulkActionLoading}
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                leftIcon={<Trash2 size={16} />}
                disabled={bulkActionLoading}
                onClick={confirmBulkDelete}
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
              >
                {bulkActionLoading ? 'Deleting...' : `Delete ${selectedIds.length} MCQs`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <McqPreviewModal
          question={previewQuestion}
          onClose={() => setPreviewQuestion(null)}
        />
      )}
    </div>
  );
};
