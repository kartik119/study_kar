import React, { useState, useEffect, useCallback } from 'react';
import { AcademicCategory, AcademicTaxonomyTree, PermissionKey } from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Select,
  Badge,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Modal,
  FormField,
  Input,
  Checkbox,
} from '@study-karnataka/ui';
import { AcademicTaxonomyApi, TaxonomyApiError } from '../../api/academic-taxonomy.api';
import { TaxonomyMoveModal } from '../../components/taxonomy/TaxonomyMoveModal';
import { TaxonomyReorderModal } from '../../components/taxonomy/TaxonomyReorderModal';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  ArrowRightLeft,
  ArrowUpDown,
  Trash2,
  FolderTree,
  Layers,
  BookOpen,
} from 'lucide-react';

export const AcademicSubcategoriesPage: React.FC = () => {
  // Permission checks
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');
  const canManage = isSuperAdmin || userPermissions.includes('academic_taxonomy.manage');

  const [tree, setTree] = useState<AcademicTaxonomyTree | null>(null);
  const [categoriesList, setCategoriesList] = useState<AcademicCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Expanded nodes state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Move Modal State
  const [moveModalState, setMoveModalState] = useState<{
    isOpen: boolean;
    type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
    item: any | null;
    targetParents: Array<{ id: string; nameEn: string; code: string }>;
  }>({
    isOpen: false,
    type: 'SUBCATEGORY',
    item: null,
    targetParents: [],
  });

  // Reorder Modal State
  const [reorderModalState, setReorderModalState] = useState<{
    isOpen: boolean;
    type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
    title: string;
    items: any[];
  }>({
    isOpen: false,
    type: 'SUBCATEGORY',
    title: '',
    items: [],
  });

  // Create / Edit Modal State
  const [itemModalState, setItemModalState] = useState<{
    isOpen: boolean;
    type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
    editingItem: any | null;
    parentId: string;
  }>({
    isOpen: false,
    type: 'SUBCATEGORY',
    editingItem: null,
    parentId: '',
  });

  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameKn: '',
    shortNameEn: '',
    shortNameKn: '',
    slugEn: '',
    slugKn: '',
    descriptionEn: '',
    descriptionKn: '',
    displayOrder: 1,
    isActive: true,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const [treeData, cats] = await Promise.all([
        AcademicTaxonomyApi.getTaxonomyTree({ search: search.trim() || undefined, categoryId: selectedCategoryId || undefined }),
        AcademicTaxonomyApi.getCategories(),
      ]);
      setTree(treeData);
      setCategoriesList(cats);

      // Default expand top categories
      const initialExpanded: Record<string, boolean> = {};
      treeData.categories.forEach((c) => {
        initialExpanded[`cat_${c.id}`] = true;
      });
      setExpandedNodes((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err: any) {
      if (err instanceof TaxonomyApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Failed to load taxonomy tree');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (nodeKey: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const openMoveModal = async (type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA', item: any) => {
    if (!canManage) return;
    let targetParents: Array<{ id: string; nameEn: string; code: string }> = [];
    if (type === 'SUBCATEGORY') {
      targetParents = categoriesList.map((c) => ({ id: c.id, nameEn: c.nameEn, code: c.code }));
    } else if (type === 'TOPIC') {
      const subs = await AcademicTaxonomyApi.getSubcategories();
      targetParents = subs.map((s) => ({ id: s.id, nameEn: s.nameEn, code: s.code }));
    } else if (type === 'KNOWLEDGE_AREA') {
      const topics = await AcademicTaxonomyApi.getTopics();
      targetParents = topics.map((t) => ({ id: t.id, nameEn: t.nameEn, code: t.code }));
    }

    setMoveModalState({
      isOpen: true,
      type,
      item,
      targetParents,
    });
  };

  const handleConfirmMove = async (targetParentId: string, reason?: string) => {
    if (!canManage) return;
    const { type, item } = moveModalState;
    if (!item) return;

    if (type === 'SUBCATEGORY') {
      await AcademicTaxonomyApi.moveSubcategory(item.id, targetParentId, reason);
    } else if (type === 'TOPIC') {
      await AcademicTaxonomyApi.moveTopic(item.id, targetParentId, reason);
    } else if (type === 'KNOWLEDGE_AREA') {
      await AcademicTaxonomyApi.moveKnowledgeArea(item.id, targetParentId, reason);
    }
    setMoveModalState({ isOpen: false, type: 'SUBCATEGORY', item: null, targetParents: [] });
    loadData();
  };

  const openReorderModal = (type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA', title: string, items: any[]) => {
    if (!canManage) return;
    setReorderModalState({
      isOpen: true,
      type,
      title,
      items,
    });
  };

  const handleConfirmReorder = async (reorderedItems: Array<{ id: string; displayOrder: number }>) => {
    if (!canManage) return;
    const { type } = reorderModalState;
    if (type === 'SUBCATEGORY') {
      await AcademicTaxonomyApi.reorderSubcategories(reorderedItems);
    } else if (type === 'TOPIC') {
      await AcademicTaxonomyApi.reorderTopics(reorderedItems);
    } else if (type === 'KNOWLEDGE_AREA') {
      await AcademicTaxonomyApi.reorderKnowledgeAreas(reorderedItems);
    }
    setReorderModalState({ isOpen: false, type: 'SUBCATEGORY', title: '', items: [] });
    loadData();
  };

  const openItemModal = (type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA', parentId: string, editingItem?: any) => {
    if (!canManage) return;
    if (editingItem) {
      setFormData({
        code: editingItem.code,
        nameEn: editingItem.nameEn,
        nameKn: editingItem.nameKn,
        shortNameEn: editingItem.shortNameEn || '',
        shortNameKn: editingItem.shortNameKn || '',
        slugEn: editingItem.slugEn,
        slugKn: editingItem.slugKn,
        descriptionEn: editingItem.descriptionEn || '',
        descriptionKn: editingItem.descriptionKn || '',
        displayOrder: editingItem.displayOrder,
        isActive: editingItem.isActive,
      });
    } else {
      setFormData({
        code: '',
        nameEn: '',
        nameKn: '',
        shortNameEn: '',
        shortNameKn: '',
        slugEn: '',
        slugKn: '',
        descriptionEn: '',
        descriptionKn: '',
        displayOrder: 1,
        isActive: true,
      });
    }

    setItemModalState({
      isOpen: true,
      type,
      editingItem: editingItem || null,
      parentId,
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const { type, editingItem, parentId } = itemModalState;

    try {
      if (type === 'SUBCATEGORY') {
        if (editingItem) {
          await AcademicTaxonomyApi.updateSubcategory(editingItem.id, formData);
        } else {
          await AcademicTaxonomyApi.createSubcategory({ ...formData, categoryId: parentId });
        }
      } else if (type === 'TOPIC') {
        if (editingItem) {
          await AcademicTaxonomyApi.updateTopic(editingItem.id, formData);
        } else {
          await AcademicTaxonomyApi.createTopic({ ...formData, subcategoryId: parentId });
        }
      } else if (type === 'KNOWLEDGE_AREA') {
        if (editingItem) {
          await AcademicTaxonomyApi.updateKnowledgeArea(editingItem.id, formData);
        } else {
          await AcademicTaxonomyApi.createKnowledgeArea({ ...formData, topicId: parentId });
        }
      }
      setItemModalState({ isOpen: false, type: 'SUBCATEGORY', editingItem: null, parentId: '' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteItem = async (type: 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA', item: any) => {
    if (!canManage) return;
    if (!window.confirm(`Delete ${type.toLowerCase()} '${item.nameEn}'?`)) return;
    try {
      if (type === 'SUBCATEGORY') await AcademicTaxonomyApi.deleteSubcategory(item.id);
      else if (type === 'TOPIC') await AcademicTaxonomyApi.deleteTopic(item.id);
      else if (type === 'KNOWLEDGE_AREA') await AcademicTaxonomyApi.deleteKnowledgeArea(item.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Cannot delete item with dependent records.');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <PageHeader
        title="Subcategories & Taxonomy Tree"
        subtitle="Interactive 4-level academic hierarchy (Category → Subcategory → Topic → Knowledge Area)."
      />

      {/* Filter Card */}
      <Card style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search taxonomy by code or keyword..."
            />
          </div>

          <div style={{ width: '260px' }}>
            <Select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              options={[
                { label: `All Categories (${categoriesList.length})`, value: '' },
                ...categoriesList.map((c) => ({ label: `${c.nameEn} (${c.code})`, value: c.id })),
              ]}
            />
          </div>

          {tree && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748B' }}>
              <span>Categories: <strong style={{ color: '#111827' }}>{tree.totalCategories}</strong></span>
              <span>Subcategories: <strong style={{ color: '#EF2323' }}>{tree.totalSubcategories}</strong></span>
              <span>Topics: <strong style={{ color: '#2563EB' }}>{tree.totalTopics}</strong></span>
              <span>Knowledge Areas: <strong style={{ color: '#059669' }}>{tree.totalKnowledgeAreas}</strong></span>
            </div>
          )}
        </div>
      </Card>

      {/* MUTUALLY EXCLUSIVE STATES */}

      {/* 1. LOADING STATE */}
      {isLoading && (
        <Card style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading academic taxonomy tree...</p>
        </Card>
      )}

      {/* 2. FORBIDDEN 403 STATE */}
      {!isLoading && isForbidden && (
        <ErrorState
          title="403 — Access Forbidden"
          message="Your administrative role does not have permission to manage Academic Taxonomy."
        />
      )}

      {/* 3. API ERROR STATE */}
      {!isLoading && !isForbidden && error && (
        <ErrorState
          title="Unable to load Taxonomy Tree"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* 4. SUCCESS BUT EMPTY STATE */}
      {!isLoading && !isForbidden && !error && (!tree || tree.categories.length === 0) && (
        <EmptyState
          title="No Academic Taxonomy Nodes Found"
          description="Create categories and subcategories to populate the taxonomy tree."
        />
      )}

      {/* 5. SUCCESS WITH TREE DATA STATE */}
      {!isLoading && !isForbidden && !error && tree && tree.categories.length > 0 && (
        <Card style={{ padding: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid #E6EAF0' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tree.categories.map((cat) => {
              const catKey = `cat_${cat.id}`;
              const isCatExpanded = expandedNodes[catKey];

              return (
                <div key={cat.id} style={{ borderRadius: '12px', border: '1px solid #E6EAF0', backgroundColor: '#FFFFFF', padding: '16px' }}>
                  {/* Tier 1 Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => toggleExpand(catKey)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}
                      >
                        {isCatExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      <FolderTree size={20} color="#EF2323" />
                      <div>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>{cat.nameEn}</span>
                        <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#EF2323' }}>({cat.code})</span>
                        <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748B' }}>{cat.nameKn}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{cat.subcategories?.length || 0} subcategories</span>

                      {canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ArrowUpDown size={14} />}
                            onClick={() => openReorderModal('SUBCATEGORY', `Reorder Subcategories under ${cat.nameEn}`, cat.subcategories || [])}
                          >
                            Reorder
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}
                            leftIcon={<Plus size={14} />}
                            onClick={() => openItemModal('SUBCATEGORY', cat.id)}
                          >
                            Add Subcategory
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Level 2 Subcategories */}
                  {isCatExpanded && cat.subcategories && (
                    <div style={{ marginTop: '12px', marginLeft: '24px', paddingLeft: '16px', borderLeft: '2px solid #E6EAF0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cat.subcategories.map((sub) => {
                        const subKey = `sub_${sub.id}`;
                        const isSubExpanded = expandedNodes[subKey];

                        return (
                          <div key={sub.id} style={{ borderRadius: '8px', border: '1px solid #E6EAF0', backgroundColor: '#FFFFFF', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  onClick={() => toggleExpand(subKey)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                                >
                                  {isSubExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                <Layers size={18} color="#2563EB" />
                                <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{sub.nameEn}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#2563EB' }}>({sub.code})</span>
                                <span style={{ fontSize: '13px', color: '#64748B' }}>{sub.nameKn}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {canManage && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openMoveModal('SUBCATEGORY', sub)}
                                      title="Move Subcategory"
                                    >
                                      <ArrowRightLeft size={14} color="#64748B" />
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openReorderModal('TOPIC', `Reorder Topics under ${sub.nameEn}`, sub.topics || [])}
                                    >
                                      Topics Order
                                    </Button>

                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      leftIcon={<Plus size={14} />}
                                      onClick={() => openItemModal('TOPIC', sub.id)}
                                    >
                                      Add Topic
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openItemModal('SUBCATEGORY', cat.id, sub)}
                                    >
                                      <Edit2 size={14} color="#2563EB" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteItem('SUBCATEGORY', sub)}
                                    >
                                      <Trash2 size={14} color="#EF2323" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Level 3 Topics */}
                            {isSubExpanded && sub.topics && (
                              <div style={{ marginTop: '10px', marginLeft: '20px', paddingLeft: '14px', borderLeft: '2px solid #93C5FD', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sub.topics.map((top) => {
                                  const topKey = `top_${top.id}`;
                                  const isTopExpanded = expandedNodes[topKey];

                                  return (
                                    <div key={top.id} style={{ borderRadius: '6px', border: '1px solid #E6EAF0', backgroundColor: '#F8FAFC', padding: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            onClick={() => toggleExpand(topKey)}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                                          >
                                            {isTopExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                          </button>
                                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{top.nameEn}</span>
                                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7C3AED' }}>({top.code})</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {canManage && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openMoveModal('TOPIC', top)}
                                                title="Move Topic"
                                              >
                                                <ArrowRightLeft size={14} color="#64748B" />
                                              </Button>

                                              <Button
                                                variant="outline"
                                                size="sm"
                                                leftIcon={<Plus size={12} />}
                                                onClick={() => openItemModal('KNOWLEDGE_AREA', top.id)}
                                              >
                                                Add KA
                                              </Button>

                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openItemModal('TOPIC', sub.id, top)}
                                              >
                                                <Edit2 size={14} color="#2563EB" />
                                              </Button>

                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteItem('TOPIC', top)}
                                              >
                                                <Trash2 size={14} color="#EF2323" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Level 4 Knowledge Areas */}
                                      {isTopExpanded && top.knowledgeAreas && (
                                        <div style={{ marginTop: '8px', marginLeft: '16px', paddingLeft: '12px', borderLeft: '2px solid #C4B5FD', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {top.knowledgeAreas.map((ka) => (
                                            <div key={ka.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '4px', border: '1px solid #E6EAF0', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <BookOpen size={14} color="#059669" />
                                                <span style={{ fontWeight: 500, color: '#111827' }}>{ka.nameEn}</span>
                                                <span style={{ fontFamily: 'monospace', color: '#64748B' }}>({ka.code})</span>
                                                <span style={{ color: '#64748B' }}>{ka.nameKn}</span>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Badge label={`${ka.studyMaterialCount || 0} mapped`} variant="neutral" />
                                                {canManage && (
                                                  <>
                                                    <button onClick={() => openMoveModal('KNOWLEDGE_AREA', ka)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                                                      <ArrowRightLeft size={12} />
                                                    </button>
                                                    <button onClick={() => openItemModal('KNOWLEDGE_AREA', top.id, ka)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563EB' }}>
                                                      <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => handleDeleteItem('KNOWLEDGE_AREA', ka)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF2323' }}>
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Item Form Modal */}
      <Modal
        isOpen={itemModalState.isOpen}
        onClose={() => setItemModalState({ ...itemModalState, isOpen: false })}
        title={itemModalState.editingItem ? `Edit ${itemModalState.type}` : `Create New ${itemModalState.type}`}
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Code *" required helperText="e.g. MODERN_KARNATAKA">
              <Input
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MODERN_KARNATAKA"
              />
            </FormField>

            <FormField label="Display Order">
              <Input
                type="number"
                min={1}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="English Name *" required>
              <Input
                required
                value={formData.nameEn}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    nameEn: val,
                    slugEn: formData.slugEn || val.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  });
                }}
              />
            </FormField>

            <FormField label="Kannada Name *" required>
              <Input
                required
                value={formData.nameKn}
                onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="English Slug *" required>
              <Input
                required
                value={formData.slugEn}
                onChange={(e) => setFormData({ ...formData, slugEn: e.target.value })}
              />
            </FormField>

            <FormField label="Kannada Slug *" required>
              <Input
                required
                value={formData.slugKn}
                onChange={(e) => setFormData({ ...formData, slugKn: e.target.value })}
              />
            </FormField>
          </div>

          <Checkbox
            label="Active Status"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button type="button" variant="outline" onClick={() => setItemModalState({ ...itemModalState, isOpen: false })}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}>
              Save Node
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Modal */}
      <TaxonomyMoveModal
        isOpen={moveModalState.isOpen}
        onClose={() => setMoveModalState({ ...moveModalState, isOpen: false })}
        title={`Move ${moveModalState.type}`}
        itemName={moveModalState.item?.nameEn || ''}
        itemCode={moveModalState.item?.code || ''}
        targetParents={moveModalState.targetParents}
        onConfirm={handleConfirmMove}
      />

      {/* Reorder Modal */}
      <TaxonomyReorderModal
        isOpen={reorderModalState.isOpen}
        onClose={() => setReorderModalState({ ...reorderModalState, isOpen: false })}
        title={reorderModalState.title}
        items={reorderModalState.items}
        onConfirm={handleConfirmReorder}
      />
    </div>
  );
};
