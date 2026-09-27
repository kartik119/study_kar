import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PageHeader,
  MetricCard,
  SearchInput,
  Select,
  Button,
  IconButton,
  Table,
  Pagination,
  StatusBadge,
  Badge,
  DropdownMenu,
  Modal,
  Drawer,
  Alert,
  FormField,
  Input,
  Textarea,
  LoadingSpinner,
  EmptyState,
} from '@study-karnataka/ui';
import {
  Package,
  Layers,
  Users,
  CheckCircle2,
  CreditCard,
  Plus,
  Download,
  Filter,
  Eye,
  Edit2,
  Key,
  Archive,
  Power,
  Sparkles,
  X,
  Check,
  Calendar,
  Tag,
  BookOpen,
  Award,
  Zap,
  FileText,
  FileQuestion,
} from 'lucide-react';
import {
  ProductsApi,
  Product,
  ProductCategory,
  ProductMetrics,
  ProductAccessType,
  ProductStatus,
  ProductEntitlement,
  CreateProductPayload,
  UpdateProductPayload,
  ProductScopeType,
  ProductType
} from '../../api/products.api';

const ACCESS_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Access Types' },
  { value: 'FREE', label: 'Free' },
  { value: 'FREEMIUM', label: 'Freemium' },
  { value: 'PAID', label: 'Paid' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const STANDARD_ENTITLEMENTS = [
  { key: 'exam_access', name: 'Exam Access', description: 'Access to syllabus & curriculum materials' },
  { key: 'study_material_access', name: 'Study Material Access', description: 'Access to study material vaults & PDFs' },
  { key: 'current_affairs_access', name: 'Current Affairs Access', description: 'Access to daily digests & monthly magazines' },
  { key: 'quick_revision_access', name: 'Quick Revision Access', description: 'Access to fast-track revision flashcards' },
  { key: 'mock_test_access', name: 'Mock Test Access', description: 'Access to full-length exam simulations' },
  { key: 'test_series_access', name: 'Test Series Access', description: 'Access to ranked state test series' },
  { key: 'premium_content_access', name: 'Premium Content Access', description: 'Exclusive masterclasses & mentorship' },
];

export const ProductsPage: React.FC = () => {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [exams, setExams] = useState<Array<{ id: string; titleEn: string; cycleYear: number }>>([]);
  const [metrics, setMetrics] = useState<ProductMetrics>({
    totalProducts: 0,
    activeProducts: 0,
    paidProducts: 0,
    studentsEnrolled: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{ type: 'info' | 'success' | 'warning' | 'danger'; title: string; message: string } | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryIdFilter, setCategoryIdFilter] = useState('ALL');
  const [accessTypeFilter, setAccessTypeFilter] = useState('ALL');
  const [examIdFilter, setExamIdFilter] = useState('ALL');
  const [productTypeFilter, setProductTypeFilter] = useState('ALL');
  const [scopeTypeFilter, setScopeTypeFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(true);

  // Modals & Drawers state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEntitlementsModalOpen, setIsEntitlementsModalOpen] = useState(false);
  const [entitlementsProduct, setEntitlementsProduct] = useState<Product | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  
  // Categories Management State
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', code: '', description: '', isActive: true });
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
    categoryId: string;
    examId: string;
    scopeType: ProductScopeType;
    productType: ProductType;
    accessType: ProductAccessType;
    status: ProductStatus;
    imageUrl: string;
    displayOrder: number;
    publishDate: string;
    features: string[];
    newFeature: string;
    entitlements: Array<{ entitlementKey: string; name: string; description?: string }>;
    plans: Array<{ name: string; code: string; price: number; duration: number; durationUnit: 'DAYS' | 'MONTHS' | 'YEARS' }>;
  }>({
    name: '',
    code: '',
    description: '',
    categoryId: '',
    examId: '',
    scopeType: 'SPECIFIC_MODULES' as ProductScopeType,
    productType: 'CUSTOM_BUNDLE' as ProductType,
    accessType: 'PAID',
    status: 'DRAFT',
    imageUrl: '',
    displayOrder: 0,
    publishDate: '',
    features: [],
    newFeature: '',
    entitlements: [],
    plans: [],
  });

  // Plan row input state for form
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState<number>(499);
  const [newPlanDuration, setNewPlanDuration] = useState<number>(3);
  const [newPlanUnit, setNewPlanUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('MONTHS');

  // Load Metrics
  const loadMetrics = useCallback(async () => {
    try {
      const data = await ProductsApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

  // Load Categories & Exams
  const loadCategories = useCallback(async () => {
    try {
      const data = await ProductsApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadExams = useCallback(async () => {
    try {
      const data = await ProductsApi.getExams();
      setExams(data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    }
  }, []);

  // Load Products list
  const loadProducts = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      try {
        const res = await ProductsApi.getProducts({
          page: pageToLoad,
          pageSize: pagination.pageSize,
          search: search.trim() || undefined,
          status: statusFilter,
          categoryId: categoryIdFilter,
          accessType: accessTypeFilter,
          examId: examIdFilter,
          productType: productTypeFilter,
          scopeType: scopeTypeFilter,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        setProducts(res.items);
        setPagination(res.pagination);
      } catch (err: any) {
        setAlertInfo({
          type: 'danger',
          title: 'Unable to load products',
          message: err.message || 'Please check your connection and try again.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.pageSize, search, statusFilter, categoryIdFilter, accessTypeFilter, examIdFilter, productTypeFilter, scopeTypeFilter]
  );

  useEffect(() => {
    loadCategories();
    loadExams();
    loadProducts(1);
    loadMetrics();
  }, [loadCategories, loadExams, loadProducts, loadMetrics]);

  // Code generator helper
  const generateCodeFromName = (name: string) => {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleNameChange = (nameVal: string) => {
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      code: !editingProduct ? generateCodeFromName(nameVal) : prev.code,
    }));
  };

  const handleAddFeature = () => {
    if (!formData.newFeature.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, prev.newFeature.trim()],
      newFeature: '',
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleAddPlanRow = () => {
    if (!newPlanName.trim()) return;
    const planCode = `${formData.code || 'PLAN'}_${newPlanName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    setFormData((prev) => ({
      ...prev,
      plans: [
        ...prev.plans,
        {
          name: newPlanName.trim(),
          code: planCode,
          price: Number(newPlanPrice) || 0,
          duration: Number(newPlanDuration) || 1,
          durationUnit: newPlanUnit,
        },
      ],
    }));
    setNewPlanName('');
    setNewPlanPrice(499);
    setNewPlanDuration(3);
  };

  const handleRemovePlanRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index),
    }));
  };

  const handleToggleEntitlement = (ent: { key: string; name: string; description: string }) => {
    setFormData((prev) => {
      const exists = prev.entitlements.some((e) => e.entitlementKey === ent.key);
      if (exists) {
        return {
          ...prev,
          entitlements: prev.entitlements.filter((e) => e.entitlementKey !== ent.key),
        };
      } else {
        return {
          ...prev,
          entitlements: [
            ...prev.entitlements,
            { entitlementKey: ent.key, name: ent.name, description: ent.description },
          ],
        };
      }
    });
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      examId: '',
      scopeType: 'SPECIFIC_MODULES',
      productType: 'CUSTOM_BUNDLE',
      accessType: 'PAID',
      status: 'ACTIVE',
      imageUrl: '',
      displayOrder: 0,
      publishDate: new Date().toISOString().split('T')[0],
      features: [],
      newFeature: '',
      entitlements: [
        { entitlementKey: 'exam_access', name: 'Exam Access', description: 'Full syllabus exam access' },
      ],
      plans: [],
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      description: product.description || '',
      categoryId: product.categoryId || '',
      examId: product.examId || '',
      scopeType: product.scopeType || 'SPECIFIC_MODULES',
      productType: product.productType || 'CUSTOM_BUNDLE',
      accessType: product.accessType,
      status: product.status,
      imageUrl: product.imageUrl || '',
      displayOrder: product.displayOrder || 0,
      publishDate: product.publishDate ? new Date(product.publishDate).toISOString().split('T')[0] : '',
      features: product.features || [],
      newFeature: '',
      entitlements: product.entitlements || [],
      plans: (product.plans || []).map((p) => ({
        name: p.name,
        code: p.code,
        price: Number(p.price),
        duration: p.duration,
        durationUnit: p.durationUnit,
      })),
    });
    setIsFormModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const res = await ProductsApi.uploadProductImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: res.url }));
      setAlertInfo({ type: 'success', title: 'Upload Successful', message: 'Image uploaded successfully.' });
    } catch (err: any) {
      setAlertInfo({ type: 'danger', title: 'Upload Failed', message: err.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingImage(false);
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  // Submit Product Form (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setAlertInfo({ type: 'warning', title: 'Validation Warning', message: 'Product Name is required.' });
      return;
    }

    try {
      if (editingProduct) {
        const payload: UpdateProductPayload = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          categoryId: formData.categoryId,
          examId: formData.examId,
          scopeType: formData.scopeType,
          productType: formData.productType,
          accessType: formData.accessType,
          status: isDraft ? 'DRAFT' : formData.status,
          imageUrl: formData.imageUrl,
          displayOrder: Number(formData.displayOrder) || 0,
          publishDate: formData.publishDate || undefined,
          features: formData.features,
          entitlements: formData.entitlements,
        };
        await ProductsApi.updateProduct(editingProduct.id, payload);
        setAlertInfo({
          type: 'success',
          title: 'Product Updated',
          message: `Product '${formData.name}' has been updated successfully.`,
        });
      } else {
        const payload: CreateProductPayload = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          categoryId: formData.categoryId,
          examId: formData.examId,
          scopeType: formData.scopeType,
          productType: formData.productType,
          accessType: formData.accessType,
          status: isDraft ? 'DRAFT' : formData.status,
          imageUrl: formData.imageUrl,
          displayOrder: Number(formData.displayOrder) || 0,
          publishDate: formData.publishDate || undefined,
          features: formData.features,
          entitlements: formData.entitlements,
          plans: formData.plans,
        };
        await ProductsApi.createProduct(payload);
        setAlertInfo({
          type: 'success',
          title: 'Product Created',
          message: `Product '${formData.name}' created successfully.`,
        });
      }

      setIsFormModalOpen(false);
      loadProducts(pagination.page);
      loadMetrics();
    } catch (err: any) {
      setAlertInfo({
        type: 'danger',
        title: 'Error Saving Product',
        message: err.message || 'Operation failed. Please check inputs and try again.',
      });
    }
  };

  // Toggle Activate / Deactivate
  const handleToggleActive = async (product: Product) => {
    if (product.status === 'ACTIVE') {
      setProductToDeactivate(product);
      setIsDeactivateModalOpen(true);
    } else {
      try {
        await ProductsApi.setProductStatus(product.id, 'ACTIVE');
        setAlertInfo({
          type: 'success',
          title: 'Product Activated',
          message: `Product '${product.name}' is now active and live.`,
        });
        loadProducts(pagination.page);
        loadMetrics();
      } catch (err: any) {
        setAlertInfo({
          type: 'danger',
          title: 'Activation Failed',
          message: err.message || 'Failed to activate product.',
        });
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!productToDeactivate) return;
    try {
      await ProductsApi.setProductStatus(productToDeactivate.id, 'INACTIVE');
      setAlertInfo({
        type: 'info',
        title: 'Product Deactivated',
        message: `Product '${productToDeactivate.name}' has been marked inactive.`,
      });
      setIsDeactivateModalOpen(false);
      setProductToDeactivate(null);
      loadProducts(pagination.page);
      loadMetrics();
    } catch (err: any) {
      setAlertInfo({
        type: 'danger',
        title: 'Deactivation Failed',
        message: err.message || 'Failed to deactivate product.',
      });
    }
  };

  // Safe Archive
  const handleOpenArchiveModal = (product: Product) => {
    setProductToArchive(product);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!productToArchive) return;
    try {
      const res = await ProductsApi.archiveProduct(productToArchive.id);
      setAlertInfo({
        type: 'warning',
        title: 'Product Archived',
        message: res.message || `Product '${productToArchive.name}' safely archived.`,
      });
      setIsArchiveModalOpen(false);
      setProductToArchive(null);
      loadProducts(pagination.page);
      loadMetrics();
    } catch (err: any) {
      setAlertInfo({
        type: 'danger',
        title: 'Archive Failed',
        message: err.message || 'Failed to archive product.',
      });
    }
  };

  // Manage Entitlements Modal
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([]);
  const [customKey, setCustomKey] = useState('');
  const [customName, setCustomName] = useState('');

  const handleOpenEntitlementsModal = (product: Product) => {
    setEntitlementsProduct(product);
    setSelectedEntitlements((product.entitlements || []).map((e) => e.entitlementKey));
    setIsEntitlementsModalOpen(true);
  };

  const handleSaveEntitlements = async () => {
    if (!entitlementsProduct) return;
    try {
      const payload = selectedEntitlements.map((key) => {
        const found = STANDARD_ENTITLEMENTS.find((e) => e.key === key);
        return {
          entitlementKey: key,
          name: found ? found.name : key,
          description: found ? found.description : undefined,
        };
      });

      await ProductsApi.manageEntitlements(entitlementsProduct.id, payload);
      setAlertInfo({
        type: 'success',
        title: 'Entitlements Updated',
        message: `Entitlements updated for '${entitlementsProduct.name}'.`,
      });
      setIsEntitlementsModalOpen(false);
      setEntitlementsProduct(null);
      loadProducts(pagination.page);
    } catch (err: any) {
      setAlertInfo({
        type: 'danger',
        title: 'Entitlement Update Failed',
        message: err.message || 'Failed to update entitlements.',
      });
    }
  };

  const handleAddCustomEntitlement = () => {
    if (!customKey.trim() || !customName.trim()) return;
    const cleanKey = customKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!selectedEntitlements.includes(cleanKey)) {
      setSelectedEntitlements([...selectedEntitlements, cleanKey]);
    }
    setCustomKey('');
    setCustomName('');
  };

  // Export CSV
  const handleExport = async () => {
    try {
      await ProductsApi.exportProducts({
        search: search.trim() || undefined,
        status: statusFilter,
        categoryId: categoryIdFilter,
        accessType: accessTypeFilter,
      });
      setAlertInfo({
        type: 'success',
        title: 'Export Started',
        message: 'Product catalog CSV export downloaded successfully.',
      });
    } catch (err: any) {
      setAlertInfo({
        type: 'danger',
        title: 'Export Failed',
        message: err.message || 'Unable to export products.',
      });
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryIdFilter('ALL');
    setAccessTypeFilter('ALL');
  };

  // Category Helpers
  const renderCategoryBadge = (category?: ProductCategory | null) => {
    if (!category) return <Badge label="Uncategorized" variant="neutral" />;
    return <Badge label={category.name} variant="info" />;
  };

  const getProductIcon = (category?: ProductCategory | null) => {
    return <Package size={18} color="#475569" />;
  };

  // Visual Helper: Access Type Badge
  const renderAccessTypeBadge = (accessType: ProductAccessType) => {
    if (accessType === 'FREE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #BBF7D0',
          }}
        >
          Free
        </span>
      );
    }
    if (accessType === 'FREEMIUM') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#E0F2FE',
            color: '#0369A1',
            border: '1px solid #BAE6FD',
          }}
        >
          Freemium
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#F3E8FF',
          color: '#7E22CE',
          border: '1px solid #E9D5FF',
        }}
      >
        Paid
      </span>
    );
  };

  // (getProductIcon already moved above)

  const tableHeaders = [
    'Product Name & Code',
    'Exam',
    'Scope',
    'Product Type',
    'Category',
    'Access Type',
    'Plans',
    'Students',
    'Status',
    'Created',
    'Actions',
  ];

  // Table Rows
  const tableRows = useMemo(() => {
    return products.map((product) => {
      const actions = [
        {
          label: 'View Details',
          icon: <Eye size={14} />,
          onClick: () => {
            setSelectedProduct(product);
            setIsDetailsDrawerOpen(true);
          },
        },
        {
          label: 'Edit Product',
          icon: <Edit2 size={14} />,
          onClick: () => handleOpenEditModal(product),
        },
        {
          label: 'Manage Entitlements',
          icon: <Key size={14} />,
          onClick: () => handleOpenEntitlementsModal(product),
        },
        {
          label: product.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
          icon: <Power size={14} />,
          onClick: () => handleToggleActive(product),
        },
        {
          label: 'Archive',
          icon: <Archive size={14} />,
          danger: true,
          onClick: () => handleOpenArchiveModal(product),
        },
      ];

      return [
        // Product Name & Code
        <div key="name" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
            ) : (
              getProductIcon(product.category)
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{product.name}</span>
            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{product.code}</span>
          </div>
        </div>,

        // Exam
        <div key="exam" style={{ fontSize: '13px', color: '#334155' }}>
          {product.exam ? product.exam.titleEn : <span style={{ color: '#94A3B8' }}>Global</span>}
        </div>,

        // Scope
        <div key="scope">
          <Badge text={product.scopeType?.replace(/_/g, ' ')} variant="neutral" />
        </div>,

        // Product Type
        <div key="productType">
          <Badge text={product.productType?.replace(/_/g, ' ')} variant="info" />
        </div>,

        // Category
        <div key="category">{renderCategoryBadge(product.category)}</div>,

        // Access Type
        <div key="access">{renderAccessTypeBadge(product.accessType)}</div>,

        // Associated Plans
        <div key="plans" style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
          {product.plansCount > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
              onClick={() => {
                setSelectedProduct(product);
                setIsDetailsDrawerOpen(true);
              }}
              title="Click to view plans"
            >
              <CreditCard size={12} color="#64748B" />
              {product.plansCount} {product.plansCount === 1 ? 'Plan' : 'Plans'}
            </span>
          ) : (
            <span style={{ color: '#94A3B8' }}>{product.accessType === 'FREE' ? 'Free (No Plan)' : '0 Plans'}</span>
          )}
        </div>,

        // Students
        <div key="students" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Users size={13} color="#64748B" />
            {product.studentsCount}
          </span>
        </div>,

        // Status
        <div key="status">
          <StatusBadge status={product.status} />
        </div>,

        // Created Date
        <div key="created" style={{ fontSize: '12px', color: '#64748B' }}>
          {new Date(product.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>,

        // Actions
        <div key="actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <DropdownMenu
            trigger={
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  color: '#64748B',
                }}
                aria-label="Actions"
              >
                •••
              </button>
            }
            items={actions}
            align="right"
          />
        </div>,
      ];
    });
  }, [products]);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title="Products"
        subtitle="Manage products, access types, entitlements, and associated subscription plans."
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Subscriptions & Payments', href: '/subscriptions' },
          { label: 'Products' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Filter size={15} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filter
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Layers size={15} />}
              onClick={() => setIsCategoryDrawerOpen(true)}
            >
              Manage Types
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download size={15} />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={15} />}
              onClick={handleOpenAddModal}
            >
              Add Product
            </Button>
          </div>
        }
      />

      {/* Alert Banner */}
      {alertInfo && (
        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <Alert
            variant={alertInfo.type}
            title={alertInfo.title}
            message={alertInfo.message}
          />
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginTop: '20px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          title="Total Products"
          value={metrics.totalProducts}
          changeLabel="Catalog items"
          icon={<Package size={22} color="#2563EB" />}
        />
        <MetricCard
          title="Active Products"
          value={metrics.activeProducts}
          changeLabel="Currently Live"
          badgeText="Active"
          icon={<CheckCircle2 size={22} color="#16A34A" />}
        />
        <MetricCard
          title="Paid Products"
          value={metrics.paidProducts}
          changeLabel="Monetized offerings"
          badgeText="Paid"
          icon={<CreditCard size={22} color="#7C3AED" />}
        />
        <MetricCard
          title="Students Enrolled"
          value={metrics.studentsEnrolled}
          changeLabel="Active subscriptions"
          badgeText="Live"
          icon={<Users size={22} color="#0284C7" />}
        />
      </div>

      {/* Filter / Search Bar */}
      {showFilters && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ flex: '1 1 260px' }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Product Name, Description, Code..."
            />
          </div>

          <div style={{ width: '180px' }}>
            <Select
              value={categoryIdFilter}
              onChange={(e) => setCategoryIdFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Product Types' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          <div style={{ width: '150px' }}>
            <Select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value)}
              options={ACCESS_TYPE_OPTIONS}
            />
          </div>

          <div style={{ width: '140px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            style={{ fontSize: '13px', color: '#64748B' }}
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Products Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '40px' }}>
            <EmptyState
              title="No products found"
              description={
                search || statusFilter !== 'ALL' || categoryIdFilter !== 'ALL' || accessTypeFilter !== 'ALL'
                  ? 'No products match your active search and filter criteria. Try resetting filters.'
                  : 'No products created yet. Create your first Study Karnataka product to configure access and subscription plans.'
              }
              actionLabel="Add Product"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <>
            <Table headers={tableHeaders} rows={tableRows} />
            <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => loadProducts(p)}
              />
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT PRODUCT MODAL                                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        maxWidth="740px"
      >
        <form onSubmit={(e) => handleSaveProduct(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION 1: Basic Information */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              1. Basic Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <FormField label="Product Name" required>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. KAS Premium Preparation"
                  required
                />
              </FormField>

              <FormField
                label="Product Code / Slug"
                helperText="Unique uppercase identifier (auto-generated)"
              >
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  placeholder="e.g. KAS_PREMIUM_PREP"
                />
              </FormField>
            </div>

            <div style={{ marginTop: '14px' }}>
              <FormField label="Description">
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short overview of what students access in this product..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 2: Exam & Scope */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              2. Exam & Scope
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <FormField label="Linked Exam (Optional)">
                <Select
                  value={formData.examId}
                  onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                  options={[
                    { value: '', label: 'None (Global Product)' },
                    ...exams.map(ex => ({ value: ex.id, label: `${ex.titleEn} (${ex.cycleYear})` }))
                  ]}
                />
              </FormField>
              <FormField label="Product Scope">
                <Select
                  value={formData.scopeType}
                  onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as ProductScopeType })}
                  options={[
                    { value: 'GLOBAL', label: 'Global' },
                    { value: 'ENTIRE_EXAM', label: 'Entire Exam' },
                    { value: 'SPECIFIC_MODULES', label: 'Specific Modules' },
                  ]}
                />
              </FormField>
              <FormField label="Product Type">
                <Select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value as ProductType })}
                  options={[
                    { value: 'FULL_EXAM', label: 'Full Exam' },
                    { value: 'MCQ', label: 'MCQ' },
                    { value: 'STUDY_MATERIALS', label: 'Study Materials' },
                    { value: 'MOCK_TESTS', label: 'Mock Tests' },
                    { value: 'QUICK_REVISION', label: 'Quick Revision' },
                    { value: 'STUDY_PLANS', label: 'Study Plans' },
                    { value: 'TEST_SERIES', label: 'Test Series' },
                    { value: 'CURRENT_AFFAIRS', label: 'Current Affairs' },
                    { value: 'CUSTOM_BUNDLE', label: 'Custom Bundle' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 3: Product Configuration */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              3. Product Configuration
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <FormField label="Category" required>
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </FormField>
              <FormField label="Access Type" required>
                <Select
                  value={formData.accessType}
                  onChange={(e) => setFormData({ ...formData, accessType: e.target.value as ProductAccessType })}
                  options={ACCESS_TYPE_OPTIONS.filter((o) => o.value !== 'ALL')}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
                  options={STATUS_OPTIONS.filter((o) => o.value !== 'ALL')}
                />
              </FormField>
            </div>

            {formData.accessType !== 'FREE' && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748B' }}>
                  <strong>Associated Plans:</strong> Pricing tiers belong to Plans attached to this Product.
                </p>

                {formData.plans.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {formData.plans.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong>{p.name}</strong> — ₹{p.price} / {p.duration} {p.durationUnit.toLowerCase()}
                          <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>({p.code})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlanRow(idx)}
                          style={{ color: '#EF4444', height: '28px', padding: '0 8px' }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                  <FormField label="Plan Name">
                    <Input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="e.g. 6 Months Full Pass" />
                  </FormField>
                  <FormField label="Price (₹)">
                    <Input type="number" value={newPlanPrice} onChange={(e) => setNewPlanPrice(Number(e.target.value))} placeholder="999" />
                  </FormField>
                  <FormField label="Duration">
                    <Input type="number" value={newPlanDuration} onChange={(e) => setNewPlanDuration(Number(e.target.value))} placeholder="6" />
                  </FormField>
                  <FormField label="Unit">
                    <Select value={newPlanUnit} onChange={(e) => setNewPlanUnit(e.target.value as any)} options={[{ value: 'DAYS', label: 'Days' }, { value: 'MONTHS', label: 'Months' }, { value: 'YEARS', label: 'Years' }]} />
                  </FormField>
                  <div style={{ paddingBottom: '2px' }}>
                    <Button type="button" variant="secondary" size="md" onClick={handleAddPlanRow}>Add Plan</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Modules / Entitlements */}
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              4. Modules / Entitlements
            </h4>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Entitlements Granted by this Product:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                {STANDARD_ENTITLEMENTS.map((ent) => {
                  const isChecked = formData.entitlements.some((e) => e.entitlementKey === ent.key);
                  return (
                    <label key={ent.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1E293B' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleEntitlement(ent)} style={{ marginTop: '2px', cursor: 'pointer' }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{ent.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{ent.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Available Feature Highlights:
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input value={formData.newFeature} onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })} placeholder="e.g. 100+ Practice Mock Tests" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }} />
                <Button type="button" variant="secondary" size="md" onClick={handleAddFeature}>Add Feature</Button>
              </div>
              {formData.features.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formData.features.map((feat, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: 500 }}>
                      {feat}
                      <button type="button" onClick={() => handleRemoveFeature(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#1D4ED8' }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Display & Media */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              5. Display & Media
            </h4>
            
            <div style={{ marginBottom: '14px' }}>
              <FormField label="Product Image URL" helperText="Provide a URL for the product image, or upload a local image (optional)">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <Button type="button" variant="secondary" disabled={isUploadingImage} style={{ height: '100%', whiteSpace: 'nowrap' }}>
                      {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: isUploadingImage ? 'not-allowed' : 'pointer' }} />
                  </div>
                </div>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <FormField label="Display Order" helperText="Lower numbers appear first">
                <Input type="number" value={formData.displayOrder} onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })} />
              </FormField>
              <FormField label="Publish Date">
                <Input type="date" value={formData.publishDate} onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })} />
              </FormField>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <Button type="button" variant="outline" size="md" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            {!editingProduct && (
              <Button type="button" variant="secondary" size="md" onClick={(e) => handleSaveProduct(e, true)}>
                Save Draft
              </Button>
            )}
            <Button type="submit" variant="primary" size="md">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MANAGE ENTITLEMENTS MODAL                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEntitlementsModalOpen}
        onClose={() => setIsEntitlementsModalOpen(false)}
        title={`Manage Entitlements: ${entitlementsProduct?.name || ''}`}
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Select the capabilities and modules students gain access to when they subscribe or enroll in this product.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            {STANDARD_ENTITLEMENTS.map((ent) => {
              const isChecked = selectedEntitlements.includes(ent.key);
              return (
                <label
                  key={ent.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '8px',
                    backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: '6px',
                    border: `1px solid ${isChecked ? '#BFDBFE' : '#E2E8F0'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedEntitlements(selectedEntitlements.filter((k) => k !== ent.key));
                      } else {
                        setSelectedEntitlements([...selectedEntitlements, ent.key]);
                      }
                    }}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{ent.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{ent.description}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Add custom entitlement */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Add Custom Entitlement Key:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
              <Input
                placeholder="Key (e.g. mentorship_access)"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
              />
              <Input
                placeholder="Display Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <Button type="button" variant="secondary" size="md" onClick={handleAddCustomEntitlement}>
                Add
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" size="md" onClick={() => setIsEntitlementsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveEntitlements}>
              Save Entitlements
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* PRODUCT DETAILS MODAL                                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        title={selectedProduct?.name || 'Product Details'}
        maxWidth="600px"
      >
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {selectedProduct.imageUrl && (
                <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Code / SKU
                </span>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {selectedProduct.code}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div>{renderCategoryBadge(selectedProduct.category)}</div>
              <div>{renderAccessTypeBadge(selectedProduct.accessType)}</div>
              <StatusBadge status={selectedProduct.status} />
              <Badge text={selectedProduct.scopeType?.replace(/_/g, ' ')} variant="neutral" />
              <Badge text={selectedProduct.productType?.replace(/_/g, ' ')} variant="info" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Linked Exam
              </span>
              <div style={{ color: '#334155', fontWeight: 500 }}>
                {selectedProduct.exam ? `${selectedProduct.exam.titleEn}` : 'None (Global)'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Description
              </span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', lineHeight: 1.5 }}>
                {selectedProduct.description || 'No description provided.'}
              </p>
            </div>

            {/* Features */}
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Available Features ({selectedProduct.features?.length || 0})
              </span>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', color: '#334155' }}>
                {(selectedProduct.features || []).map((f, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {f}
                  </li>
                ))}
                {(!selectedProduct.features || selectedProduct.features.length === 0) && (
                  <span style={{ color: '#94A3B8' }}>None specified</span>
                )}
              </ul>
            </div>

            {/* Entitlements */}
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Granted Entitlements ({selectedProduct.entitlements?.length || 0})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {(selectedProduct.entitlements || []).map((ent, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Key size={13} color="#2563EB" />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '12px' }}>{ent.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{ent.entitlementKey}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Associated Plans */}
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Associated Plans ({selectedProduct.plans?.length || 0})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {(selectedProduct.plans || []).map((plan, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{plan.name}</span>
                      <span style={{ color: '#16A34A' }}>₹{plan.price}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Duration: {plan.duration} {plan.durationUnit.toLowerCase()} | Code: {plan.code}
                    </div>
                  </div>
                ))}
                {(!selectedProduct.plans || selectedProduct.plans.length === 0) && (
                  <span style={{ color: '#94A3B8' }}>
                    {selectedProduct.accessType === 'FREE' ? 'Free product (no plans required)' : 'No plans attached yet'}
                  </span>
                )}
              </div>
            </div>

            {/* Students count */}
            <div
              style={{
                padding: '12px',
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
              }}
            >
              <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>
                Enrolled Students
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E3A8A', marginTop: '2px' }}>
                {selectedProduct.studentsCount} Students Active
              </div>
            </div>

            {/* Audit Timestamps */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', color: '#64748B', fontSize: '11px' }}>
              <div>Created: {new Date(selectedProduct.createdAt).toLocaleString()}</div>
              <div>Last Updated: {new Date(selectedProduct.updatedAt).toLocaleString()}</div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Edit2 size={13} />}
                onClick={() => {
                  setIsDetailsDrawerOpen(false);
                  handleOpenEditModal(selectedProduct);
                }}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Key size={13} />}
                onClick={() => {
                  setIsDetailsDrawerOpen(false);
                  handleOpenEntitlementsModal(selectedProduct);
                }}
              >
                Entitlements
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* ARCHIVE CONFIRMATION MODAL                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Product"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
            Are you sure you want to archive <strong>{productToArchive?.name}</strong>?
          </p>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#92400E',
            }}
          >
            <strong>Relationship Safety:</strong> Archiving will hide the product from new student purchases, while{' '}
            <strong>safely preserving all historical subscriptions, transaction logs, and student access records</strong>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" size="md" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirmArchive}>
              Archive Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* DEACTIVATE CONFIRMATION MODAL                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate Product"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
            Are you sure you want to mark <strong>{productToDeactivate?.name}</strong> as Inactive?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" size="md" onClick={() => setIsDeactivateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirmDeactivate}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MANAGE CATEGORIES MODAL                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        title="Manage Product Categories"
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add/Edit Form */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0F172A' }}>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FormField label="Category Name" required>
                <Input
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g. Test Series"
                />
              </FormField>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                {editingCategory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryFormData({ name: '', code: '', description: '', isActive: true });
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSavingCategory || !categoryFormData.name.trim()}
                  onClick={async () => {
                    setIsSavingCategory(true);
                    try {
                      if (editingCategory) {
                        await ProductsApi.updateCategory(editingCategory.id, { name: categoryFormData.name });
                      } else {
                        await ProductsApi.createCategory({ name: categoryFormData.name });
                      }
                      setCategoryFormData({ name: '', code: '', description: '', isActive: true });
                      setEditingCategory(null);
                      loadCategories();
                    } catch (e: any) {
                      setAlertInfo({ type: 'danger', title: 'Error', message: e.message });
                    }
                    setIsSavingCategory(false);
                  }}
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </div>
          </div>

          {/* List Categories */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0F172A' }}>Existing Categories</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    backgroundColor: cat.isActive ? '#FFFFFF' : '#F1F5F9',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: cat.isActive ? '#0F172A' : '#94A3B8' }}>{cat.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>{cat.code}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(cat); setCategoryFormData({ ...cat, description: cat.description || '' }); }}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{ color: '#EF4444' }}
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${cat.name}?`)) {
                          try {
                            await ProductsApi.deleteCategory(cat.id);
                            loadCategories();
                            loadProducts(pagination.page); // Refresh products in case category was just deactivated
                          } catch (e: any) {
                            setAlertInfo({ type: 'danger', title: 'Error', message: e.message });
                          }
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
