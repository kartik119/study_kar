import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PageHeader,
  MetricCard,
  SearchInput,
  Select,
  Button,
  Table,
  Pagination,
  StatusBadge,
  DropdownMenu,
  Modal,
  Alert,
  FormField,
  Input,
  Textarea,
  LoadingSpinner,
  EmptyState,
} from '@study-karnataka/ui';
import {
  Package,
  Users,
  CheckCircle2,
  CreditCard,
  Plus,
  Download,
  Eye,
  Edit2,
  Archive,
  Power,
  Trash2,
  Sparkles,
  X,
  Check,
  Calendar,
  BookOpen,
  Award,
  Zap,
  FileText,
  FileQuestion,
  HelpCircle,
  ShieldCheck,
  Globe,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import {
  SubscriptionModulesApi,
  SubscriptionModule,
  ModuleMetrics,
  ModuleScopeType,
  SubscriptionModuleType,
  ModuleAccessType,
  ModuleStatus,
  CreateModulePayload,
  UpdateModulePayload,
} from '../../api/subscription-modules.api';
import { fetchExams } from '../../services/examApi';
import { ExamCycle } from '@study-karnataka/shared-types';

// ==========================================
// CONSTANTS & OPTIONS
// ==========================================

const ALL_SYSTEM_FEATURES = [
  {
    key: 'STUDY_MATERIAL_ACCESS',
    name: 'Study Materials',
    shortName: 'SM',
    icon: BookOpen,
    description: 'Access syllabus study materials and reading resources',
    color: '#3B82F6',
  },
  {
    key: 'MCQ_ACCESS',
    name: 'MCQ Practice',
    shortName: 'MCQ',
    icon: HelpCircle,
    description: 'Unlimited question bank access and topic-wise practice',
    color: '#10B981',
  },
  {
    key: 'MOCK_TEST_ACCESS',
    name: 'Mock Tests',
    shortName: 'Mock',
    icon: Award,
    description: 'Full-length mock exam simulations and timer tests',
    color: '#8B5CF6',
  },
  {
    key: 'CURRENT_AFFAIRS_ACCESS',
    name: 'Current Affairs',
    shortName: 'CA',
    icon: FileText,
    description: 'Daily and monthly current affairs articles and quizzes',
    color: '#F59E0B',
  },
  {
    key: 'QUICK_REVISION_ACCESS',
    name: 'Quick Revision',
    shortName: 'QR',
    icon: Zap,
    description: 'High-yield revision flashcards and memory maps',
    color: '#EC4899',
  },
  {
    key: 'STUDY_PLAN_ACCESS',
    name: 'Study Plans',
    shortName: 'Plan',
    icon: Calendar,
    description: 'Automated study planner and daily task schedules',
    color: '#06B6D4',
  },
  {
    key: 'TEST_SERIES_ACCESS',
    name: 'Test Series',
    shortName: 'Tests',
    icon: FileQuestion,
    description: 'Ranked test series and statewide benchmark assessments',
    color: '#6366F1',
  },
];

const MODULE_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Module Types' },
  { value: 'FULL_EXAM', label: 'Full Exam' },
  { value: 'MCQ', label: 'MCQ' },
  { value: 'STUDY_MATERIALS', label: 'Study Materials' },
  { value: 'MOCK_TESTS', label: 'Mock Tests' },
  { value: 'CURRENT_AFFAIRS', label: 'Current Affairs' },
  { value: 'QUICK_REVISION', label: 'Quick Revision' },
  { value: 'STUDY_PLANS', label: 'Study Plans' },
  { value: 'TEST_SERIES', label: 'Test Series' },
  { value: 'CUSTOM_BUNDLE', label: 'Custom Bundle' },
];

const SCOPE_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Scopes' },
  { value: 'ENTIRE_EXAM', label: 'Entire Exam' },
  { value: 'SELECTED_FEATURES', label: 'Selected Features' },
  { value: 'GLOBAL', label: 'Global / All Exams' },
];

const ACCESS_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Access Types' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FREE', label: 'Free' },
  { value: 'FREEMIUM', label: 'Freemium' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const ModulesPage: React.FC = () => {
  // Data State
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [metrics, setMetrics] = useState<ModuleMetrics>({
    totalModules: 0,
    activeModules: 0,
    paidModules: 0,
    studentsEnrolled: 0,
  });
  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [examIdFilter, setExamIdFilter] = useState('ALL');
  const [moduleTypeFilter, setModuleTypeFilter] = useState('ALL');
  const [scopeTypeFilter, setScopeTypeFilter] = useState('ALL');
  const [accessTypeFilter, setAccessTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Drawer State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<SubscriptionModule | null>(null);
  const [detailModule, setDetailModule] = useState<SubscriptionModule | null>(null);
  const [manageAccessModule, setManageAccessModule] = useState<SubscriptionModule | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExamId, setFormExamId] = useState('');
  const [formScopeType, setFormScopeType] = useState<ModuleScopeType>('ENTIRE_EXAM');
  const [formModuleType, setFormModuleType] = useState<SubscriptionModuleType>('FULL_EXAM');
  const [formAccessType, setFormAccessType] = useState<ModuleAccessType>('PAID');
  const [formStatus, setFormStatus] = useState<ModuleStatus>('ACTIVE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formPublishDate, setFormPublishDate] = useState('');
  const [formSelectedFeatureKeys, setFormSelectedFeatureKeys] = useState<string[]>([]);
  const [formHighlights, setFormHighlights] = useState<string[]>([]);
  const [formHighlightInput, setFormHighlightInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Manage Access Modal State
  const [accessExamId, setAccessExamId] = useState('');
  const [accessScopeType, setAccessScopeType] = useState<ModuleScopeType>('ENTIRE_EXAM');
  const [accessSelectedKeys, setAccessSelectedKeys] = useState<string[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Auto-hide alert messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load Exams
  const loadExamsList = useCallback(async () => {
    try {
      const examData = await fetchExams();
      setExams(examData || []);
    } catch (err: any) {
      console.error('Failed to load exams:', err);
    }
  }, []);

  // Load Modules & Metrics
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [modRes, metricsRes] = await Promise.all([
        SubscriptionModulesApi.getModules({
          page,
          pageSize,
          search: search.trim() || undefined,
          status: statusFilter,
          examId: examIdFilter,
          scopeType: scopeTypeFilter,
          moduleType: moduleTypeFilter,
          accessType: accessTypeFilter,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }),
        SubscriptionModulesApi.getMetrics().catch(() => ({
          totalModules: 0,
          activeModules: 0,
          paidModules: 0,
          studentsEnrolled: 0,
        })),
      ]);

      setModules(modRes.items);
      setTotalPages(modRes.pagination.totalPages);
      setMetrics(metricsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load modules. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, examIdFilter, scopeTypeFilter, moduleTypeFilter, accessTypeFilter]);

  useEffect(() => {
    loadExamsList();
  }, [loadExamsList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exam Select Options for filters and forms
  const examFilterOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Exams' }];
    exams.forEach((e) => {
      list.push({ value: e.id, label: e.titleEn });
    });
    return list;
  }, [exams]);

  const examFormOptions = useMemo(() => {
    const list = [{ value: '', label: 'Select Exam Target...' }];
    exams.forEach((e) => {
      list.push({ value: e.id, label: e.titleEn });
    });
    return list;
  }, [exams]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setExamIdFilter('ALL');
    setModuleTypeFilter('ALL');
    setScopeTypeFilter('ALL');
    setAccessTypeFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Open Add Module Form
  const handleOpenAddModal = () => {
    setEditingModule(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormExamId(exams.length > 0 ? exams[0].id : '');
    setFormScopeType('ENTIRE_EXAM');
    setFormModuleType('FULL_EXAM');
    setFormAccessType('PAID');
    setFormStatus('ACTIVE');
    setFormImageUrl('');
    setFormDisplayOrder(0);
    setFormPublishDate('');
    // Default to all features for entire exam
    setFormSelectedFeatureKeys(ALL_SYSTEM_FEATURES.map((f) => f.key));
    setFormHighlights([]);
    setFormHighlightInput('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Module Form
  const handleOpenEditModal = (mod: SubscriptionModule) => {
    setEditingModule(mod);
    setFormName(mod.name);
    setFormCode(mod.code);
    setFormDescription(mod.description || '');
    setFormExamId(mod.examId || (exams.length > 0 ? exams[0].id : ''));
    setFormScopeType(mod.scopeType);
    setFormModuleType(mod.moduleType);
    setFormAccessType(mod.accessType);
    setFormStatus(mod.status);
    setFormImageUrl(mod.imageUrl || '');
    setFormDisplayOrder(mod.displayOrder || 0);
    setFormPublishDate(mod.publishDate ? mod.publishDate.substring(0, 10) : '');
    setFormSelectedFeatureKeys(mod.entitlements ? mod.entitlements.map((e) => e.featureKey) : []);
    setFormHighlights(mod.features || []);
    setFormHighlightInput('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Manage Access Modal
  const handleOpenManageAccess = (mod: SubscriptionModule) => {
    setManageAccessModule(mod);
    setAccessExamId(mod.examId || (exams.length > 0 ? exams[0].id : ''));
    setAccessScopeType(mod.scopeType);
    setAccessSelectedKeys(mod.entitlements ? mod.entitlements.map((e) => e.featureKey) : []);
    setAccessError(null);
  };

  // Toggle Feature Selection
  const toggleFeatureKey = (key: string) => {
    setFormSelectedFeatureKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Handle Module Type Change and Auto-Select Features
  const handleModuleTypeChange = (type: SubscriptionModuleType) => {
    setFormModuleType(type);
    
    if (type === 'FULL_EXAM') {
      setFormSelectedFeatureKeys(ALL_SYSTEM_FEATURES.map((f) => f.key));
    } else if (type === 'MCQ') {
      setFormSelectedFeatureKeys(['MCQ_ACCESS']);
    } else if (type === 'STUDY_MATERIALS') {
      setFormSelectedFeatureKeys(['STUDY_MATERIAL_ACCESS']);
    } else if (type === 'MOCK_TESTS') {
      setFormSelectedFeatureKeys(['MOCK_TEST_ACCESS']);
    } else if (type === 'CURRENT_AFFAIRS') {
      setFormSelectedFeatureKeys(['CURRENT_AFFAIRS_ACCESS']);
    } else if (type === 'QUICK_REVISION') {
      setFormSelectedFeatureKeys(['QUICK_REVISION_ACCESS']);
    } else if (type === 'STUDY_PLANS') {
      setFormSelectedFeatureKeys(['STUDY_PLAN_ACCESS']);
    } else if (type === 'TEST_SERIES') {
      setFormSelectedFeatureKeys(['TEST_SERIES_ACCESS']);
    }
    // CUSTOM_BUNDLE leaves current selection as is
  };

  // Toggle Feature Selection in Manage Access
  const toggleAccessKey = (key: string) => {
    setAccessSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Add / Remove Highlights
  const handleAddHighlight = () => {
    if (!formHighlightInput.trim()) return;
    setFormHighlights((prev) => [...prev, formHighlightInput.trim()]);
    setFormHighlightInput('');
  };

  const handleRemoveHighlight = (index: number) => {
    setFormHighlights((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute reactive Access Preview description
  const computedAccessPreview = useMemo(() => {
    const selectedCount = formSelectedFeatureKeys.length;
    if (selectedCount === 0) {
      return 'No features selected yet. Please select at least one feature below.';
    }

    const featureNames = ALL_SYSTEM_FEATURES.filter((f) =>
      formSelectedFeatureKeys.includes(f.key)
    ).map((f) => f.name);

    const featureListText =
      featureNames.length === 1
        ? featureNames[0]
        : featureNames.slice(0, -1).join(', ') + ' and ' + featureNames[featureNames.length - 1];

    if (formScopeType === 'GLOBAL') {
      return `Students subscribed to this Module will receive access to ${featureListText} across all exams (Global Access).`;
    }

    const targetExam = exams.find((e) => e.id === formExamId);
    const examName = targetExam ? targetExam.titleEn : 'the selected Exam';

    if (formScopeType === 'ENTIRE_EXAM') {
      return `Students subscribed to this Module will receive full preparation access to ${featureListText} for ${examName} only.`;
    }

    return `Students subscribed to this Module will receive access to ${featureListText} for ${examName} only. Other exams and modules remain restricted.`;
  }, [formSelectedFeatureKeys, formScopeType, formExamId, exams]);

  // Form Submit
  const handleSaveModule = async (forcedStatus?: ModuleStatus) => {
    setFormError(null);

    // Validation
    if (!formName.trim()) {
      setFormError('Module Name is required.');
      return;
    }
    if (formScopeType !== 'GLOBAL' && !formExamId) {
      setFormError('Please select a valid Exam for this scope.');
      return;
    }
    if (formSelectedFeatureKeys.length === 0) {
      setFormError('Please select at least one Included Feature for this module.');
      return;
    }

    const statusToSave = forcedStatus || formStatus;

    // Prepare entitlements payload
    const entitlementsPayload = formSelectedFeatureKeys.map((k) => {
      const feat = ALL_SYSTEM_FEATURES.find((f) => f.key === k);
      return {
        featureKey: k,
        name: feat ? feat.name : k,
        description: feat ? feat.description : undefined,
      };
    });

    setActionLoading(true);

    try {
      if (editingModule) {
        const payload: UpdateModulePayload = {
          name: formName.trim(),
          code: formCode.trim() || undefined,
          description: formDescription.trim() || undefined,
          examId: formScopeType === 'GLOBAL' ? null : formExamId,
          scopeType: formScopeType,
          moduleType: formModuleType,
          accessType: formAccessType,
          status: statusToSave,
          imageUrl: formImageUrl.trim() || null,
          displayOrder: Number(formDisplayOrder) || 0,
          publishDate: formPublishDate || null,
          features: formHighlights,
          entitlements: entitlementsPayload,
        };

        await SubscriptionModulesApi.updateModule(editingModule.id, payload);
        setSuccessMessage(`Module "${formName}" updated successfully.`);
      } else {
        const payload: CreateModulePayload = {
          name: formName.trim(),
          code: formCode.trim() || undefined,
          description: formDescription.trim() || undefined,
          examId: formScopeType === 'GLOBAL' ? null : formExamId,
          scopeType: formScopeType,
          moduleType: formModuleType,
          accessType: formAccessType,
          status: statusToSave,
          imageUrl: formImageUrl.trim() || null,
          displayOrder: Number(formDisplayOrder) || 0,
          publishDate: formPublishDate || null,
          features: formHighlights,
          entitlements: entitlementsPayload,
        };

        await SubscriptionModulesApi.createModule(payload);
        setSuccessMessage(`Module "${formName}" created successfully.`);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save module. Please verify form values.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manage Access Save
  const handleSaveManageAccess = async () => {
    if (!manageAccessModule) return;
    setAccessError(null);

    if (accessScopeType !== 'GLOBAL' && !accessExamId) {
      setAccessError('Exam selection is required for this scope.');
      return;
    }
    if (accessSelectedKeys.length === 0) {
      setAccessError('At least one feature must be selected.');
      return;
    }

    setActionLoading(true);
    try {
      const entitlementsPayload = accessSelectedKeys.map((k) => {
        const feat = ALL_SYSTEM_FEATURES.find((f) => f.key === k);
        return {
          featureKey: k,
          name: feat ? feat.name : k,
          description: feat ? feat.description : undefined,
        };
      });

      await SubscriptionModulesApi.updateModule(manageAccessModule.id, {
        examId: accessScopeType === 'GLOBAL' ? null : accessExamId,
        scopeType: accessScopeType,
        entitlements: entitlementsPayload,
      });

      setSuccessMessage(`Access permissions for "${manageAccessModule.name}" updated successfully.`);
      setManageAccessModule(null);
      loadData();
    } catch (err: any) {
      setAccessError(err.message || 'Failed to update module access.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Actions
  const handleToggleStatus = async (mod: SubscriptionModule) => {
    const newStatus: ModuleStatus = mod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setActionLoading(true);
      await SubscriptionModulesApi.updateStatus(mod.id, newStatus);
      setSuccessMessage(`Module "${mod.name}" is now ${newStatus}.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (mod: SubscriptionModule) => {
    if (!window.confirm(`Are you sure you want to archive "${mod.name}"? It will no longer be available for new subscriptions.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await SubscriptionModulesApi.archiveModule(mod.id);
      setSuccessMessage(`Module "${mod.name}" has been archived.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to archive module.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Module
  const handleDeleteModule = async (mod: SubscriptionModule) => {
    const plansInfo =
      mod.plansCount && mod.plansCount > 0
        ? `\n\nNote: This module has ${mod.plansCount} linked plan(s). Any linked plans without active subscriptions will also be deleted.`
        : '';
    if (
      !window.confirm(
        `Are you sure you want to permanently delete module "${mod.name}"? This action cannot be undone.${plansInfo}`
      )
    ) {
      return;
    }
    try {
      setActionLoading(true);
      await SubscriptionModulesApi.deleteModule(mod.id);
      setSuccessMessage(`Module "${mod.name}" deleted successfully.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete module.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const exportUrl = SubscriptionModulesApi.getExportUrl({
      search: search.trim() || undefined,
      status: statusFilter,
      examId: examIdFilter,
      scopeType: scopeTypeFilter,
      moduleType: moduleTypeFilter,
      accessType: accessTypeFilter,
    });
    window.open(exportUrl, '_blank');
  };

  // Format Helpers
  const formatModuleType = (type: SubscriptionModuleType) => {
    const map: Record<string, string> = {
      FULL_EXAM: 'Full Exam',
      MCQ: 'MCQ',
      STUDY_MATERIALS: 'Study Materials',
      MOCK_TESTS: 'Mock Tests',
      CURRENT_AFFAIRS: 'Current Affairs',
      QUICK_REVISION: 'Quick Revision',
      STUDY_PLANS: 'Study Plans',
      TEST_SERIES: 'Test Series',
      CUSTOM_BUNDLE: 'Custom Bundle',
    };
    return map[type] || type;
  };

  const formatScopeType = (scope: ModuleScopeType) => {
    const map: Record<string, string> = {
      ENTIRE_EXAM: 'Entire Exam',
      SELECTED_FEATURES: 'Selected Features',
      GLOBAL: 'Global / All Exams',
    };
    return map[scope] || scope;
  };

  const formatAccessType = (type: ModuleAccessType) => {
    const map: Record<string, string> = {
      PAID: 'Paid',
      FREE: 'Free',
      FREEMIUM: 'Freemium',
    };
    return map[type] || type;
  };

  // Prepare table rows for Table component
  const tableHeaders = [
    'Module Name',
    'Exam',
    'Module Type',
    'Access Scope',
    'Access Type',
    'Included Features',
    'Plans',
    'Students',
    'Status',
    'Updated Date',
    'Actions',
  ];

  const tableRows = useMemo(() => {
    return (modules || []).map((row: SubscriptionModule) => {
      const ents = row.entitlements || [];

      const nameCell = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            <Package size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>
              {row.name}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
              {row.code}
            </div>
          </div>
        </div>
      );

      const examCell =
        row.scopeType === 'GLOBAL' ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Globe size={12} /> Global / All Exams
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={12} /> {row.exam?.titleEn || 'Specific Exam'}
          </span>
        );

      const typeCell = (
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
          {formatModuleType(row.moduleType)}
        </span>
      );

      const scopeCell = (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor:
              row.scopeType === 'ENTIRE_EXAM'
                ? '#ECFDF5'
                : row.scopeType === 'SELECTED_FEATURES'
                ? '#EEF2FF'
                : '#F8FAFC',
            color:
              row.scopeType === 'ENTIRE_EXAM'
                ? '#059669'
                : row.scopeType === 'SELECTED_FEATURES'
                ? '#4F46E5'
                : '#64748B',
          }}
        >
          {formatScopeType(row.scopeType)}
        </span>
      );

      const accessCell = (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor:
              row.accessType === 'PAID'
                ? '#FEF3C7'
                : row.accessType === 'FREEMIUM'
                ? '#E0E7FF'
                : '#DCFCE7',
            color:
              row.accessType === 'PAID'
                ? '#B45309'
                : row.accessType === 'FREEMIUM'
                ? '#4338CA'
                : '#15803D',
          }}
        >
          {formatAccessType(row.accessType)}
        </span>
      );

      const featuresCell =
        ents.length === 0 ? (
          <span style={{ color: '#94A3B8', fontSize: '12px' }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
            {ents.slice(0, 4).map((ent) => {
              const fConfig = ALL_SYSTEM_FEATURES.find((f) => f.key === ent.featureKey);
              return (
                <span
                  key={ent.featureKey}
                  title={ent.name}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#F1F5F9',
                    color: '#1E293B',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {fConfig ? fConfig.shortName : ent.name}
                </span>
              );
            })}
            {ents.length > 4 && (
              <span
                title={ents.map((e) => e.name).join(', ')}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#E2E8F0',
                  color: '#475569',
                }}
              >
                +{ents.length - 4}
              </span>
            )}
          </div>
        );

      const plansCell = (
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          {row.plansCount || 0} Plans
        </span>
      );

      const studentsCell = (
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          {row.studentsCount || 0}
        </span>
      );

      const statusCell = <StatusBadge status={row.status} />;

      const dateCell = (
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          {new Date(row.updatedAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      );

      const actionsCell = (
        <DropdownMenu
          trigger={
            <button
              style={{
                background: 'none',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#475569',
              }}
            >
              •••
            </button>
          }
          items={[
            {
              label: 'View Details',
              icon: <Eye size={14} />,
              onClick: () => setDetailModule(row),
            },
            {
              label: 'Edit Module',
              icon: <Edit2 size={14} />,
              onClick: () => handleOpenEditModal(row),
            },
            {
              label: 'Manage Access',
              icon: <Sliders size={14} />,
              onClick: () => handleOpenManageAccess(row),
            },
            {
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              icon: <Power size={14} />,
              onClick: () => handleToggleStatus(row),
            },
            ...(row.status !== 'ARCHIVED'
              ? [
                  {
                    label: 'Archive',
                    icon: <Archive size={14} />,
                    onClick: () => handleArchive(row),
                  },
                ]
              : []),
            {
              label: 'Delete Module',
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => handleDeleteModule(row),
            },
          ]}
        />
      );

      return [
        nameCell,
        examCell,
        typeCell,
        scopeCell,
        accessCell,
        featuresCell,
        plansCell,
        studentsCell,
        statusCell,
        dateCell,
        actionsCell,
      ];
    });
  }, [modules]);

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* 1. Page Header & Breadcrumb */}
      <PageHeader
        title="Modules"

        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Subscriptions & Payments', href: '/subscriptions/modules' },
          { label: 'Modules' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={15} />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenAddModal}
            >
              Add Module
            </Button>
          </div>
        }
      />

      {/* Alert notifications */}
      {successMessage && (
        <div style={{ marginBottom: '16px' }}>
          <Alert message={successMessage} variant="success" />
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert message={error} variant="error" />
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          title="Total Modules"
          value={metrics.totalModules}
          icon={<Package size={22} color="#1E293B" />}
          changeLabel="100% active architecture"
        />
        <MetricCard
          title="Active Modules"
          value={metrics.activeModules}
          icon={<CheckCircle2 size={22} color="#10B981" />}
          changeLabel="Ready for subscriptions"
        />
        <MetricCard
          title="Paid Modules"
          value={metrics.paidModules}
          icon={<CreditCard size={22} color="#3B82F6" />}
          changeLabel="Commercial offerings"
        />
        <MetricCard
          title="Students Enrolled"
          value={metrics.studentsEnrolled}
          icon={<Users size={22} color="#8B5CF6" />}
          changeLabel="Active student passes"
        />
      </div>

      {/* 3. Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Search Modules
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, code..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Exam
            </label>
            <Select
              options={examFilterOptions}
              value={examIdFilter}
              onChange={(e) => {
                setExamIdFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Module Type
            </label>
            <Select
              options={MODULE_TYPE_OPTIONS}
              value={moduleTypeFilter}
              onChange={(e) => {
                setModuleTypeFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Access Scope
            </label>
            <Select
              options={SCOPE_TYPE_OPTIONS}
              value={scopeTypeFilter}
              onChange={(e) => {
                setScopeTypeFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Access Type
            </label>
            <Select
              options={ACCESS_TYPE_OPTIONS}
              value={accessTypeFilter}
              onChange={(e) => {
                setAccessTypeFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Status
            </label>
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="md" onClick={handleResetFilters} style={{ width: '100%' }}>
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Modules Data Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : modules.length === 0 ? (
          <EmptyState
            title="No modules created yet"
            description="Create your first exam-specific access module to configure what students can access."
            actionLabel="+ Add Module"
            onAction={handleOpenAddModal}
          />
        ) : (
          <>
            <Table headers={tableHeaders} rows={tableRows} />

            {/* Pagination */}
            <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage: number) => setPage(newPage)}
              />
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT MODULE MODAL (7 REQUIRED STRUCTURED SECTIONS)               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingModule ? 'Edit Module' : 'Add Module'}
        maxWidth="750px"
      >
        <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '6px' }}>
          {formError && (
            <div style={{ marginBottom: '16px' }}>
              <Alert message={formError} variant="error" />
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                1
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Basic Information
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Module Name *" helperText="Commercial access title">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. UPSC Full Access, UPSC MCQ Practice"
                />
              </FormField>

              <FormField label="Internal Code" helperText="Unique internal identifier">
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. MOD-UPSC-FULL"
                />
              </FormField>
            </div>

            <FormField label="Description *" helperText="Comprehensive explanation of what this module provides">
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the study materials, mocks, quizzes, or exclusive tools unlocked..."
                rows={3}
              />
            </FormField>
          </div>

          {/* Section 2: Exam & Access Scope */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                2
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Exam & Access Scope
              </h4>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Access Scope *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  {
                    value: 'ENTIRE_EXAM',
                    title: 'Entire Exam',
                    desc: 'Full exam offering with selected modules',
                  },
                  {
                    value: 'SELECTED_FEATURES',
                    title: 'Selected Features',
                    desc: 'Specific modules like MCQ or Study Materials only',
                  },
                  {
                    value: 'GLOBAL',
                    title: 'Global / All Exams',
                    desc: 'Shared cross-exam access (e.g. universal Current Affairs)',
                  },
                ].map((s) => (
                  <div
                    key={s.value}
                    onClick={() => setFormScopeType(s.value as ModuleScopeType)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${formScopeType === s.value ? '#2563EB' : '#E2E8F0'}`,
                      backgroundColor: formScopeType === s.value ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: formScopeType === s.value ? '#1D4ED8' : '#0F172A' }}>
                        {s.title}
                      </span>
                      {formScopeType === s.value && <Check size={16} color="#2563EB" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.3' }}>
                      {s.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formScopeType !== 'GLOBAL' && (
              <FormField label="Target Exam *" helperText="Module entitlements are strictly isolated to this exam">
                <Select
                  options={examFormOptions}
                  value={formExamId}
                  onChange={(e) => setFormExamId(e.target.value)}
                />
              </FormField>
            )}
          </div>

          {/* Section 3: Module Configuration */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                3
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Module Configuration
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <FormField label="Module Type *">
                <Select
                  options={MODULE_TYPE_OPTIONS.filter((o) => o.value !== 'ALL')}
                  value={formModuleType}
                  onChange={(e) => handleModuleTypeChange(e.target.value as SubscriptionModuleType)}
                />
              </FormField>

              <FormField label="Access Type *">
                <Select
                  options={ACCESS_TYPE_OPTIONS.filter((o) => o.value !== 'ALL')}
                  value={formAccessType}
                  onChange={(e) => setFormAccessType(e.target.value as ModuleAccessType)}
                />
              </FormField>

              <FormField label="Status *">
                <Select
                  options={STATUS_OPTIONS.filter((o) => o.value !== 'ALL')}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ModuleStatus)}
                />
              </FormField>
            </div>
          </div>

          {/* Section 4: Included Features */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  4
                </div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                  Included Features
                </h4>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {formSelectedFeatureKeys.length} selected
              </div>
            </div>
            <p style={{ margin: '0 0 14px 32px', fontSize: '12px', color: '#64748B' }}>
              Select which application features are unlocked when a student purchases/receives this module.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {ALL_SYSTEM_FEATURES.map((feat) => {
                const isSelected = formSelectedFeatureKeys.includes(feat.key);
                const FeatIcon = feat.icon;

                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleFeatureKey(feat.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? feat.color : '#E2E8F0'}`,
                      backgroundColor: isSelected ? `${feat.color}0D` : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `1.5px solid ${isSelected ? feat.color : '#CBD5E1'}`,
                        backgroundColor: isSelected ? feat.color : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <FeatIcon size={14} color={feat.color} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {feat.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.3' }}>
                        {feat.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Access Preview */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                5
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Access Preview
              </h4>
            </div>
            <div
              style={{
                marginLeft: '32px',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                color: '#334155',
                lineHeight: '1.5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Sparkles size={15} color="#2563EB" />
                <strong style={{ color: '#0F172A' }}>Authorization Rule Simulation:</strong>
              </div>
              <div>{computedAccessPreview}</div>
            </div>
          </div>

          {/* Section 6: Display Settings */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                6
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Display Settings
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <FormField label="Image / Banner URL" helperText="Optional display illustration">
                <Input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </FormField>

              <FormField label="Display Order" helperText="Ordering index">
                <Input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                />
              </FormField>

              <FormField label="Publish Date" helperText="Optional schedule">
                <Input
                  type="date"
                  value={formPublishDate}
                  onChange={(e) => setFormPublishDate(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* Section 7: Highlights / Benefits */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                7
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Highlights & Marketing Benefits
              </h4>
            </div>
            <p style={{ margin: '0 0 12px 32px', fontSize: '12px', color: '#64748B' }}>
              Add descriptive bullet points for student landing cards (does not control authorization).
            </p>

            <div style={{ marginLeft: '32px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <Input
                  value={formHighlightInput}
                  onChange={(e) => setFormHighlightInput(e.target.value)}
                  placeholder="e.g. 10,000+ Practice MCQs, Complete Syllabus Coverage"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHighlight();
                    }
                  }}
                />
                <Button variant="secondary" size="md" onClick={handleAddHighlight}>
                  Add
                </Button>
              </div>

              {formHighlights.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formHighlights.map((hl, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        fontSize: '12px',
                      }}
                    >
                      {hl}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveHighlight(i)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            {editingModule && (
              <Button
                type="button"
                variant="ghost"
                style={{ color: '#EF4444' }}
                leftIcon={<Trash2 size={14} />}
                onClick={() => {
                  const m = editingModule;
                  setIsFormModalOpen(false);
                  handleDeleteModule(m);
                }}
              >
                Delete Module
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!editingModule && (
              <Button
                variant="secondary"
                isLoading={actionLoading}
                onClick={() => handleSaveModule('DRAFT')}
              >
                Save as Draft
              </Button>
            )}
            <Button
              variant="primary"
              isLoading={actionLoading}
              onClick={() => handleSaveModule()}
            >
              {editingModule ? 'Save Changes' : 'Create Module'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. MANAGE ACCESS MODAL                                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!manageAccessModule}
        onClose={() => setManageAccessModule(null)}
        title={`Manage Access: ${manageAccessModule?.name || ''}`}
        maxWidth="650px"
      >
        <div>
          {accessError && (
            <div style={{ marginBottom: '14px' }}>
              <Alert message={accessError} variant="error" />
            </div>
          )}

          <div
            style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#92400E',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Security Warning:</strong> Modifying the Exam Scope or Included Features will instantly change access permissions for any future or linked plans assigned to this module.
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Scope & Target Exam
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <Select
                options={SCOPE_TYPE_OPTIONS.filter((o) => o.value !== 'ALL')}
                value={accessScopeType}
                onChange={(e) => setAccessScopeType(e.target.value as ModuleScopeType)}
              />
              {accessScopeType !== 'GLOBAL' && (
                <Select
                  options={examFormOptions}
                  value={accessExamId}
                  onChange={(e) => setAccessExamId(e.target.value)}
                />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Select Features to Unlock ({accessSelectedKeys.length} selected)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {ALL_SYSTEM_FEATURES.map((feat) => {
                const isSelected = accessSelectedKeys.includes(feat.key);
                const FeatIcon = feat.icon;

                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleAccessKey(feat.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isSelected ? feat.color : '#E2E8F0'}`,
                      backgroundColor: isSelected ? `${feat.color}0D` : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: `1.5px solid ${isSelected ? feat.color : '#CBD5E1'}`,
                        backgroundColor: isSelected ? feat.color : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <FeatIcon size={14} color={feat.color} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                      {feat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <Button variant="outline" onClick={() => setManageAccessModule(null)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={actionLoading} onClick={handleSaveManageAccess}>
              Apply Access Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. MODULE DETAILS MODAL (CENTERED & BEAUTIFULLY STYLED)                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!detailModule}
        onClose={() => setDetailModule(null)}
        title={detailModule ? detailModule.name : 'Module Details'}
        maxWidth="760px"
      >
        {detailModule && (
          <div>
            {/* Header Meta & Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {detailModule.code}
                </span>
                <StatusBadge status={detailModule.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                  }}
                >
                  {formatAccessType(detailModule.accessType)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#EDE9FE',
                    color: '#6D28D9',
                  }}
                >
                  {formatScopeType(detailModule.scopeType)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                  }}
                >
                  {formatModuleType(detailModule.moduleType)}
                </span>
              </div>
            </div>

            {/* Description Box */}
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', marginBottom: '4px', letterSpacing: '0.5px' }}>
                Module Overview
              </div>
              <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                {detailModule.description || 'No description provided.'}
              </div>
            </div>

            {/* Key Specifications Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Target Exam</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{detailModule.scopeType === 'GLOBAL' ? 'Global / All Exams' : detailModule.exam?.titleEn || 'Specific Exam'}</span>
                  {detailModule.exam?.cycleCode && (
                    <span style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                      {detailModule.exam.cycleCode}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Access Scope</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {formatScopeType(detailModule.scopeType)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Module Category</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {formatModuleType(detailModule.moduleType)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Access Type</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {formatAccessType(detailModule.accessType)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Display Priority</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  #{detailModule.displayOrder}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Created Date</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginTop: '2px' }}>
                  {new Date(detailModule.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Unlocked Features Section */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#2563EB" />
                  <span>Unlocked Entitlements ({detailModule.entitlements?.length || 0})</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Inherited automatically by student subscriptions
                </span>
              </div>

              {detailModule.entitlements && detailModule.entitlements.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {detailModule.entitlements.map((ent) => {
                    const fConfig = ALL_SYSTEM_FEATURES.find((f) => f.key === ent.featureKey);
                    const FeatIcon = fConfig?.icon || ShieldCheck;
                    return (
                      <div
                        key={ent.featureKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: `${fConfig?.color || '#2563EB'}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FeatIcon size={18} color={fConfig?.color || '#2563EB'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ent.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            {ent.featureKey}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#15803D',
                            backgroundColor: '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            flexShrink: 0,
                          }}
                        >
                          Enabled
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No specific features mapped yet.
                </div>
              )}
            </div>

            {/* Highlights Section */}
            {detailModule.features && detailModule.features.length > 0 && (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} color="#F59E0B" />
                  <span>Key Value Offerings & Highlights</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {detailModule.features.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#334155',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '6px 12px',
                        borderRadius: '6px',
                      }}
                    >
                      <Check size={13} color="#10B981" strokeWidth={3} />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                marginTop: '10px',
              }}
            >
              <Button
                variant="outline"
                size="sm"
                style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
                leftIcon={<Trash2 size={14} />}
                onClick={() => {
                  const m = detailModule;
                  setDetailModule(null);
                  handleDeleteModule(m);
                }}
              >
                Delete Module
              </Button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModule(null)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Sliders size={14} />}
                  onClick={() => {
                    const m = detailModule;
                    setDetailModule(null);
                    handleOpenManageAccess(m);
                  }}
                >
                  Manage Access
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit2 size={14} />}
                  onClick={() => {
                    const m = detailModule;
                    setDetailModule(null);
                    handleOpenEditModal(m);
                  }}
                >
                  Edit Module
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModulesPage;
