import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PageHeader,
  MetricCard,
  SearchInput,
  Select,
  Button,
  Table,
  Pagination,
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
  Layers,
  Plus,
  Download,
  Eye,
  Edit2,
  Copy,
  Archive,
  CheckCircle2,
  CreditCard,
  Users,
  RotateCcw,
  ArrowLeft,
  Check,
  X,
  Calendar,
  Trash2,
  GripVertical,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  Award,
  Zap,
  FileText,
  DollarSign,
} from 'lucide-react';
import {
  PlansApi,
  SubscriptionPlan,
  PlanMetrics,
  PlanType,
  PlanBillingCycle,
  PlanDurationUnit,
  PlanStatus,
} from '../../api/plans.api';
import {
  SubscriptionModulesApi,
  SubscriptionModule,
} from '../../api/subscription-modules.api';
import { fetchExams } from '../../services/examApi';
import { ExamCycle } from '@study-karnataka/shared-types';

// ==========================================
// CONSTANTS & OPTIONS
// ==========================================

const PLAN_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'FREE', label: 'Free' },
  { value: 'FREEMIUM', label: 'Freemium' },
  { value: 'PAID', label: 'Paid' },
];

const BILLING_CYCLE_OPTIONS = [
  { value: 'ALL', label: 'All Durations / Cycles' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: '6 Months' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ONE_TIME', label: 'One Time' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const FEATURE_NAMES_MAP: Record<string, { label: string; icon: any; color: string }> = {
  STUDY_MATERIAL_ACCESS: { label: 'Study Materials', icon: BookOpen, color: '#3B82F6' },
  MCQ_ACCESS: { label: 'MCQ Practice', icon: HelpCircle, color: '#10B981' },
  MOCK_TEST_ACCESS: { label: 'Mock Tests', icon: Award, color: '#8B5CF6' },
  CURRENT_AFFAIRS_ACCESS: { label: 'Current Affairs', icon: FileText, color: '#F59E0B' },
  QUICK_REVISION_ACCESS: { label: 'Quick Revision', icon: Zap, color: '#EC4899' },
  STUDY_PLAN_ACCESS: { label: 'Study Plans', icon: Calendar, color: '#06B6D4' },
  TEST_SERIES_ACCESS: { label: 'Test Series', icon: Award, color: '#6366F1' },
};

export const PlansPage: React.FC = () => {
  // Navigation / View state
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Data state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [metrics, setMetrics] = useState<PlanMetrics>({
    totalPlans: 0,
    activePlans: 0,
    paidPlans: 0,
    activeSubscribers: 0,
  });

  // Loading & Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [examFilter, setExamFilter] = useState<string>('ALL');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('ALL');
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<SubscriptionPlan | null>(null);
  const [pricingModalOpen, setPricingModalOpen] = useState<boolean>(false);
  const [pricingPlan, setPricingPlan] = useState<SubscriptionPlan | null>(null);
  const [pricingForm, setPricingForm] = useState({
    price: 0,
    currency: 'INR',
    billingCycle: 'MONTHLY' as PlanBillingCycle,
    durationValue: 1,
    durationUnit: 'MONTHS' as PlanDurationUnit,
  });

  // Add / Edit Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    moduleId: '',
    planType: 'PAID' as PlanType,
    status: 'DRAFT' as PlanStatus,
    description: '',
    price: 999,
    currency: 'INR',
    billingCycle: 'MONTHLY' as PlanBillingCycle,
    durationValue: 1,
    durationUnit: 'MONTHS' as PlanDurationUnit,
    trialEnabled: false,
    trialDuration: 7,
    trialDurationUnit: 'DAYS' as PlanDurationUnit,
    autoRenewEligible: false,
    displayOrder: 0,
    publishDate: '',
    benefits: [''] as string[],
  });

  // Selected module preview for Add / Edit
  const selectedModule = useMemo(() => {
    return modules.find((m) => m.id === form.moduleId) || null;
  }, [modules, form.moduleId]);

  // Load modules & exams for dropdowns
  const loadReferenceData = useCallback(async () => {
    try {
      const [modulesRes, examsRes] = await Promise.all([
        SubscriptionModulesApi.getModules({ pageSize: 100 }),
        fetchExams({}),
      ]);
      setModules(modulesRes.items || []);
      setExams(examsRes || []);
    } catch (err: any) {
      console.error('Failed to load reference data:', err);
    }
  }, []);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const data = await PlansApi.getPlanMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

  // Load plans list
  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await PlansApi.getPlans({
        page,
        pageSize,
        search: search.trim() || undefined,
        moduleId: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        examId: examFilter !== 'ALL' ? examFilter : undefined,
        planType: planTypeFilter !== 'ALL' ? planTypeFilter : undefined,
        billingCycle: billingCycleFilter !== 'ALL' ? billingCycleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setPlans(res.items || []);
      setTotalCount(res.pagination.total || 0);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, moduleFilter, examFilter, planTypeFilter, billingCycleFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    loadReferenceData();
    loadMetrics();
  }, [loadReferenceData, loadMetrics]);

  // Reactive list reload on filter changes
  useEffect(() => {
    if (viewMode === 'list') {
      loadPlans();
    }
  }, [viewMode, loadPlans]);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setModuleFilter('ALL');
    setExamFilter('ALL');
    setPlanTypeFilter('ALL');
    setBillingCycleFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Export CSV
  const handleExport = async () => {
    try {
      await PlansApi.exportPlans({
        search: search.trim() || undefined,
        moduleId: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        examId: examFilter !== 'ALL' ? examFilter : undefined,
        planType: planTypeFilter !== 'ALL' ? planTypeFilter : undefined,
        billingCycle: billingCycleFilter !== 'ALL' ? billingCycleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setSuccessMessage('Plans exported successfully.');
    } catch (err: any) {
      setError(err.message || 'Export failed.');
    }
  };

  // Open Add Plan screen
  const handleOpenAddPlan = () => {
    const firstActiveModule = modules.find((m) => m.status === 'ACTIVE') || modules[0];
    setForm({
      name: '',
      code: '',
      moduleId: firstActiveModule ? firstActiveModule.id : '',
      planType: 'PAID',
      status: 'DRAFT',
      description: '',
      price: 999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      durationValue: 1,
      durationUnit: 'MONTHS',
      trialEnabled: false,
      trialDuration: 7,
      trialDurationUnit: 'DAYS',
      autoRenewEligible: false,
      displayOrder: 0,
      publishDate: '',
      benefits: ['Full access to study resources', 'Real-time practice simulations'],
    });
    setEditingPlanId(null);
    setViewMode('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Edit Plan screen
  const handleOpenEditPlan = (plan: SubscriptionPlan) => {
    setForm({
      name: plan.name,
      code: plan.code || '',
      moduleId: plan.moduleId,
      planType: plan.planType,
      status: plan.status,
      description: plan.description || '',
      price: Number(plan.price),
      currency: plan.currency || 'INR',
      billingCycle: plan.billingCycle,
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
      trialEnabled: plan.trialEnabled,
      trialDuration: plan.trialDuration || 7,
      trialDurationUnit: plan.trialDurationUnit || 'DAYS',
      autoRenewEligible: plan.autoRenewEligible,
      displayOrder: plan.displayOrder || 0,
      publishDate: plan.publishDate ? plan.publishDate.split('T')[0] : '',
      benefits: Array.isArray(plan.benefits) && plan.benefits.length > 0 ? [...plan.benefits] : [''],
    });
    setEditingPlanId(plan.id);
    setViewMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open View Details Drawer
  const handleOpenDetails = (plan: SubscriptionPlan) => {
    setSelectedPlanDetails(plan);
    setDetailsModalOpen(true);
  };

  // Open Manage Pricing Modal
  const handleOpenPricingModal = (plan: SubscriptionPlan) => {
    setPricingPlan(plan);
    setPricingForm({
      price: Number(plan.price),
      currency: plan.currency || 'INR',
      billingCycle: plan.billingCycle,
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
    });
    setPricingModalOpen(true);
  };

  // Submit Manage Pricing
  const handleSavePricing = async () => {
    if (!pricingPlan) return;
    setSubmitting(true);
    try {
      await PlansApi.managePricing(pricingPlan.id, pricingForm);
      setSuccessMessage(`Pricing updated for "${pricingPlan.name}".`);
      setPricingModalOpen(false);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing');
    } finally {
      setSubmitting(false);
    }
  };

  // Duplicate Plan
  const handleDuplicate = async (plan: SubscriptionPlan) => {
    setLoading(true);
    try {
      const duplicated = await PlansApi.duplicatePlan(plan.id);
      setSuccessMessage(`Plan duplicated successfully as "${duplicated.name}" (Draft).`);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate plan');
    } finally {
      setLoading(false);
    }
  };

  // Status toggle
  const handleToggleStatus = async (plan: SubscriptionPlan, newStatus: PlanStatus) => {
    try {
      await PlansApi.updatePlanStatus(plan.id, newStatus);
      setSuccessMessage(`Plan status updated to ${newStatus}.`);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    }
  };

  // Archive Plan
  const handleArchive = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Are you sure you want to archive plan "${plan.name}"? Historical subscriber records will remain readable.`)) {
      return;
    }
    try {
      await PlansApi.updatePlanStatus(plan.id, 'ARCHIVED');
      setSuccessMessage(`Plan "${plan.name}" has been archived.`);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Archive failed.');
    }
  };

  // Delete Plan
  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Permanently delete plan "${plan.name}"? If subscribers exist, it will be safely archived instead.`)) {
      return;
    }
    try {
      await PlansApi.deletePlan(plan.id);
      setSuccessMessage(`Plan "${plan.name}" processed successfully.`);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  // Add / Reorder / Remove Benefit rows
  const handleAddBenefitRow = () => {
    setForm((prev) => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const handleBenefitChange = (index: number, val: string) => {
    setForm((prev) => {
      const updated = [...prev.benefits];
      updated[index] = val;
      return { ...prev, benefits: updated };
    });
  };

  const handleRemoveBenefitRow = (index: number) => {
    setForm((prev) => {
      const updated = prev.benefits.filter((_, i) => i !== index);
      return { ...prev, benefits: updated.length > 0 ? updated : [''] };
    });
  };

  const handleMoveBenefit = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const updated = [...prev.benefits];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, benefits: updated };
    });
  };

  // Save Plan (Create or Edit)
  const handleSubmitPlan = async (asDraft = false) => {
    if (!form.name.trim()) {
      setError('Plan Name is required.');
      return;
    }
    if (!form.moduleId) {
      setError('Please select a Module.');
      return;
    }
    if (form.planType === 'PAID' && form.price <= 0) {
      setError('Price must be greater than 0 for Paid plans.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      moduleId: form.moduleId,
      description: form.description.trim() || undefined,
      planType: form.planType,
      price: form.planType === 'FREE' ? 0 : Number(form.price),
      currency: form.currency,
      billingCycle: form.billingCycle,
      durationValue: Number(form.durationValue) || 1,
      durationUnit: form.durationUnit,
      trialEnabled: form.trialEnabled,
      trialDuration: form.trialEnabled ? Number(form.trialDuration) || 7 : null,
      trialDurationUnit: form.trialEnabled ? form.trialDurationUnit : null,
      autoRenewEligible: form.autoRenewEligible,
      displayOrder: Number(form.displayOrder) || 0,
      publishDate: form.publishDate ? form.publishDate : null,
      status: asDraft ? 'DRAFT' : form.status,
      benefits: form.benefits.map((b) => b.trim()).filter(Boolean),
    };

    try {
      if (viewMode === 'edit' && editingPlanId) {
        await PlansApi.updatePlan(editingPlanId, payload);
        setSuccessMessage(`Plan "${form.name}" updated successfully.`);
      } else {
        await PlansApi.createPlan(payload);
        setSuccessMessage(`Plan "${form.name}" created successfully.`);
      }
      setViewMode('list');
      setEditingPlanId(null);
      loadPlans();
      loadMetrics();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dropdown options
  const moduleFilterOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Modules' },
      ...(modules || []).map((m) => ({ value: m.id, label: m.name })),
    ];
  }, [modules]);

  const examFilterOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Exams' },
      ...(exams || []).map((e) => ({
        value: e.id,
        label: e.titleEn || e.cycleCode || 'Exam',
      })),
    ];
  }, [exams]);

  // Format badge status style
  const renderStatusBadge = (status: PlanStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
            Active
          </span>
        );
      case 'DRAFT':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
            Draft
          </span>
        );
      case 'INACTIVE':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            Inactive
          </span>
        );
      case 'ARCHIVED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            Archived
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const renderPlanTypeBadge = (planType: PlanType) => {
    switch (planType) {
      case 'PAID':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
            }}
          >
            Paid
          </span>
        );
      case 'FREE':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
            }}
          >
            Free
          </span>
        );
      case 'FREEMIUM':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FDE68A',
            }}
          >
            Freemium
          </span>
        );
      default:
        return <span>{planType}</span>;
    }
  };

  // ==========================================
  // VIEW: PLANS LISTING TABLE DATA (HOOK)
  // ==========================================

  // Map rows for the Table component (Must be declared before any conditional rendering to obey React Hook Rules)
  const tableData = useMemo(() => {
    return (plans || []).map((plan) => {
      // Plan Name Cell
      const nameCell = (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
            {plan.name}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
            {plan.code || 'NO-CODE'}
          </div>
        </div>
      );

      // Module Cell
      const moduleCell = (
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>
          {plan.module?.name || '—'}
        </span>
      );

      // Exam Cell (Inherited from Module)
      const examCell = (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#F1F5F9',
            color: '#334155',
            border: '1px solid #E2E8F0',
          }}
        >
          {plan.module?.exam?.title || plan.module?.exam?.code || 'Global'}
        </span>
      );

      // Plan Type Cell
      const planTypeCell = renderPlanTypeBadge(plan.planType);

      // Billing Cycle Cell
      const billingCycleCell = (
        <span style={{ fontSize: '13px', color: '#475569' }}>
          {plan.billingCycle.replace(/_/g, ' ')}
        </span>
      );

      // Duration Cell
      const durationCell = (
        <span style={{ fontSize: '13px', color: '#475569' }}>
          {plan.durationValue} {plan.durationUnit.toLowerCase()}
        </span>
      );

      // Price Cell
      const priceCell = (
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
            ₹{Number(plan.price).toLocaleString('en-IN')}
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>
            {plan.currency || 'INR'}
          </span>
        </div>
      );

      // Access Cell (Inherited from Module)
      const accessCell = (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #DBEAFE',
          }}
        >
          {plan.accessSummary || plan.module?.moduleType?.replace(/_/g, ' ') || 'Full Exam'}
        </span>
      );

      // Subscribers Cell
      const subscribersCell = (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
          {(plan.subscribers || 0).toLocaleString()}
        </span>
      );

      // Status Cell
      const statusCell = renderStatusBadge(plan.status);

      // Updated Date Cell
      const updatedDateCell = (
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          {new Date(plan.updatedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      );

      // Actions Cell
      const actionsCell = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetails(plan)}
            title="View Details"
          >
            <Eye size={15} />
          </Button>

          <DropdownMenu
            trigger={
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  color: '#64748B',
                }}
              >
                ⋮
              </button>
            }
            items={[
              {
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => handleOpenDetails(plan),
              },
              {
                label: 'Edit Plan',
                icon: <Edit2 size={14} />,
                onClick: () => handleOpenEditPlan(plan),
              },
              {
                label: 'Manage Pricing',
                icon: <DollarSign size={14} />,
                onClick: () => handleOpenPricingModal(plan),
              },
              {
                label: 'Duplicate Plan',
                icon: <Copy size={14} />,
                onClick: () => handleDuplicate(plan),
              },
              plan.status === 'ACTIVE'
                ? {
                    label: 'Deactivate',
                    icon: <X size={14} />,
                    onClick: () => handleToggleStatus(plan, 'INACTIVE'),
                  }
                : {
                    label: 'Activate',
                    icon: <Check size={14} />,
                    onClick: () => handleToggleStatus(plan, 'ACTIVE'),
                  },
              {
                label: 'Archive',
                icon: <Archive size={14} />,
                onClick: () => handleArchive(plan),
              },
              {
                label: 'Delete Plan',
                icon: <Trash2 size={14} color="#EF4444" />,
                onClick: () => handleDelete(plan),
              },
            ]}
          />
        </div>
      );

      return [
        <input type="checkbox" key={`cb-${plan.id}`} style={{ cursor: 'pointer' }} />,
        nameCell,
        moduleCell,
        examCell,
        planTypeCell,
        billingCycleCell,
        durationCell,
        priceCell,
        accessCell,
        subscribersCell,
        statusCell,
        updatedDateCell,
        actionsCell,
      ];
    });
  }, [plans]);

  const tableHeaders = [
    '',
    'Plan Name',
    'Module',
    'Exam',
    'Plan Type',
    'Billing Cycle',
    'Duration',
    'Price',
    'Access',
    'Subscribers',
    'Status',
    'Updated Date',
    'Actions',
  ];

  // ==========================================
  // VIEW: ADD / EDIT PLAN SCREEN
  // ==========================================
  const renderAddEditView = () => {
    const isEdit = viewMode === 'edit';
    return (
      <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
        {/* Header & Breadcrumb */}
        <PageHeader
          title={isEdit ? 'Edit Plan' : 'Add Plan'}


          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/plans' },
            { label: 'Plans', href: '/subscriptions/plans' },
            { label: isEdit ? 'Edit Plan' : 'Add Plan' },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => setViewMode('list')}
            >
              Back to Plans
            </Button>
          }
        />

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <Alert message={error} variant="error" />
          </div>
        )}

        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECTION 1 — BASIC INFORMATION */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                1
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Basic Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <FormField label="Plan Name" required helperText="e.g. UPSC Full - Monthly">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. UPSC Full - Monthly"
                />
              </FormField>

              <FormField label="Internal Code (Optional)" helperText="Unique code, e.g. PLAN-UPSC-FULL-M">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PLAN-UPSC-FULL-M"
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <FormField label="Module" required helperText="Select which Module this Plan sells">
                <Select
                  options={[
                    { value: '', label: 'Select Module...' },
                    ...modules
                      .filter((m) => m.status === 'ACTIVE' || m.id === form.moduleId)
                      .map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.exam?.titleEn || m.exam?.cycleCode || 'Global'})`,
                      })),
                  ]}
                  value={form.moduleId}
                  onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
                />
              </FormField>

              <FormField label="Plan Type" required helperText="Free, Freemium, or Paid">
                <Select
                  options={[
                    { value: 'PAID', label: 'Paid' },
                    { value: 'FREE', label: 'Free' },
                    { value: 'FREEMIUM', label: 'Freemium' },
                  ]}
                  value={form.planType}
                  onChange={(e) => {
                    const newType = e.target.value as PlanType;
                    setForm({
                      ...form,
                      planType: newType,
                      price: newType === 'FREE' ? 0 : form.price || 999,
                    });
                  }}
                />
              </FormField>

              <FormField label="Status" required helperText="Initial visibility">
                <Select
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    { value: 'ARCHIVED', label: 'Archived' },
                  ]}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PlanStatus })}
                />
              </FormField>
            </div>

            <FormField label="Description (Optional)" helperText="Brief summary for students">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Monthly plan for complete UPSC preparation access."
                rows={2}
              />
            </FormField>

            {/* Selected Module Preview Box */}
            {selectedModule && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                      Selected Module:
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      {selectedModule.name}
                    </span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                      }}
                    >
                      {selectedModule.exam?.titleEn || selectedModule.exam?.cycleCode || 'Global'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Type: <strong>{selectedModule.moduleType.replace(/_/g, ' ')}</strong>
                  </span>
                </div>

                {/* Features Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                    Included Features:
                  </span>
                  {selectedModule.entitlements && selectedModule.entitlements.length > 0 ? (
                    selectedModule.entitlements.map((ent) => (
                      <span
                        key={ent.id}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#E2E8F0',
                          color: '#334155',
                          fontWeight: 500,
                        }}
                      >
                        {ent.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Full module syllabus features
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 — PRICING & DURATION */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                2
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Pricing & Duration
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '14px',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Price (INR) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748B',
                      fontWeight: 600,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    disabled={form.planType === 'FREE'}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value)) })}
                    placeholder="999"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 24px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      backgroundColor: form.planType === 'FREE' ? '#F1F5F9' : '#FFFFFF',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Currency *
                </label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Billing Cycle *
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value as PlanBillingCycle })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly (6 Mo)</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONE_TIME">One Time</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Duration Value *
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.durationValue}
                  onChange={(e) => setForm({ ...form, durationValue: Math.max(1, Number(e.target.value)) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Duration Unit *
                </label>
                <select
                  value={form.durationUnit}
                  onChange={(e) => setForm({ ...form, durationUnit: e.target.value as PlanDurationUnit })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="DAYS">Days</option>
                  <option value="WEEKS">Weeks</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            </div>

            {form.planType === 'FREE' && (
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#047857' }}>
                ✓ Free Plan: Price is set to ₹0. Students can enroll without online transaction.
              </p>
            )}
          </div>

          {/* SECTION 3 — PLAN BENEFITS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                3
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Plan Benefits
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 38px', fontSize: '13px', color: '#64748B' }}>
              Add key commercial benefits that will be displayed to students on the purchase screen.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {form.benefits.map((benefit, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => handleMoveBenefit(index, 'up')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      opacity: index === 0 ? 0.3 : 0.7,
                      padding: 0,
                    }}
                  >
                    <GripVertical size={16} />
                  </button>

                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                    placeholder="e.g. 10,000+ MCQ practice questions"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                    }}
                  />

                  <button
                    type="button"
                    title="Delete benefit"
                    onClick={() => handleRemoveBenefitRow(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#EF4444',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={handleAddBenefitRow}
            >
              Add Benefit
            </Button>
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#94A3B8' }}>
              Note: Plan benefits are marketing display points. Access permissions are strictly governed by the Module.
            </span>
          </div>

          {/* SECTION 4 — MODULE ACCESS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                4
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Module Access
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 38px', fontSize: '13px', color: '#64748B' }}>
              This Plan automatically inherits access from the selected Module. No duplicate entitlement configuration is required.
            </p>

            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <ShieldCheck size={20} color="#2563EB" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E40AF' }}>
                  {selectedModule
                    ? `This Plan inherits all access permissions from: ${selectedModule.name}`
                    : 'Select a Module above to preview inherited permissions'}
                </span>
              </div>

              {selectedModule ? (
                <div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {selectedModule.entitlements && selectedModule.entitlements.length > 0 ? (
                      selectedModule.entitlements.map((ent) => {
                        const meta = FEATURE_NAMES_MAP[ent.featureKey];
                        const IconComp = meta?.icon || BookOpen;
                        return (
                          <div
                            key={ent.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '16px',
                              border: '1px solid #93C5FD',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1E3A8A',
                            }}
                          >
                            <IconComp size={14} color={meta?.color || '#2563EB'} />
                            <span>{ent.name}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '13px', color: '#3B82F6' }}>
                        All features included in {selectedModule.name}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#60A5FA' }}>
                    Permissions are read-only. If access features must change, update the parent Module.
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  Please choose a Module in Section 1.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 5 — TRIAL & RENEWAL */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                5
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Trial & Renewal
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Trial toggle */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: form.trialEnabled ? '#F0FDF4' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      Trial Period
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Offer free trial access before regular billing
                    </div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.trialEnabled}
                      onChange={(e) => setForm({ ...form, trialEnabled: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>
                </div>

                {form.trialEnabled && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Trial Duration
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.trialDuration}
                        onChange={(e) => setForm({ ...form, trialDuration: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Trial Unit
                      </label>
                      <select
                        value={form.trialDurationUnit}
                        onChange={(e) => setForm({ ...form, trialDurationUnit: e.target.value as PlanDurationUnit })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="DAYS">Days</option>
                        <option value="WEEKS">Weeks</option>
                        <option value="MONTHS">Months</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Renewal toggle */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: form.autoRenewEligible ? '#EFF6FF' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                      Auto Renewal Eligible
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Allow this Plan to be eligible for auto-renewal.
                    </div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.autoRenewEligible}
                      onChange={(e) => setForm({ ...form, autoRenewEligible: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </label>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                  Sets commercial auto-renewal eligibility. Gateway subscription mandate is configured upon transaction.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 6 — ADDITIONAL SETTINGS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                6
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                Additional Settings
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Display Order" helperText="Lower numbers appear first">
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  placeholder="0"
                />
              </FormField>

              <FormField label="Publish Date (Optional)" helperText="Scheduled launch date">
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginTop: '10px',
              marginBottom: '40px',
            }}
          >
            <Button
              variant="outline"
              onClick={() => setViewMode('list')}
              disabled={submitting}
            >
              Cancel
            </Button>

            <div style={{ display: 'flex', gap: '12px' }}>
              {!isEdit && (
                <Button
                  variant="outline"
                  onClick={() => handleSubmitPlan(true)}
                  disabled={submitting}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => handleSubmitPlan(false)}
                disabled={submitting}
                leftIcon={submitting ? <LoadingSpinner size="sm" /> : <Check size={16} />}
              >
                {isEdit ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW: PLANS LISTING TABLE
  // ==========================================
  const renderListView = () => (
    <>
      {/* 1. Page Header & Breadcrumbs */}
      <PageHeader
        title="Plans"

        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Subscriptions & Payments', href: '/subscriptions/plans' },
          { label: 'Plans' },
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
              onClick={handleOpenAddPlan}
            >
              Add Plan
            </Button>
          </div>
        }
      />

      {/* Alert Notifications */}
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

      {/* 2. KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          title="Total Plans"
          value={metrics.totalPlans}
          icon={<Layers size={22} color="#1E293B" />}
          changeLabel="Total variations"
        />
        <MetricCard
          title="Active Plans"
          value={metrics.activePlans}
          icon={<CheckCircle2 size={22} color="#10B981" />}
          changeLabel="Live plans available"
        />
        <MetricCard
          title="Paid Plans"
          value={metrics.paidPlans}
          icon={<CreditCard size={22} color="#3B82F6" />}
          changeLabel="Commercial offerings"
        />
        <MetricCard
          title="Active Subscribers"
          value={metrics.activeSubscribers}
          icon={<Users size={22} color="#8B5CF6" />}
          changeLabel="Total active"
        />
      </div>

      {/* 3. Compact Filter Row */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 0.9fr 1fr 0.9fr auto',
            gap: '10px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Search
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by plan name, module, description..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Module
            </label>
            <Select
              options={moduleFilterOptions}
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Exam
            </label>
            <Select
              options={examFilterOptions}
              value={examFilter}
              onChange={(e) => {
                setExamFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Plan Type
            </label>
            <Select
              options={PLAN_TYPE_OPTIONS}
              value={planTypeFilter}
              onChange={(e) => {
                setPlanTypeFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Billing Cycle
            </label>
            <Select
              options={BILLING_CYCLE_OPTIONS}
              value={billingCycleFilter}
              onChange={(e) => {
                setBillingCycleFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw size={14} />}
            title="Reset Filters"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* 4. Plans Table / Empty State */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <LoadingSpinner size="lg" />
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748B' }}>
              Loading subscription plans...
            </p>
          </div>
        ) : plans.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <EmptyState
              title="No plans created yet."
              description="Create a Plan to configure pricing and duration for one of your Modules."
              actionLabel="+ Add Plan"
              onAction={handleOpenAddPlan}
            />
          </div>
        ) : (
          <>
            <Table headers={tableHeaders} rows={tableData} />

            {/* Pagination */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Showing{' '}
                <strong>
                  {Math.min(1 + (page - 1) * pageSize, totalCount)}–
                  {Math.min(page * pageSize, totalCount)}
                </strong>{' '}
                of <strong>{totalCount}</strong> plans
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  // ==========================================
  // VIEW: PLAN DETAILS MODAL / DRAWER
  // ==========================================
  const renderDetailsModal = () => {
    if (!selectedPlanDetails) return null;
    return (
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Plan Details: ${selectedPlanDetails.name}`}
        maxWidth="700px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {selectedPlanDetails.name}
              </h4>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                {selectedPlanDetails.code || 'NO-CODE'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {renderPlanTypeBadge(selectedPlanDetails.planType)}
              {renderStatusBadge(selectedPlanDetails.status)}
            </div>
          </div>

          {/* Grid of properties */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Module</span>
              <strong style={{ fontSize: '13px', color: '#1E293B' }}>{selectedPlanDetails.module?.name || '—'}</strong>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Exam (Inherited)</span>
              <strong style={{ fontSize: '13px', color: '#1E293B' }}>
                {selectedPlanDetails.module?.exam?.title || selectedPlanDetails.module?.exam?.code || 'Global'}
              </strong>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Price</span>
              <strong style={{ fontSize: '14px', color: '#0F172A' }}>
                ₹{Number(selectedPlanDetails.price).toLocaleString('en-IN')} {selectedPlanDetails.currency}
              </strong>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Billing Cycle</span>
              <strong style={{ fontSize: '13px', color: '#1E293B' }}>
                {selectedPlanDetails.billingCycle.replace(/_/g, ' ')}
              </strong>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Duration</span>
              <strong style={{ fontSize: '13px', color: '#1E293B' }}>
                {selectedPlanDetails.durationValue} {selectedPlanDetails.durationUnit.toLowerCase()}
              </strong>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748B' }}>Active Subscribers</span>
              <strong style={{ fontSize: '14px', color: '#8B5CF6' }}>
                {(selectedPlanDetails.subscribers || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Inherited Module Access Features */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              padding: '14px 18px',
              border: '1px solid #BFDBFE',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                Access inherited from Module: {selectedPlanDetails.module?.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedPlanDetails.module?.entitlements && selectedPlanDetails.module.entitlements.length > 0 ? (
                selectedPlanDetails.module.entitlements.map((ent) => (
                  <span
                    key={ent.id}
                    style={{
                      padding: '3px 10px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#1E3A8A',
                      border: '1px solid #93C5FD',
                    }}
                  >
                    {ent.name}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: '#3B82F6' }}>
                  Full access permissions inherited from module
                </span>
              )}
            </div>
          </div>

          {/* Plan Benefits */}
          {selectedPlanDetails.benefits && (selectedPlanDetails.benefits as string[]).length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Commercial Plan Benefits
              </h5>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                {(selectedPlanDetails.benefits as string[]).map((b, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trial & Renewal & Timestamps */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              fontSize: '12px',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '14px',
            }}
          >
            <div>
              <span style={{ color: '#64748B' }}>Trial:</span>{' '}
              <strong>
                {selectedPlanDetails.trialEnabled
                  ? `${selectedPlanDetails.trialDuration} ${selectedPlanDetails.trialDurationUnit?.toLowerCase()}`
                  : 'Disabled'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Auto Renewal:</span>{' '}
              <strong>{selectedPlanDetails.autoRenewEligible ? 'Eligible' : 'No'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Created:</span>{' '}
              <strong>{new Date(selectedPlanDetails.createdAt).toLocaleDateString()}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Updated:</span>{' '}
              <strong>{new Date(selectedPlanDetails.updatedAt).toLocaleDateString()}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailsModalOpen(false);
                handleOpenEditPlan(selectedPlanDetails);
              }}
              leftIcon={<Edit2 size={14} />}
            >
              Edit Plan
            </Button>
            <Button variant="primary" size="sm" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // ==========================================
  // VIEW: MANAGE PRICING MODAL
  // ==========================================
  const renderPricingModal = () => {
    if (!pricingPlan) return null;
    return (
      <Modal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        title={`Manage Pricing: ${pricingPlan.name}`}
        maxWidth="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Update commercial pricing and duration parameters. Existing subscribers will retain their original rate.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Price" required>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                    fontWeight: 600,
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  disabled={pricingPlan.planType === 'FREE'}
                  value={pricingForm.price}
                  onChange={(e) => setPricingForm({ ...pricingForm, price: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 24px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                  }}
                />
              </div>
            </FormField>

            <FormField label="Currency">
              <input
                type="text"
                value={pricingForm.currency}
                onChange={(e) => setPricingForm({ ...pricingForm, currency: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <FormField label="Billing Cycle">
              <select
                value={pricingForm.billingCycle}
                onChange={(e) => setPricingForm({ ...pricingForm, billingCycle: e.target.value as PlanBillingCycle })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half-Yearly</option>
                <option value="YEARLY">Yearly</option>
                <option value="ONE_TIME">One Time</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </FormField>

            <FormField label="Duration Value">
              <input
                type="number"
                min="1"
                value={pricingForm.durationValue}
                onChange={(e) => setPricingForm({ ...pricingForm, durationValue: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </FormField>

            <FormField label="Duration Unit">
              <select
                value={pricingForm.durationUnit}
                onChange={(e) => setPricingForm({ ...pricingForm, durationUnit: e.target.value as PlanDurationUnit })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" onClick={() => setPricingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePricing}
              disabled={submitting}
              leftIcon={submitting ? <LoadingSpinner size="sm" /> : <Check size={15} />}
            >
              Save Pricing
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // ==========================================
  // MAIN COMPONENT RENDER
  // ==========================================
  return (
    <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {viewMode === 'add' || viewMode === 'edit'
        ? renderAddEditView()
        : renderListView()}

      {renderDetailsModal()}
      {renderPricingModal()}
    </div>
  );
};

export default PlansPage;
