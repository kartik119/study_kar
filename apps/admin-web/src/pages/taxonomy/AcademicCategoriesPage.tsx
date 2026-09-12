import React, { useState, useEffect, useCallback } from 'react';
import { AcademicCategory, PermissionKey } from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Badge,
  StatusBadge,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Modal,
  FormField,
  Input,
  Select,
  Checkbox,
} from '@study-karnataka/ui';
import { AcademicTaxonomyApi, TaxonomyApiError } from '../../api/academic-taxonomy.api';
import { TaxonomyReorderModal } from '../../components/taxonomy/TaxonomyReorderModal';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUpDown,
  Layers,
  BookOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileQuestion,
  Sparkles,
} from 'lucide-react';

export const AcademicCategoriesPage: React.FC<{ moduleType?: string }> = ({ moduleType }) => {
  // Permission checks
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');
  const canManage = isSuperAdmin || userPermissions.includes('academic_taxonomy.manage');

  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Category Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AcademicCategory | null>(null);
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

  // Subcategory Modal State
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [subFormData, setSubFormData] = useState({
    categoryId: '',
    code: '',
    nameEn: '',
    nameKn: '',
    isActive: true,
  });

  // Reorder Modal State
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const list = await AcademicTaxonomyApi.getCategories({ search: search.trim() || undefined, moduleType });
      setCategories(list);
    } catch (err: any) {
      if (err instanceof TaxonomyApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Failed to load academic categories');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, moduleType]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, moduleType]);

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Auto-generation tracking
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [isSubCodeManual, setIsSubCodeManual] = useState(false);

  const generateUpperSnakeCode = (text: string, maxLen: number = 16): string => {
    if (!text) return '';

    // Extract alphanumeric words
    const rawWords = text
      .toUpperCase()
      .replace(/[^A-Z0-9\s_]/g, ' ')
      .split(/[\s_]+/)
      .filter(Boolean);

    if (rawWords.length === 0) return '';

    // Stop words to exclude for concise codes
    const stopWords = new Set([
      'AND', 'OF', 'THE', 'IN', 'FOR', 'TO', 'WITH', 'ON', 'AT', 'BY', 'FROM', 'ABOUT', 'AN', 'A', 'AS', 'OR', 'ITS',
    ]);

    const significantWords = rawWords.filter((w) => !stopWords.has(w));
    const words = significantWords.length > 0 ? significantWords : rawWords;

    // Pick 1-2 (or 3 short) words to keep code compact and readable
    const chosen: string[] = [];
    let curLen = 0;

    for (const word of words) {
      const nextLen = chosen.length === 0 ? word.length : curLen + 1 + word.length;

      // If we already have 1 word and adding this word exceeds maxLen
      if (chosen.length >= 1 && nextLen > maxLen) {
        const remainingSpace = maxLen - curLen - 1;
        if (chosen.length === 1 && remainingSpace >= 3) {
          chosen.push(word.slice(0, remainingSpace));
        }
        break;
      }

      // If we already have 2 words and length is substantial (>= 10), stop to keep it small
      if (chosen.length >= 2 && curLen >= 10) {
        break;
      }

      chosen.push(word);
      curLen = nextLen;

      if (chosen.length >= 3) break;
    }

    let code = chosen.join('_');
    if (code.length > maxLen) {
      code = code.slice(0, maxLen).replace(/_+$/, '');
    }

    return code;
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setIsCodeManual(false);
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
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openCreateSubcategoryModal = (parentCat?: AcademicCategory) => {
    const selectedParentId = parentCat?.id || '';
    setEditingSubcategory(null);
    setIsSubCodeManual(false);
    setSubFormData({
      categoryId: selectedParentId,
      code: '',
      nameEn: '',
      nameKn: '',
      isActive: true,
    });
    setIsSubFormOpen(true);
  };

  const openEditSubcategoryModal = (sub: any, parentCatId: string) => {
    setEditingSubcategory(sub);
    setIsSubCodeManual(true);
    setSubFormData({
      categoryId: parentCatId,
      code: sub.code,
      nameEn: sub.nameEn,
      nameKn: sub.nameKn,
      isActive: sub.isActive,
    });
    setIsSubFormOpen(true);
  };

  const openEditModal = (cat: AcademicCategory) => {
    setEditingCategory(cat);
    setIsCodeManual(true);
    setFormData({
      code: cat.code,
      nameEn: cat.nameEn,
      nameKn: cat.nameKn,
      shortNameEn: cat.shortNameEn || '',
      shortNameKn: cat.shortNameKn || '',
      slugEn: cat.slugEn || '',
      slugKn: cat.slugKn || '',
      descriptionEn: cat.descriptionEn || '',
      descriptionKn: cat.descriptionKn || '',
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
    setIsFormOpen(true);
  };

  const handleCategoryNameEnChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, nameEn: val };
      if (!isCodeManual && !editingCategory) {
        updated.code = generateUpperSnakeCode(prev.shortNameEn?.trim() || val);
      }
      return updated;
    });
  };

  const handleCategoryShortNameEnChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, shortNameEn: val };
      if (!isCodeManual && !editingCategory) {
        if (val.trim()) {
          updated.code = generateUpperSnakeCode(val);
        } else if (prev.nameEn.trim()) {
          updated.code = generateUpperSnakeCode(prev.nameEn);
        }
      }
      return updated;
    });
  };

  const handleCategoryCodeChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setIsCodeManual(Boolean(formatted.trim()));
    setFormData((prev) => ({
      ...prev,
      code: formatted,
    }));
  };

  const handleRegenerateCode = () => {
    setIsCodeManual(false);
    setFormData((prev) => ({
      ...prev,
      code: generateUpperSnakeCode(prev.shortNameEn?.trim() || prev.nameEn),
    }));
  };

  const handleSubNameEnChange = (val: string) => {
    setSubFormData((prev) => {
      const updated = { ...prev, nameEn: val };
      if (!isSubCodeManual) {
        updated.code = generateUpperSnakeCode(val);
      }
      return updated;
    });
  };

  const handleSubCodeChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setIsSubCodeManual(Boolean(formatted.trim()));
    setSubFormData((prev) => ({
      ...prev,
      code: formatted,
    }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let generatedCode = formData.code.trim() 
      ? formData.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30)
      : generateUpperSnakeCode(formData.shortNameEn) || generateUpperSnakeCode(formData.nameEn);

    if (!generatedCode || generatedCode.length < 2) {
      generatedCode = `CAT_${Date.now().toString().slice(-6)}`;
    }

    const generatedSlugEn = (formData.slugEn.trim() || formData.nameEn.trim())
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'category';

    const generatedSlugKn = (formData.slugKn.trim() || formData.nameKn.trim())
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\u0C80-\u0CFF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || generatedSlugEn;

    const payload = {
      ...formData,
      moduleType: moduleType || 'GENERAL',
      code: generatedCode,
      slugEn: generatedSlugEn,
      slugKn: generatedSlugKn
    };

    try {
      if (editingCategory) {
        await AcademicTaxonomyApi.updateCategory(editingCategory.id, payload);
      } else {
        await AcademicTaxonomyApi.createCategory(payload);
      }
      setIsFormOpen(false);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    }
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormData.categoryId) {
      alert('Please select a parent Category');
      return;
    }
    try {
      let generatedCode = subFormData.code.trim()
        ? subFormData.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30)
        : generateUpperSnakeCode(subFormData.nameEn);

      if (!generatedCode || generatedCode.length < 2) {
        generatedCode = `SUB_${Date.now().toString().slice(-6)}`;
      }

      const generatedSlugEn = subFormData.nameEn
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'subcategory';

      const generatedSlugKn = subFormData.nameKn
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9\u0C80-\u0CFF-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || generatedSlugEn;

      if (editingSubcategory) {
        await AcademicTaxonomyApi.updateSubcategory(editingSubcategory.id, {
          categoryId: subFormData.categoryId,
          code: generatedCode,
          nameEn: subFormData.nameEn.trim(),
          nameKn: subFormData.nameKn.trim(),
          slugEn: generatedSlugEn,
          slugKn: generatedSlugKn,
          isActive: subFormData.isActive,
        });
        alert(`Successfully updated subcategory '${subFormData.nameEn}'!`);
      } else {
        await AcademicTaxonomyApi.createSubcategory({
          categoryId: subFormData.categoryId,
          code: generatedCode,
          nameEn: subFormData.nameEn.trim(),
          nameKn: subFormData.nameKn.trim(),
          slugEn: generatedSlugEn,
          slugKn: generatedSlugKn,
          isActive: subFormData.isActive,
        });
        alert(`Successfully added subcategory '${subFormData.nameEn}'!`);
      }

      setIsSubFormOpen(false);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to create subcategory');
    }
  };

  const handleToggleActive = async (cat: AcademicCategory) => {
    try {
      await AcademicTaxonomyApi.toggleCategoryActive(cat.id, !cat.isActive);
      await loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (cat: AcademicCategory) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.nameEn}"?`)) {
      return;
    }
    try {
      await AcademicTaxonomyApi.deleteCategory(cat.id);
      await loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSubcategory = async (sub: any) => {
    if (!window.confirm(`Are you sure you want to delete subcategory "${sub.nameEn}"?`)) {
      return;
    }
    try {
      await AcademicTaxonomyApi.deleteSubcategory(sub.id);
      await loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <PageHeader
        title="Academic Categories"
        actions={
          canManage && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                leftIcon={<ArrowUpDown size={15} />}
                onClick={() => setIsReorderOpen(true)}
              >
                Reorder
              </Button>

              <Button
                variant="outline"
                leftIcon={<FolderPlus size={15} color="#059669" />}
                onClick={() => openCreateSubcategoryModal()}
              >
                + Add Subcategory
              </Button>

              <Button
                variant="primary"
                style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}
                leftIcon={<Plus size={15} />}
                onClick={openCreateCategoryModal}
              >
                + Add Category
              </Button>
            </div>
          )
        }
      />

      {/* Filter Card */}
      <Card style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category name or code..."
            />
          </div>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Total Categories: <strong>{categories.length}</strong>
          </div>
        </div>
      </Card>

      {/* MUTUALLY EXCLUSIVE STATES */}

      {/* 1. LOADING STATE */}
      {isLoading && (
        <Card style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading academic categories & subcategories...</p>
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
          title="Unable to load Academic Categories"
          message={error}
          onRetry={loadCategories}
        />
      )}

      {/* 4. SUCCESS BUT EMPTY STATE */}
      {!isLoading && !isForbidden && !error && categories.length === 0 && (
        <EmptyState
          title="No Academic Categories Found"
          description={search ? "No categories match your search filters." : "No academic categories created yet."}
          actionLabel={canManage ? "+ Add Category" : undefined}
          onAction={openCreateCategoryModal}
        />
      )}

      {/* 5. SUCCESSFUL DATA TABLE */}
      {!isLoading && !isForbidden && !error && categories.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6EAF0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase', width: '60px' }}>Order</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Category Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Subcategories</th>
                  {moduleType !== 'MCQ' && (
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Materials</th>
                  )}
                  {moduleType !== 'STUDY_MATERIAL' && (
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>MCQs</th>
                  )}
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Readiness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <React.Fragment key={cat.id}>
                    <tr style={{ borderBottom: '1px solid #E6EAF0', backgroundColor: expandedCategories.has(cat.id) ? '#FFFFFF' : '#FFFFFF', borderLeft: expandedCategories.has(cat.id) ? '4px solid #084B7A' : '4px solid transparent', boxShadow: expandedCategories.has(cat.id) ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none', transition: 'all 0.2s ease' }}>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 600 }}>{cat.displayOrder}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cat.subcategoryCount > 0 ? (
                          <button
                            onClick={() => toggleCategoryExpand(cat.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#64748B' }}
                          >
                            {expandedCategories.has(cat.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <div style={{ width: '16px' }} />
                        )}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#084B7A', backgroundColor: '#EAF3F9', border: '1px solid rgba(8, 75, 122, 0.2)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={cat.code}>
                          {cat.code}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px', marginBottom: '4px' }}>
                        {cat.nameEn}
                      </div>
                      <div style={{ color: '#64748B', fontFamily: "'Noto Sans Kannada', sans-serif", fontSize: '12px' }}>
                        {cat.nameKn}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={14} color="#3B82F6" />
                        {cat.subcategoryCount || 0}
                      </span>
                    </td>
                    {moduleType !== 'MCQ' && (
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <BookOpen size={14} color="#059669" />
                          {cat.studyMaterialCount || 0}
                        </span>
                      </td>
                    )}
                    {moduleType !== 'STUDY_MATERIAL' && (
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FileQuestion size={14} color="#8B5CF6" />
                          {cat.mcqCount || 0}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '14px 16px' }}>
                      <Badge
                        label={cat.nameEn && cat.nameKn ? 'Both Ready' : 'Incomplete'}
                        variant={cat.nameEn && cat.nameKn ? 'success' : 'warning'}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={cat.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {canManage && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<FolderPlus size={14} color="#059669" />}
                            onClick={() => openCreateSubcategoryModal(cat)}
                            title="Add Subcategory to this Category"
                          >
                            + Sub
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit2 size={14} color="#084B7A" />}
                            onClick={() => openEditModal(cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 size={14} color="#EF2323" />}
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  
                  {/* SUBCATEGORY ROWS */}
                  {expandedCategories.has(cat.id) && cat.subcategories && cat.subcategories.map((sub: any) => (
                    <tr key={sub.id} style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 16px 10px 36px', color: '#94A3B8', fontSize: '11px' }}>↳</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748B', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {sub.code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ color: '#334155', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                          {sub.nameEn}
                        </div>
                        <div style={{ color: '#94A3B8', fontFamily: "'Noto Sans Kannada', sans-serif", fontSize: '11px' }}>
                          {sub.nameKn}
                        </div>
                      </td>
                      {moduleType !== 'MCQ' && (
                        <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <BookOpen size={12} color="#059669" />
                            {sub.studyMaterialCount || 0}
                          </span>
                        </td>
                      )}
                      {moduleType !== 'STUDY_MATERIAL' && (
                        <td style={{ padding: '10px 16px', color: '#64748B', fontSize: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FileQuestion size={12} color="#8B5CF6" />
                            {(sub as any).mcqCount || 0}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '10px 16px' }}>
                        <Badge
                          label={sub.nameEn && sub.nameKn ? 'Both Ready' : 'Incomplete'}
                          variant={sub.nameEn && sub.nameKn ? 'success' : 'warning'}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <StatusBadge status={sub.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {canManage && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit2 size={12} color="#084B7A" />}
                              onClick={() => openEditSubcategoryModal(sub, cat.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 size={12} color="#EF2323" />}
                              onClick={() => handleDeleteSubcategory(sub)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Category Creation / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCategory ? 'Edit Academic Category' : 'Create Academic Category'}
      >
        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Name (English) *" required>
              <Input
                value={formData.nameEn}
                onChange={(e) => handleCategoryNameEnChange(e.target.value)}
                placeholder="e.g. History and Indian National Movement"
                required
              />
            </FormField>

            <FormField label="Name (Kannada) *" required>
              <Input
                value={formData.nameKn}
                onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
                placeholder="ಉದಾ. ಭಾರತದ ಇತಿಹಾಸ ಮತ್ತು ಭಾರತೀಯ ರಾಷ್ಟ್ರೀಯ ಚಳವಳಿ"
                style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Category Code"
            helperText="Auto-generated short code in UPPER_SNAKE_CASE (e.g. CURRENT_EVENTS, HISTORY)"
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Input
                value={formData.code}
                onChange={(e) => handleCategoryCodeChange(e.target.value)}
                placeholder="Auto-generated (e.g. HISTORY)"
                disabled={!!editingCategory}
                style={{ flex: 1 }}
              />
              {!editingCategory && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCode}
                  leftIcon={<Sparkles size={13} color="#2563EB" />}
                  style={{ whiteSpace: 'nowrap', height: '36px', fontSize: '12px' }}
                >
                  Auto-generate
                </Button>
              )}
            </div>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Short Name (English)">
              <Input
                value={formData.shortNameEn}
                onChange={(e) => handleCategoryShortNameEnChange(e.target.value)}
                placeholder="Hist."
              />
            </FormField>

            <FormField label="Short Name (Kannada)">
              <Input
                value={formData.shortNameKn}
                onChange={(e) => setFormData({ ...formData, shortNameKn: e.target.value })}
                placeholder="ಇತಿ."
                style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </FormField>
          </div>

          <FormField label="Description (English)">
            <Input
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              placeholder="General and Karnataka History topics"
            />
          </FormField>

          <FormField label="Description (Kannada)">
            <Input
              value={formData.descriptionKn}
              onChange={(e) => setFormData({ ...formData, descriptionKn: e.target.value })}
              placeholder="ಸಾಮಾನ್ಯ ಮತ್ತು ಕರ್ನಾಟಕ ಇತಿಹಾಸ ವಿಷಯಗಳು"
              style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
            />
          </FormField>

          <Checkbox
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            label="Active Status (Visible across administrative workflows)"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="ghost" type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subcategory Creation Modal */}
      <Modal
        isOpen={isSubFormOpen}
        onClose={() => setIsSubFormOpen(false)}
        title="Add New Subcategory"
      >
        <form onSubmit={handleSaveSubcategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Parent Category *" required>
            <Select
              value={subFormData.categoryId}
              onChange={(e) => setSubFormData({ ...subFormData, categoryId: e.target.value })}
              options={[
                { value: '', label: '-- Select Parent Category --' },
                ...categories.map((c) => ({ value: c.id, label: `${c.nameEn} (${c.nameKn})` })),
              ]}
              required
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Title (English) *" required>
              <Input
                value={subFormData.nameEn}
                onChange={(e) => handleSubNameEnChange(e.target.value)}
                placeholder="e.g. Ancient Indian History"
                required
              />
            </FormField>

            <FormField label="Title (Kannada) *" required>
              <Input
                value={subFormData.nameKn}
                onChange={(e) => setSubFormData({ ...subFormData, nameKn: e.target.value })}
                placeholder="ಉದಾ. ಪ್ರಾಚೀನ ಭಾರತೀಯ ಇತಿಹಾಸ"
                style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Subcategory Code"
            helperText="Auto-generated short code in UPPER_SNAKE_CASE (e.g. ANCIENT_HISTORY)"
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Input
                value={subFormData.code}
                onChange={(e) => handleSubCodeChange(e.target.value)}
                placeholder="Auto-generated (e.g. ANCIENT_HISTORY)"
                style={{ flex: 1 }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSubCodeManual(false);
                  setSubFormData((prev) => ({
                    ...prev,
                    code: generateUpperSnakeCode(prev.nameEn),
                  }));
                }}
                leftIcon={<Sparkles size={13} color="#059669" />}
                style={{ whiteSpace: 'nowrap', height: '36px', fontSize: '12px' }}
              >
                Auto-generate
              </Button>
            </div>
          </FormField>

          <Checkbox
            checked={subFormData.isActive}
            onChange={(e) => setSubFormData({ ...subFormData, isActive: e.target.checked })}
            label="Active Status"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="ghost" type="button" onClick={() => setIsSubFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              Create Subcategory
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Reorder Modal */}
      <TaxonomyReorderModal
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        title="Reorder Academic Categories"
        items={categories}
        onConfirm={async (reorderedItems) => {
          await AcademicTaxonomyApi.reorderCategories(reorderedItems);
          await loadCategories();
        }}
      />
    </div>
  );
};

export default AcademicCategoriesPage;
