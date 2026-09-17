import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StudyMaterialListItem,
  StudyMaterialFoundationReadiness,
  AcademicCategory,
  AcademicSubcategory,
  AcademicTopic,
  AcademicKnowledgeArea,
  PermissionKey,
} from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Select,
  Checkbox,
  Badge,
  StatusBadge,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Pagination,
  Modal,
} from '@study-karnataka/ui';
import { StudyMaterialApi, ApiError } from '../../api/study-materials.api';
import { AcademicTaxonomyApi } from '../../api/academic-taxonomy.api';
import {
  Plus,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  RotateCcw as ResetIcon,
  MoreVertical,
  Globe,
  RotateCw,
  AlertTriangle,
  Send,
  CheckCircle,
  Edit3,
} from 'lucide-react';

const TaxonomyCell: React.FC<{ path?: string }> = ({ path }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!path || path === 'Unmapped' || path === 'Unassigned Taxonomy' || path === 'Unassigned') {
    return <span style={{ color: '#94A3B8', fontSize: '13px' }}>Unmapped</span>;
  }

  // Deduplicate consecutive identical segments
  const rawParts = path.split(' > ').map(p => p.trim()).filter(Boolean);
  const parts = rawParts.filter((part, idx, arr) => idx === 0 || part.toLowerCase() !== arr[idx - 1].toLowerCase());

  const displayParts = expanded ? parts : parts.slice(0, 2);
  const hiddenCount = parts.length - 2;

  return (
    <div style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '4px',
      maxWidth: '100%',
    }}>
      {displayParts.map((part: string, idx: number) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>›</span>}
          <span
            title={part}
            style={{
              fontSize: idx === 0 ? '12px' : '11px',
              fontWeight: idx === 0 ? 700 : 500,
              backgroundColor: idx === 0 ? '#E0E7FF' : '#F1F5F9',
              color: idx === 0 ? '#3730A3' : '#475569',
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${idx === 0 ? '#C7D2FE' : '#E2E8F0'}`,
              maxWidth: expanded ? '220px' : '135px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              lineHeight: '1.4',
              verticalAlign: 'middle',
            }}
          >
            {part}
          </span>
        </React.Fragment>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          title="Click to view full taxonomy"
          style={{
            fontSize: '11px',
            backgroundColor: '#E2E8F0',
            color: '#1E293B',
            padding: '2px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          title="Click to collapse"
          style={{
            fontSize: '11px',
            backgroundColor: '#E2E8F0',
            color: '#1E293B',
            padding: '2px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Show less
        </button>
      )}
    </div>
  );
};

const StudyMaterialActionMenu: React.FC<{
  item: StudyMaterialListItem;
  hasPerm: (perm: PermissionKey) => boolean;
  onAction: (action: 'ARCHIVE' | 'RESTORE' | 'PUBLISH' | 'REOPEN' | 'DELETE' | 'SUBMIT_REVIEW' | 'REQUEST_CHANGES' | 'APPROVE' | 'EDIT', item: StudyMaterialListItem) => void;
}> = ({ item, hasPerm, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const canUpdate = hasPerm('study_materials.update');
  const canDeleteDraft = hasPerm('study_materials.delete_draft');
  const canArchive = hasPerm('study_materials.archive');
  const canPublish = hasPerm('study_materials.publish');
  
  const canSubmitReview = hasPerm('study_materials.submit_review') || canUpdate;
  const canReview = hasPerm('study_materials.review') || canUpdate;
  const canApprove = hasPerm('study_materials.approve') || canPublish;

  const isDraft = item.statusEn === 'DRAFT' || item.statusKn === 'DRAFT' || (!item.statusEn && !item.statusKn);
  const isChangesRequested = item.statusEn === 'CHANGES_REQUESTED' || item.statusKn === 'CHANGES_REQUESTED';
  const isReviewPending = item.statusEn === 'REVIEW_PENDING' || item.statusKn === 'REVIEW_PENDING';
  const isApproved = item.statusEn === 'APPROVED' || item.statusKn === 'APPROVED';
  const isPublished = item.statusEn === 'PUBLISHED' || item.statusKn === 'PUBLISHED';

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
            {/* Workflow Options */}
            {canUpdate && item.recordStatus === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('EDIT', item); }}
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
            )}

            {canSubmitReview && item.recordStatus === 'ACTIVE' && (isDraft || isChangesRequested) && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('SUBMIT_REVIEW', item); }}
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

            {canReview && item.recordStatus === 'ACTIVE' && isReviewPending && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('REQUEST_CHANGES', item); }}
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

            {canApprove && item.recordStatus === 'ACTIVE' && isReviewPending && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('APPROVE', item); }}
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

            {/* Publish Option */}
            {canPublish && item.recordStatus === 'ACTIVE' && isApproved && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('PUBLISH', item); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#059669', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Globe size={15} color="#059669" />
                <span>Publish Content</span>
              </button>
            )}

            {/* Reopen (New Draft) Option */}
            {canUpdate && item.recordStatus === 'ACTIVE' && (isPublished || isApproved) && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('REOPEN', item); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', fontSize: '13px',
                  color: '#2563EB', border: 'none', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer',
                  textAlign: 'left', fontWeight: 500, transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCw size={15} color="#2563EB" />
                <span>Take back and edit</span>
              </button>
            )}

            {/* Archive / Restore Option */}
            {canArchive && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction(item.recordStatus === 'ACTIVE' ? 'ARCHIVE' : 'RESTORE', item); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: item.recordStatus === 'ACTIVE' ? '#D97706' : '#059669',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.recordStatus === 'ACTIVE' ? '#FFFBEB' : '#ECFDF5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {item.recordStatus === 'ACTIVE' ? (
                  <>
                    <Archive size={15} color="#D97706" />
                    <span>Archive</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} color="#059669" />
                    <span>Restore</span>
                  </>
                )}
              </button>
            )}

            <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }} />

            {/* Delete Draft Option */}
            {canDeleteDraft && item.recordStatus === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onAction('DELETE', item); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#EF2323',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={15} color="#EF2323" />
                <span>Delete Draft</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const AllContentPage: React.FC = () => {
  const navigate = useNavigate();

  // User & Permission checks
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');

  const hasPerm = useCallback((perm: PermissionKey) => {
    return isSuperAdmin || userPermissions.includes(perm);
  }, [isSuperAdmin, userPermissions]);

  const canCreate = isSuperAdmin || userPermissions.includes('study_materials.create');
  const canUpdate = isSuperAdmin || userPermissions.includes('study_materials.update');
  const canArchive = isSuperAdmin || userPermissions.includes('study_materials.archive');
  const canDeleteDraft = isSuperAdmin || userPermissions.includes('study_materials.delete_draft');
  const canPublish = isSuperAdmin || userPermissions.includes('study_materials.publish');
  
  const canSubmitReview = isSuperAdmin || userPermissions.includes('study_materials.submit_review') || canUpdate;
  const canReview = isSuperAdmin || userPermissions.includes('study_materials.review') || canUpdate;
  const canApprove = isSuperAdmin || userPermissions.includes('study_materials.approve') || canPublish;

  // State
  const [items, setItems] = useState<StudyMaterialListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // 3-dot Action Menu & Confirmation Modal State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<{
    isOpen: boolean;
    type: 'ARCHIVE' | 'RESTORE' | 'PUBLISH' | 'REOPEN' | 'DELETE' | 'SUBMIT_REVIEW' | 'REQUEST_CHANGES' | 'APPROVE';
    item: StudyMaterialListItem | null;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    type: 'ARCHIVE',
    item: null,
    isSubmitting: false,
    error: null,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [mappingFilter, setMappingFilter] = useState<string>('');
  const [foundationReadiness, setFoundationReadiness] = useState<string>('');
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>('');
  const [recordStatus, setRecordStatus] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [knowledgeAreaId, setKnowledgeAreaId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Taxonomy dropdown options
  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AcademicSubcategory[]>([]);
  const [topics, setTopics] = useState<AcademicTopic[]>([]);
  const [knowledgeAreas, setKnowledgeAreas] = useState<AcademicKnowledgeArea[]>([]);

  // Load taxonomy cascading options safely
  useEffect(() => {
    AcademicTaxonomyApi.getCategories({ moduleType: 'STUDY_MATERIAL' }).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (categoryId) {
      AcademicTaxonomyApi.getSubcategories(categoryId, { moduleType: 'STUDY_MATERIAL' }).then(setSubcategories).catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [categoryId]);

  useEffect(() => {
    if (subcategoryId) {
      AcademicTaxonomyApi.getTopics(subcategoryId).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [subcategoryId]);

  useEffect(() => {
    if (topicId) {
      AcademicTaxonomyApi.getKnowledgeAreas(topicId).then(setKnowledgeAreas).catch(() => setKnowledgeAreas([]));
    } else {
      setKnowledgeAreas([]);
    }
  }, [topicId]);

  const loadData = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      let hasEnglish: boolean | undefined = undefined;
      let hasKannada: boolean | undefined = undefined;
      if (languageFilter === 'BOTH') {
        hasEnglish = true;
        hasKannada = true;
      } else if (languageFilter === 'ENGLISH') {
        hasEnglish = true;
      } else if (languageFilter === 'KANNADA') {
        hasKannada = true;
      }

      const res = await StudyMaterialApi.getStudyMaterials({
        search: search.trim() || undefined,
        foundationReadiness: (foundationReadiness as StudyMaterialFoundationReadiness) || undefined,
        recordStatus: (recordStatus as any) || undefined,
        hasEnglishLocale: hasEnglish,
        hasKannadaLocale: hasKannada,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        topicId: topicId || undefined,
        knowledgeAreaId: knowledgeAreaId || undefined,
        includeArchived: includeArchived || recordStatus === 'ARCHIVED',
        page,
        pageSize: 20,
      });

      let filteredItems = res.items;
      if (accessTypeFilter) {
        filteredItems = filteredItems.filter((i: any) => i.accessType === accessTypeFilter);
      }
      if (mappingFilter === 'MAPPED') {
        filteredItems = filteredItems.filter((i: any) => i.primaryTaxonomyPath && i.primaryTaxonomyPath !== 'Unmapped' && i.primaryTaxonomyPath !== 'Unassigned Taxonomy');
      } else if (mappingFilter === 'UNMAPPED') {
        filteredItems = filteredItems.filter((i: any) => !i.primaryTaxonomyPath || i.primaryTaxonomyPath === 'Unmapped' || i.primaryTaxonomyPath === 'Unassigned Taxonomy');
      }

      setItems(filteredItems);
      setPagination(res.meta);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Unable to load Study Materials');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, mappingFilter, accessTypeFilter, foundationReadiness, recordStatus, languageFilter, categoryId, subcategoryId, topicId, knowledgeAreaId, includeArchived]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const resetFilters = () => {
    setSearch('');
    setMappingFilter('');
    setFoundationReadiness('');
    setRecordStatus('');
    setLanguageFilter('');
    setCategoryId('');
    setSubcategoryId('');
    setTopicId('');
    setKnowledgeAreaId('');
    setIncludeArchived(false);
  };

  // Open modal popup for any 3-dot action
  const openActionModal = (type: 'ARCHIVE' | 'RESTORE' | 'PUBLISH' | 'REOPEN' | 'DELETE' | 'SUBMIT_REVIEW' | 'REQUEST_CHANGES' | 'APPROVE' | 'EDIT', item: StudyMaterialListItem) => {
    setActiveMenuId(null);
    if (type === 'EDIT') {
      navigate(`/study-materials/${item.id}/edit`);
      return;
    }
    
    setModalAction({
      isOpen: true,
      type,
      item,
      isSubmitting: false,
      error: null,
    });
  };

  const closeModal = () => {
    if (modalAction.isSubmitting) return;
    setModalAction(prev => ({ ...prev, isOpen: false, item: null, error: null }));
  };

  const executeModalAction = async () => {
    const { type, item } = modalAction;
    if (!item) return;

    setModalAction(prev => ({ ...prev, isSubmitting: true, error: null }));
    try {
      if (type === 'ARCHIVE') {
        if (!canArchive) throw new Error('You do not have permission to archive study materials.');
        await StudyMaterialApi.archiveStudyMaterial(item.id);
      } else if (type === 'RESTORE') {
        if (!canArchive) throw new Error('You do not have permission to restore study materials.');
        await StudyMaterialApi.restoreStudyMaterial(item.id);
      } else if (type === 'DELETE') {
        if (!canDeleteDraft) throw new Error('You do not have permission to delete draft study materials.');
        await StudyMaterialApi.deleteDraftStudyMaterial(item.id);
      } else if (type === 'PUBLISH') {
        if (!canPublish) throw new Error('You do not have permission to publish study materials.');
        // Publish both English and Kannada revisions if available, or whatever revision exists
        let publishedCount = 0;
        if (item.englishRevisionId) {
          await StudyMaterialApi.publishRevision(item.id, 'en', item.englishRevisionId);
          publishedCount++;
        }
        if (item.kannadaRevisionId) {
          await StudyMaterialApi.publishRevision(item.id, 'kn', item.kannadaRevisionId);
          publishedCount++;
        }
        if (publishedCount === 0) {
          // If no revision IDs on listItem, fetch detail and publish revisions
          const detail = await StudyMaterialApi.getStudyMaterialById(item.id);
          if (detail.englishRevision) {
            await StudyMaterialApi.publishRevision(item.id, 'en', detail.englishRevision.id);
            publishedCount++;
          }
          if (detail.kannadaRevision) {
            await StudyMaterialApi.publishRevision(item.id, 'kn', detail.kannadaRevision.id);
            publishedCount++;
          }
        }
        if (publishedCount === 0) {
          throw new Error('No draft content revision available to publish.');
        }
      } else if (type === 'SUBMIT_REVIEW') {
        let submitted = 0;
        if (item.englishRevisionId && item.statusEn === 'DRAFT') {
          await StudyMaterialApi.submitForReview(item.id, 'en', item.englishRevisionId);
          submitted++;
        }
        if (item.kannadaRevisionId && item.statusKn === 'DRAFT') {
          await StudyMaterialApi.submitForReview(item.id, 'kn', item.kannadaRevisionId);
          submitted++;
        }
        if (submitted === 0) throw new Error('No valid draft found to submit.');
      } else if (type === 'REQUEST_CHANGES') {
        let req = 0;
        if (item.englishRevisionId && item.statusEn === 'REVIEW_PENDING') {
          await StudyMaterialApi.requestChanges(item.id, 'en', item.englishRevisionId, 'Changes requested by Admin');
          req++;
        }
        if (item.kannadaRevisionId && item.statusKn === 'REVIEW_PENDING') {
          await StudyMaterialApi.requestChanges(item.id, 'kn', item.kannadaRevisionId, 'Changes requested by Admin');
          req++;
        }
        if (req === 0) throw new Error('No pending review found to request changes.');
      } else if (type === 'APPROVE') {
        let approved = 0;
        if (item.englishRevisionId && item.statusEn === 'REVIEW_PENDING') {
          await StudyMaterialApi.approveRevision(item.id, 'en', item.englishRevisionId, 'Approved by Admin');
          approved++;
        }
        if (item.kannadaRevisionId && item.statusKn === 'REVIEW_PENDING') {
          await StudyMaterialApi.approveRevision(item.id, 'kn', item.kannadaRevisionId, 'Approved by Admin');
          approved++;
        }
        if (approved === 0) throw new Error('No pending review found to approve.');
      } else if (type === 'REOPEN') {
        if (!canUpdate) throw new Error('You do not have permission to edit or reopen study materials.');
        let reopened = false;
        
        if (item.englishRevisionId && (item.statusEn === 'PUBLISHED' || item.statusEn === 'APPROVED')) {
          await StudyMaterialApi.cloneNewRevision(item.id, 'en', item.englishRevisionId);
          reopened = true;
        }
        
        if (item.kannadaRevisionId && (item.statusKn === 'PUBLISHED' || item.statusKn === 'APPROVED')) {
          await StudyMaterialApi.cloneNewRevision(item.id, 'kn', item.kannadaRevisionId);
          reopened = true;
        }
        
        if (!reopened) {
          throw new Error('No revision found to reopen as draft.');
        }
      }

      setModalAction(prev => ({ ...prev, isOpen: false, item: null, isSubmitting: false }));
      loadData(pagination.page);
    } catch (err: any) {
      setModalAction(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message || 'Operation failed. Please try again.',
      }));
    }
  };

  const getReadinessBadge = (readiness: StudyMaterialFoundationReadiness) => {
    switch (readiness) {
      case 'BOTH_LANGUAGES_READY':
        return <Badge label="Both Languages Ready" variant="success" />;
      case 'ENGLISH_READY':
        return <Badge label="English Ready" variant="info" />;
      case 'KANNADA_READY':
        return <Badge label="Kannada Ready" variant="info" />;
      case 'INCOMPLETE':
        return <Badge label="Incomplete" variant="warning" />;
      case 'NOT_STARTED':
      default:
        return <Badge label="Not Started" variant="neutral" />;
    }
  };

  const getBilingualStatusBadge = (status?: any) => {
    switch (status) {
      case 'BOTH_PUBLISHED':
        return <Badge label="Both Published" variant="success" />;
      case 'PARTIALLY_PUBLISHED':
        return <Badge label="Partially Published" variant="info" />;
      case 'BOTH_APPROVED':
        return <Badge label="Both Approved" variant="info" />;
      case 'PARTIALLY_REVIEWED':
        return <Badge label="Partially Reviewed" variant="warning" />;
      case 'BOTH_DRAFT':
        return <Badge label="Both Draft" variant="neutral" />;
      case 'ENGLISH_ONLY':
        return <Badge label="English Only" variant="neutral" />;
      case 'KANNADA_ONLY':
        return <Badge label="Kannada Only" variant="neutral" />;
      default:
        return <Badge label="Not Started" variant="neutral" />;
    }
  };

  return (
    <div className="premium-container">
      <style>{`
        .premium-container {
          background: linear-gradient(135deg, #f6f8fb 0%, #f1f5f9 100%);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          padding: 24px;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
        }
        .table-container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          border: 1px solid #E6EAF0;
        }
        .premium-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 14px;
        }
        .premium-table thead {
          background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .premium-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
        }
        .premium-table tbody tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid #f1f5f9;
        }
        .premium-table tbody tr:hover {
          background-color: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          z-index: 10;
          position: relative;
        }
        .premium-table td {
          padding: 16px;
          vertical-align: middle;
          word-break: break-word;
        }
        .action-btn {
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          transform: scale(1.15);
        }
      `}</style>
      {/* Page Header */}
      <PageHeader
        title="Study Materials"
        subtitle=""
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              onClick={() => navigate('/study-materials/review-queue')}
            >
              Review Queue
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => navigate('/study-materials/new')}
              >
                Add Content
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or title..."
            />

            <Select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value)}
              options={[
                { label: 'All Access Types', value: '' },
                { label: 'Completely Free', value: 'FREE' },
                { label: 'Completely Paid', value: 'PAID' },
                { label: 'Freemium', value: 'FREEMIUM' },
              ]}
            />

            <Select
              value={recordStatus}
              onChange={(e) => setRecordStatus(e.target.value)}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Archived', value: 'ARCHIVED' },
              ]}
            />
          </div>

          {/* Filter Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
                setTopicId('');
                setKnowledgeAreaId('');
              }}
              options={[
                { label: 'All Categories', value: '' },
                ...categories.map((c) => ({ label: `${c.nameEn} (${c.code})`, value: c.id })),
              ]}
            />

            <Select
              value={subcategoryId}
              disabled={!categoryId}
              onChange={(e) => {
                setSubcategoryId(e.target.value);
                setTopicId('');
                setKnowledgeAreaId('');
              }}
              options={[
                { label: 'All Subcategories', value: '' },
                ...subcategories.map((s) => ({ label: `${s.nameEn} (${s.code})`, value: s.id })),
              ]}
            />

            <Select
              value={topicId}
              disabled={!subcategoryId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setKnowledgeAreaId('');
              }}
              options={[
                { label: 'All Topics', value: '' },
                ...topics.map((t) => ({ label: `${t.nameEn} (${t.code})`, value: t.id })),
              ]}
            />

            <Select
              value={knowledgeAreaId}
              disabled={!topicId}
              onChange={(e) => setKnowledgeAreaId(e.target.value)}
              options={[
                { label: 'All Knowledge Areas', value: '' },
                ...knowledgeAreas.map((ka) => ({ label: `${ka.nameEn} (${ka.code})`, value: ka.id })),
              ]}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
              <Checkbox
                label="Include Archived"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />

              <Button variant="outline" size="sm" leftIcon={<ResetIcon size={14} />} onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MUTUALLY EXCLUSIVE STATES */}

      {/* 1. LOADING STATE */}
      {isLoading && (
        <Card style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading study materials...</p>
        </Card>
      )}

      {/* 2. FORBIDDEN 403 STATE */}
      {!isLoading && isForbidden && (
        <ErrorState
          title="403 — Access Forbidden"
          message="Your administrative role does not have permission to view Study Materials."
        />
      )}

      {/* 3. API ERROR STATE */}
      {!isLoading && !isForbidden && error && (
        <ErrorState
          title="Unable to load Study Materials"
          message={error}
          onRetry={() => loadData(1)}
        />
      )}

      {/* 4. SUCCESS BUT EMPTY STATE */}
      {!isLoading && !isForbidden && !error && items.length === 0 && (
        <EmptyState
          title="No Study Materials Yet"
          description="Create your first bilingual Study Material and connect it to the academic taxonomy."
          actionLabel={canCreate ? "+ Add Content" : undefined}
          onAction={canCreate ? () => navigate('/study-materials/new') : undefined}
        />
      )}

      {/* 5. SUCCESS WITH RECORDS STATE */}
      {!isLoading && !isForbidden && !error && items.length > 0 && (
        <div className="table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Content Code</th>
                  <th style={{ width: '20%' }}>Title</th>
                  <th style={{ width: '8%' }}>Access</th>
                  <th style={{ width: '16%' }}>Primary Taxonomy</th>
                  <th style={{ width: '11%' }}>Bilingual Status</th>
                  <th style={{ width: '14%' }}>Foundation Readiness</th>
                  <th style={{ width: '9%' }}>Status</th>
                  <th style={{ width: '12%' }}>Last Updated</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#64748B',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.5px'
                      }}>
                        {item.code}
                      </div>
                    </td>

                    <td style={{ minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.logoUrl ? (
                          <img
                            src={item.logoUrl}
                            alt="Logo"
                            style={{
                              width: '36px',
                              height: '36px',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#fff',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              backgroundColor: '#084B7A',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#ffffff',
                              letterSpacing: '0.5px',
                              flexShrink: 0,
                            }}
                          >
                            SM
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px', lineHeight: '1.4' }}>
                            {item.titleEn || <span style={{ color: '#94A3B8' }}>No English Title</span>}
                          </div>
                          <div style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.4', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                            {item.titleKn || <span style={{ color: '#94A3B8' }}>No Kannada Title</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <Badge
                        label={(item as any).accessType || 'FREE'}
                        variant={(item as any).accessType === 'PAID' ? 'error' : (item as any).accessType === 'FREEMIUM' ? 'warning' : 'success'}
                      />
                    </td>

                    <td style={{ minWidth: '220px', maxWidth: '280px' }}>
                      <TaxonomyCell path={item.primaryTaxonomyPath} />
                    </td>

                    <td>
                      {getBilingualStatusBadge(item.bilingualStatus)}
                    </td>

                    <td>
                      {getReadinessBadge(item.foundationReadiness)}
                    </td>

                    <td>
                      <StatusBadge status={item.recordStatus} />
                    </td>

                    <td style={{ color: '#64748B', fontSize: '13px' }}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <div className="action-btn">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/study-materials/${item.id}`)}
                            title="View Details"
                          >
                            <Eye size={16} color="#475569" />
                          </Button>
                        </div>

                        {/* 3-Dot Options Menu */}
                        <StudyMaterialActionMenu item={item} hasPerm={hasPerm} onAction={openActionModal} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E6EAF0', backgroundColor: '#FAFBFC' }}>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => loadData(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Confirmation Modal Popup */}
      <Modal
        isOpen={modalAction.isOpen}
        onClose={closeModal}
        title={
          modalAction.type === 'PUBLISH'
            ? 'Publish Study Material'
            : modalAction.type === 'REOPEN'
            ? 'Reopen Study Material Draft'
            : modalAction.type === 'ARCHIVE'
            ? 'Archive Study Material'
            : modalAction.type === 'RESTORE'
            ? 'Restore Study Material'
            : modalAction.type === 'SUBMIT_REVIEW'
            ? 'Submit for Review'
            : modalAction.type === 'REQUEST_CHANGES'
            ? 'Request Changes'
            : modalAction.type === 'APPROVE'
            ? 'Approve Content'
            : 'Delete Draft Material'
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action description / confirmation message */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor:
                  modalAction.type === 'DELETE'
                    ? '#FEE2E2'
                    : modalAction.type === 'ARCHIVE' || modalAction.type === 'REQUEST_CHANGES'
                    ? '#FEF3C7'
                    : modalAction.type === 'PUBLISH' || modalAction.type === 'APPROVE'
                    ? '#D1FAE5'
                    : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {modalAction.type === 'DELETE' && <Trash2 size={20} color="#DC2626" />}
              {modalAction.type === 'ARCHIVE' && <Archive size={20} color="#D97706" />}
              {modalAction.type === 'RESTORE' && <RotateCcw size={20} color="#059669" />}
              {modalAction.type === 'PUBLISH' && <Globe size={20} color="#059669" />}
              {modalAction.type === 'REOPEN' && <RotateCw size={20} color="#2563EB" />}
              {modalAction.type === 'SUBMIT_REVIEW' && <Send size={20} color="#2563EB" />}
              {modalAction.type === 'REQUEST_CHANGES' && <Edit3 size={20} color="#D97706" />}
              {modalAction.type === 'APPROVE' && <CheckCircle size={20} color="#059669" />}
            </div>

            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {modalAction.type === 'PUBLISH' && `Are you sure you want to publish '${modalAction.item?.code}'?`}
                {modalAction.type === 'REOPEN' && `Reopen '${modalAction.item?.code}' for editing?`}
                {modalAction.type === 'ARCHIVE' && `Are you sure you want to archive '${modalAction.item?.code}'?`}
                {modalAction.type === 'RESTORE' && `Are you sure you want to restore '${modalAction.item?.code}'?`}
                {modalAction.type === 'DELETE' && `Delete '${modalAction.item?.code}' permanently?`}
                {modalAction.type === 'SUBMIT_REVIEW' && `Submit '${modalAction.item?.code}' for review?`}
                {modalAction.type === 'REQUEST_CHANGES' && `Request changes for '${modalAction.item?.code}'?`}
                {modalAction.type === 'APPROVE' && `Approve '${modalAction.item?.code}'?`}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
                {modalAction.type === 'PUBLISH' &&
                  'This will push approved content revisions to the live student portal so learners can access them.'}
                {modalAction.type === 'REOPEN' &&
                  'This will clone a new DRAFT revision from the published version so your team can make updates without disrupting live students.'}
                {modalAction.type === 'ARCHIVE' &&
                  'Archiving will hide this study material from active listings and search. You can restore it at any time.'}
                {modalAction.type === 'RESTORE' &&
                  'Restoring will re-activate this study material and return it to active lists.'}
                {modalAction.type === 'DELETE' &&
                  'This will permanently delete the draft and all its translations. This action cannot be undone.'}
                {modalAction.type === 'SUBMIT_REVIEW' &&
                  'This will submit the draft translations to reviewers. You will no longer be able to edit them unless changes are requested.'}
                {modalAction.type === 'REQUEST_CHANGES' &&
                  'This will return the review to the creator for adjustments before approval.'}
                {modalAction.type === 'APPROVE' &&
                  'This will mark the review as complete. It can then be published.'}
              </p>
            </div>
          </div>

          {modalAction.item && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '2px' }}>
                {modalAction.item.titleEn || modalAction.item.titleKn || modalAction.item.code}
              </div>
              <div style={{ color: '#64748B', fontSize: '12px' }}>
                Code: <span style={{ fontFamily: 'monospace' }}>{modalAction.item.code}</span>
              </div>
            </div>
          )}

          {/* Error notice if any */}
          {modalAction.error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} color="#DC2626" />
              <span>{modalAction.error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={modalAction.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={modalAction.type === 'DELETE' ? 'danger' : 'primary'}
              onClick={executeModalAction}
              isLoading={modalAction.isSubmitting}
              style={{
                backgroundColor:
                  modalAction.type === 'DELETE'
                    ? '#DC2626'
                    : modalAction.type === 'ARCHIVE'
                    ? '#D97706'
                    : modalAction.type === 'PUBLISH' || modalAction.type === 'APPROVE'
                    ? '#059669'
                    : '#2563EB',
                borderColor:
                  modalAction.type === 'DELETE'
                    ? '#DC2626'
                    : modalAction.type === 'ARCHIVE'
                    ? '#D97706'
                    : modalAction.type === 'PUBLISH' || modalAction.type === 'APPROVE'
                    ? '#059669'
                    : '#2563EB',
                color: '#FFFFFF'
              }}
            >
              {modalAction.type === 'PUBLISH' && 'Confirm & Publish'}
              {modalAction.type === 'REOPEN' && 'Confirm & Reopen'}
              {modalAction.type === 'ARCHIVE' && 'Confirm & Archive'}
              {modalAction.type === 'RESTORE' && 'Confirm & Restore'}
              {modalAction.type === 'DELETE' && 'Delete Permanently'}
              {modalAction.type === 'SUBMIT_REVIEW' && 'Confirm & Submit'}
              {modalAction.type === 'REQUEST_CHANGES' && 'Confirm & Request Changes'}
              {modalAction.type === 'APPROVE' && 'Confirm & Approve'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
