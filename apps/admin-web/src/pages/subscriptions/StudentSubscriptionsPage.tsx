// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  Plus,
  Download,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  PlayCircle,
  ArrowRightLeft,
  Calendar,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Package,
  Layers,
  FileText,
  HelpCircle,
  BookOpen,
  Award,
  Zap,
  Check,
  X,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  History,
  Info,
} from 'lucide-react';
import {
  studentSubscriptionsApi,
  StudentSubscriptionItem,
  SubscriptionMetrics,
  SubscriptionStatus,
  PaymentStatus,
  AssignmentSource,
  PlanSelectionOption,
  StudentOption,
} from '../../api/student-subscriptions.api';
import { SubscriptionModulesApi, SubscriptionModule } from '../../api/subscription-modules.api';
import { PlansApi, SubscriptionPlan } from '../../api/plans.api';
import { fetchExams } from '../../services/examApi';
import { ExamCycle } from '@study-karnataka/shared-types';

// ==========================================
// STATUS BADGES & HELPERS
// ==========================================

const SUBSCRIPTION_STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; bg: string; color: string; border: string; icon: any }
> = {
  ACTIVE: { label: 'Active', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: CheckCircle2 },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A', icon: Clock },
  PAUSED: { label: 'Paused', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', icon: PauseCircle },
  EXPIRED: { label: 'Expired', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: XCircle },
  SCHEDULED: { label: 'Scheduled', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: Calendar },
};

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  PAID: { label: 'Paid', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A' },
  NOT_REQUIRED: { label: 'Not Required', bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
  FAILED: { label: 'Failed', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  REFUNDED: { label: 'Refunded', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Payment Status' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NOT_REQUIRED', label: 'Not Required' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export const StudentSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [subscriptions, setSubscriptions] = useState<StudentSubscriptionItem[]>([]);
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planOptions, setPlanOptions] = useState<PlanSelectionOption[]>([]);
  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiringSoonSubscriptions: 0,
    expiredSubscriptions: 0,
    paidSubscriptions: 0,
    totalRevenue: 0,
  });

  // UI / Async State
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [examFilter, setExamFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedSubscription, setSelectedSubscription] = useState<StudentSubscriptionItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'info' | 'access' | 'payment' | 'history'>('info');

  // Add Subscription Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [studentSearchInput, setStudentSearchInput] = useState<string>('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [addStartDate, setAddStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [addOverrideExpiry, setAddOverrideExpiry] = useState<boolean>(false);
  const [addEndDate, setAddEndDate] = useState<string>('');
  const [addOverrideReason, setAddOverrideReason] = useState<string>('');
  const [addAssignmentSource, setAddAssignmentSource] = useState<string>('PAID_PURCHASE');
  const [addPaymentStatus, setAddPaymentStatus] = useState<string>('PAID');
  const [addPaymentMethod, setAddPaymentMethod] = useState<string>('UPI');
  const [addTransactionId, setAddTransactionId] = useState<string>('');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addAutoRenew, setAddAutoRenew] = useState<boolean>(false);
  const [addAdminNotes, setAddAdminNotes] = useState<string>('');
  const [addAllowOverlap, setAddAllowOverlap] = useState<boolean>(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // Action Modals State
  const [renewModalOpen, setRenewModalOpen] = useState<boolean>(false);
  const [renewTarget, setRenewTarget] = useState<StudentSubscriptionItem | null>(null);
  const [renewDurationValue, setRenewDurationValue] = useState<number>(1);
  const [renewDurationUnit, setRenewDurationUnit] = useState<string>('MONTHS');
  const [renewAmount, setRenewAmount] = useState<number>(0);
  const [renewReason, setRenewReason] = useState<string>('Renewal extension');

  const [changePlanModalOpen, setChangePlanModalOpen] = useState<boolean>(false);
  const [changePlanTarget, setChangePlanTarget] = useState<StudentSubscriptionItem | null>(null);
  const [newPlanId, setNewPlanId] = useState<string>('');
  const [changePlanRecalculate, setChangePlanRecalculate] = useState<boolean>(true);
  const [changePlanReason, setChangePlanReason] = useState<string>('');

  const [pauseModalOpen, setPauseModalOpen] = useState<boolean>(false);
  const [pauseTarget, setPauseTarget] = useState<StudentSubscriptionItem | null>(null);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [pauseResumeDate, setPauseResumeDate] = useState<string>('');

  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelTarget, setCancelTarget] = useState<StudentSubscriptionItem | null>(null);
  const [cancelImmediate, setCancelImmediate] = useState<boolean>(true);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Selected plan option in Add form
  const selectedPlanOption = useMemo(() => {
    return planOptions.find((p) => p.id === selectedPlanId) || null;
  }, [planOptions, selectedPlanId]);

  // Selected plan option in Change Plan form
  const targetChangePlanOption = useMemo(() => {
    return planOptions.find((p) => p.id === newPlanId) || null;
  }, [planOptions, newPlanId]);

  // Auto-calculated End Date in Add Form
  const calculatedAddEndDate = useMemo(() => {
    if (!selectedPlanOption || !addStartDate) return '';
    const start = new Date(addStartDate);
    const end = new Date(start);
    switch (selectedPlanOption.durationUnit?.toUpperCase()) {
      case 'DAYS':
        end.setDate(end.getDate() + selectedPlanOption.durationValue);
        break;
      case 'WEEKS':
        end.setDate(end.getDate() + selectedPlanOption.durationValue * 7);
        break;
      case 'MONTHS':
        end.setMonth(end.getMonth() + selectedPlanOption.durationValue);
        break;
      case 'YEARS':
        end.setFullYear(end.getFullYear() + selectedPlanOption.durationValue);
        break;
      default:
        end.setMonth(end.getMonth() + selectedPlanOption.durationValue);
    }
    return end.toISOString().slice(0, 10);
  }, [selectedPlanOption, addStartDate]);

  // Auto-update amount & payment defaults when plan changes in Add form
  useEffect(() => {
    if (selectedPlanOption) {
      const isFree = selectedPlanOption.planType === 'FREE' || selectedPlanOption.price === 0;
      setAddAmount(selectedPlanOption.price.toString());
      if (isFree) {
        setAddAssignmentSource('FREE_PLAN');
        setAddPaymentStatus('NOT_REQUIRED');
      } else {
        setAddAssignmentSource('PAID_PURCHASE');
        setAddPaymentStatus('PAID');
      }
      setAddAutoRenew(selectedPlanOption.autoRenewEligible);
      if (!addOverrideExpiry) {
        setAddEndDate(calculatedAddEndDate);
      }
    }
  }, [selectedPlanOption, calculatedAddEndDate, addOverrideExpiry]);

  // Student search effect in Add form
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isAddModalOpen) {
        try {
          const results = await studentSubscriptionsApi.searchStudents(studentSearchInput);
          setStudentSearchResults(results);
        } catch (e) {
          console.error('Failed to search students:', e);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [studentSearchInput, isAddModalOpen]);

  // Load Dropdown Options (Modules, Plans, Exams)
  const loadReferenceData = useCallback(async () => {
    try {
      const [modulesRes, plansRes, examsRes, planOpts] = await Promise.all([
        SubscriptionModulesApi.getModules({ pageSize: 100 }),
        PlansApi.getPlans({ pageSize: 100 }),
        fetchExams(),
        studentSubscriptionsApi.getPlansOptions(),
      ]);
      setModules(modulesRes.items || []);
      setPlans(plansRes.items || []);
      setExams(examsRes || []);
      setPlanOptions(planOpts || []);
    } catch (err: any) {
      console.error('Failed to load reference dropdown data:', err);
    }
  }, []);

  // Load Main Subscriptions List & Metrics
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, metricsRes] = await Promise.all([
        studentSubscriptionsApi.getSubscriptions({
          page,
          pageSize,
          search: search.trim() || undefined,
          moduleId: moduleFilter,
          planId: planFilter,
          examId: examFilter,
          status: statusFilter,
          paymentStatus: paymentStatusFilter,
        }),
        studentSubscriptionsApi.getMetrics(),
      ]);

      setSubscriptions(subsRes.items || []);
      setTotalPages(subsRes.pagination.totalPages || 1);
      setTotalCount(subsRes.pagination.total || 0);
      setMetrics(metricsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load student subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, moduleFilter, planFilter, examFilter, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear toast after 4s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setModuleFilter('ALL');
    setPlanFilter('ALL');
    setExamFilter('ALL');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setPage(1);
  };

  // Export CSV
  const handleExport = async () => {
    try {
      await studentSubscriptionsApi.exportSubscriptions({
        search,
        moduleId: moduleFilter,
        planId: planFilter,
        examId: examFilter,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
      });
      setSuccessMessage('Student subscriptions exported successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to export subscriptions');
    }
  };

  // Open Details Drawer
  const handleOpenDrawer = async (sub: StudentSubscriptionItem) => {
    try {
      const fresh = await studentSubscriptionsApi.getSubscriptionById(sub.id);
      setSelectedSubscription(fresh);
    } catch {
      setSelectedSubscription(sub);
    }
    setDrawerTab('info');
    setDrawerOpen(true);
  };

  // Open Add Subscription Modal
  const handleOpenAddModal = () => {
    setSelectedStudent(null);
    setStudentSearchInput('');
    setSelectedPlanId(planOptions[0]?.id || '');
    setAddStartDate(new Date().toISOString().slice(0, 10));
    setAddOverrideExpiry(false);
    setAddOverrideReason('');
    setAddAdminNotes('');
    setAddAllowOverlap(false);
    setAddFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add Subscription
  const handleCreateSubscription = async () => {
    if (!selectedStudent) {
      setAddFormError('Please select a student');
      return;
    }
    if (!selectedPlanId) {
      setAddFormError('Please select a plan');
      return;
    }
    if (addOverrideExpiry && !addOverrideReason.trim()) {
      setAddFormError('An override reason is required when manually setting the expiry date');
      return;
    }

    setActionLoading(true);
    setAddFormError(null);
    try {
      const created = await studentSubscriptionsApi.createSubscription({
        studentId: selectedStudent.studentProfileId || selectedStudent.userId,
        planId: selectedPlanId,
        startDate: addStartDate,
        endDate: addOverrideExpiry ? addEndDate : undefined,
        overrideExpiry: addOverrideExpiry,
        overrideReason: addOverrideReason,
        assignmentSource: addAssignmentSource,
        paymentStatus: addPaymentStatus,
        paymentMethod: addPaymentMethod,
        transactionId: addTransactionId || undefined,
        amount: addAmount ? parseFloat(addAmount) : undefined,
        autoRenew: addAutoRenew,
        adminNotes: addAdminNotes || undefined,
        allowOverlap: addAllowOverlap,
      });

      setSuccessMessage(`Subscription ${created.subscriptionNumber} assigned successfully to ${selectedStudent.fullName}.`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setAddFormError(err.message || 'Failed to create subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Renew
  const handleOpenRenew = (sub: StudentSubscriptionItem) => {
    setRenewTarget(sub);
    setRenewDurationValue(sub.plan?.durationValue || 1);
    setRenewDurationUnit(sub.plan?.durationUnit || 'MONTHS');
    setRenewAmount(sub.plan?.price || 0);
    setRenewReason('Monthly subscription renewal');
    setRenewModalOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!renewTarget) return;
    setActionLoading(true);
    try {
      await studentSubscriptionsApi.renewSubscription(renewTarget.id, {
        durationValue: renewDurationValue,
        durationUnit: renewDurationUnit,
        amount: renewAmount,
        reason: renewReason,
      });
      setSuccessMessage(`Subscription ${renewTarget.subscriptionNumber} renewed successfully.`);
      setRenewModalOpen(false);
      if (drawerOpen && selectedSubscription?.id === renewTarget.id) {
        handleOpenDrawer(renewTarget);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to renew subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Change Plan
  const handleOpenChangePlan = (sub: StudentSubscriptionItem) => {
    setChangePlanTarget(sub);
    setNewPlanId(planOptions.find((p) => p.id !== sub.plan?.id)?.id || '');
    setChangePlanRecalculate(true);
    setChangePlanReason('');
    setChangePlanModalOpen(true);
  };

  const handleConfirmChangePlan = async () => {
    if (!changePlanTarget || !newPlanId) return;
    if (!changePlanReason.trim()) {
      alert('Please provide a reason for the plan change.');
      return;
    }
    setActionLoading(true);
    try {
      await studentSubscriptionsApi.changePlan(changePlanTarget.id, {
        newPlanId,
        recalculateExpiry: changePlanRecalculate,
        reason: changePlanReason,
      });
      setSuccessMessage(`Plan changed successfully for ${changePlanTarget.subscriptionNumber}.`);
      setChangePlanModalOpen(false);
      if (drawerOpen && selectedSubscription?.id === changePlanTarget.id) {
        handleOpenDrawer(changePlanTarget);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to change plan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pause
  const handleOpenPause = (sub: StudentSubscriptionItem) => {
    setPauseTarget(sub);
    setPauseReason('Student requested pause');
    setPauseResumeDate('');
    setPauseModalOpen(true);
  };

  const handleConfirmPause = async () => {
    if (!pauseTarget) return;
    if (!pauseReason.trim()) {
      alert('Please provide a reason for pausing the subscription.');
      return;
    }
    setActionLoading(true);
    try {
      await studentSubscriptionsApi.pauseSubscription(pauseTarget.id, {
        reason: pauseReason,
        resumeDate: pauseResumeDate || undefined,
      });
      setSuccessMessage(`Subscription ${pauseTarget.subscriptionNumber} paused.`);
      setPauseModalOpen(false);
      if (drawerOpen && selectedSubscription?.id === pauseTarget.id) {
        handleOpenDrawer(pauseTarget);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to pause subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resume
  const handleResume = async (sub: StudentSubscriptionItem) => {
    if (!window.confirm(`Resume subscription ${sub.subscriptionNumber} and restore student access?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await studentSubscriptionsApi.resumeSubscription(sub.id);
      setSuccessMessage(`Subscription ${sub.subscriptionNumber} resumed successfully.`);
      if (drawerOpen && selectedSubscription?.id === sub.id) {
        handleOpenDrawer(sub);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resume subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel
  const handleOpenCancel = (sub: StudentSubscriptionItem) => {
    setCancelTarget(sub);
    setCancelImmediate(true);
    setCancelReason('Cancelled by admin');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    setActionLoading(true);
    try {
      await studentSubscriptionsApi.cancelSubscription(cancelTarget.id, {
        immediate: cancelImmediate,
        reason: cancelReason,
      });
      setSuccessMessage(
        cancelImmediate
          ? `Subscription ${cancelTarget.subscriptionNumber} cancelled immediately.`
          : `Subscription ${cancelTarget.subscriptionNumber} scheduled to cancel at end of period.`
      );
      setCancelModalOpen(false);
      if (drawerOpen && selectedSubscription?.id === cancelTarget.id) {
        handleOpenDrawer(cancelTarget);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  // Options for Dropdowns
  const moduleFilterOptions = useMemo(() => {
    return [{ value: 'ALL', label: 'All Modules' }, ...(modules || []).map((m) => ({ value: m.id, label: m.name }))];
  }, [modules]);

  const planFilterOptions = useMemo(() => {
    return [{ value: 'ALL', label: 'All Plans' }, ...(plans || []).map((p) => ({ value: p.id, label: p.name }))];
  }, [plans]);

  const examFilterOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Exams' },
      ...(exams || []).map((e) => ({ value: e.id, label: e.titleEn || e.cycleCode || 'Exam' })),
    ];
  }, [exams]);

  // Table Configuration
  const tableHeaders = [
    'Student',
    'Subscription ID',
    'Module',
    'Plan',
    'Exam',
    'Start Date',
    'End Date',
    'Subscription Status',
    'Payment Status',
    'Amount',
    'Auto Renew',
    'Actions',
  ];

  const tableRows = useMemo(() => {
    return (subscriptions || []).map((row: StudentSubscriptionItem) => {
      const subCfg = SUBSCRIPTION_STATUS_CONFIG[row.status] || SUBSCRIPTION_STATUS_CONFIG.ACTIVE;
      const payCfg = PAYMENT_STATUS_CONFIG[row.paymentStatus] || PAYMENT_STATUS_CONFIG.PAID;
      const SubIcon = subCfg.icon;

      // Student Cell
      const studentCell = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            {row.student.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
              {row.student.fullName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              {row.student.email}
            </div>
          </div>
        </div>
      );

      // Subscription ID Cell
      const subIdCell = (
        <span
          onClick={() => handleOpenDrawer(row)}
          style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#2563EB',
            cursor: 'pointer',
            backgroundColor: '#EFF6FF',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {row.subscriptionNumber}
        </span>
      );

      // Module Cell (Module Name with Exam badge)
      const moduleCell = (
        <div>
          <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
            {row.module?.name || 'Standard Module'}
          </div>
          {row.exam && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#1E40AF',
                backgroundColor: '#DBEAFE',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-block',
                marginTop: '2px',
              }}
            >
              {row.exam.cycleCode || row.exam.titleEn}
            </span>
          )}
        </div>
      );

      // Plan Cell
      const planCell = (
        <div>
          <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
            {row.plan?.name || 'Direct Plan'}
          </div>
          {row.plan && (
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {row.plan.durationValue} {row.plan.durationUnit?.toLowerCase()}
            </span>
          )}
        </div>
      );

      // Exam Cell
      const examCell = (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          {row.exam?.titleEn || 'Universal'}
        </span>
      );

      // Dates
      const startDateCell = (
        <span style={{ fontSize: '12.5px', color: '#334155' }}>
          {row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A'}
        </span>
      );

      const endDateCell = (
        <div>
          <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 500 }}>
            {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'Lifetime'}
          </span>
          {row.cancelAtPeriodEnd && (
            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600 }}>
              Cancels at period end
            </div>
          )}
        </div>
      );

      // Status Badges
      const subStatusCell = (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: subCfg.bg,
            color: subCfg.color,
            border: `1px solid ${subCfg.border}`,
          }}
        >
          <SubIcon size={12} />
          {subCfg.label}
        </span>
      );

      const payStatusCell = (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: payCfg.bg,
            color: payCfg.color,
            border: `1px solid ${payCfg.border}`,
          }}
        >
          {payCfg.label}
        </span>
      );

      // Amount
      const amountCell = (
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
          {row.amount > 0 ? `₹${row.amount.toLocaleString()}` : 'Free'}
        </span>
      );

      // Auto Renew
      const autoRenewCell = (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: row.autoRenew ? '#EFF6FF' : '#F1F5F9',
            color: row.autoRenew ? '#2563EB' : '#64748B',
          }}
        >
          {row.autoRenew ? 'On' : 'Off'}
        </span>
      );

      // Actions Menu
      const actionItems: any[] = [
        {
          label: 'View Details',
          icon: <Eye size={14} />,
          onClick: () => handleOpenDrawer(row),
        },
      ];

      if (row.status === 'ACTIVE' || row.status === 'EXPIRED') {
        actionItems.push({
          label: 'Renew / Extend',
          icon: <Calendar size={14} />,
          onClick: () => handleOpenRenew(row),
        });
      }

      if (row.status === 'ACTIVE') {
        actionItems.push({
          label: 'Change Plan',
          icon: <ArrowRightLeft size={14} />,
          onClick: () => handleOpenChangePlan(row),
        });
        actionItems.push({
          label: 'Pause Subscription',
          icon: <PauseCircle size={14} />,
          onClick: () => handleOpenPause(row),
        });
      }

      if (row.status === 'PAUSED') {
        actionItems.push({
          label: 'Resume Subscription',
          icon: <PlayCircle size={14} />,
          onClick: () => handleResume(row),
        });
      }

      if (row.status === 'ACTIVE' || row.status === 'PAUSED') {
        actionItems.push({
          label: 'Cancel Subscription',
          icon: <XCircle size={14} />,
          danger: true,
          onClick: () => handleOpenCancel(row),
        });
      }

      const actionsCell = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDrawer(row)}
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            View
          </Button>
          <DropdownMenu trigger={<MoreVertical size={16} color="#64748B" />} items={actionItems} />
        </div>
      );

      return [
        studentCell,
        subIdCell,
        moduleCell,
        planCell,
        examCell,
        startDateCell,
        endDateCell,
        subStatusCell,
        payStatusCell,
        amountCell,
        autoRenewCell,
        actionsCell,
      ];
    });
  }, [subscriptions]);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header & Actions */}
      <PageHeader
        title="Student Subscriptions"

        breadcrumb={[
          { label: 'Admin', path: '/' },
          { label: 'Subscriptions & Payments', path: '/subscriptions/student-subscriptions' },
          { label: 'Student Subscriptions' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              size="md"
              icon={<Download size={16} />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<RefreshCw size={16} />}
              onClick={loadData}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={handleOpenAddModal}
            >
              + Add Subscription
            </Button>
          </div>
        }
      />

      {/* Notifications */}
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

      {/* 2. Four KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          title="Total Subscriptions"
          value={metrics.totalSubscriptions}
          icon={<Users size={22} color="#475569" />}
          changeLabel="All time assigned"
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions}
          icon={<CheckCircle2 size={22} color="#10B981" />}
          changeLabel="Currently accessing platform"
        />
        <MetricCard
          title="Expiring Soon / Expired"
          value={`${metrics.expiringSoonSubscriptions} / ${metrics.expiredSubscriptions}`}
          icon={<Clock size={22} color="#F59E0B" />}
          changeLabel="Next 14 days / Total expired"
        />
        <MetricCard
          title="Paid Subscriptions"
          value={metrics.paidSubscriptions}
          icon={<CreditCard size={22} color="#3B82F6" />}
          changeLabel={`Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}`}
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
              Search
            </label>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, email, Sub ID, plan..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
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
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Plan
            </label>
            <Select
              options={planFilterOptions}
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
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
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Subscription Status
            </label>
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
              Payment Status
            </label>
            <Select
              options={PAYMENT_STATUS_FILTER_OPTIONS}
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
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

      {/* 4. Student Subscriptions Table */}
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
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No student subscriptions found"
            description="Assign a Plan to a Student to create the first active subscription."
            actionLabel="+ Add Subscription"
            onAction={handleOpenAddModal}
          />
        ) : (
          <>
            <Table headers={tableHeaders} rows={tableRows} />

            <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Showing {subscriptions.length} of {totalCount} subscriptions
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p: number) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SUBSCRIPTION DETAILS MODAL                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={drawerOpen && !!selectedSubscription}
        onClose={() => setDrawerOpen(false)}
        title="Subscription Details"
        maxWidth="760px"
      >
        {selectedSubscription && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
              style={{
                paddingBottom: '16px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '16px',
              }}
            >
              {/* Student Profile Card in Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                  >
                    {selectedSubscription.student.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                      {selectedSubscription.student.fullName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      {selectedSubscription.student.email}
                    </div>
                    {selectedSubscription.student.mobile && (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        {selectedSubscription.student.mobile}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/students/${selectedSubscription.student.id || selectedSubscription.student.userId}`)}
                  icon={<ExternalLink size={13} />}
                >
                  View Student
                </Button>
              </div>
            </div>

            {/* Navigation Tabs in Drawer */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
              {[
                { id: 'info', label: 'Subscription Info', icon: Info },
                { id: 'access', label: 'Module Access', icon: ShieldCheck },
                { id: 'payment', label: 'Payment Details', icon: CreditCard },
                { id: 'history', label: 'History', icon: History },
              ].map((t) => {
                const TabIcon = t.icon;
                const isActive = drawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDrawerTab(t.id as any)}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderBottom: `2px solid ${isActive ? '#2563EB' : 'transparent'}`,
                      color: isActive ? '#2563EB' : '#64748B',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <TabIcon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div style={{ marginTop: '16px' }}>
              {/* TAB 1: Subscription Info */}
              {drawerTab === 'info' && (
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '14px',
                      backgroundColor: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Subscription ID</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
                        {selectedSubscription.subscriptionNumber}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Exam</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.exam?.titleEn || 'All Exams'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Plan</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.plan?.name || 'Direct Plan'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Module</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.module?.name || 'Core Module'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Start Date</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.startDate ? new Date(selectedSubscription.startDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>End Date</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.endDate ? new Date(selectedSubscription.endDate).toLocaleDateString() : 'Lifetime'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Status</div>
                      <div style={{ marginTop: '2px' }}>
                        {(() => {
                          const cfg = SUBSCRIPTION_STATUS_CONFIG[selectedSubscription.status] || SUBSCRIPTION_STATUS_CONFIG.ACTIVE;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                              }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Payment Status</div>
                      <div style={{ marginTop: '2px' }}>
                        {(() => {
                          const cfg = PAYMENT_STATUS_CONFIG[selectedSubscription.paymentStatus] || PAYMENT_STATUS_CONFIG.PAID;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                              }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Amount</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.amount > 0 ? `₹${selectedSubscription.amount.toLocaleString()} ${selectedSubscription.currency}` : 'Free (₹0)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Auto Renew</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', marginTop: '2px' }}>
                        {selectedSubscription.autoRenew ? 'Enabled (Automatic)' : 'Off (Manual)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Assignment Source</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                        {selectedSubscription.assignmentSource}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Created On</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        {new Date(selectedSubscription.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {selectedSubscription.adminNotes && (
                    <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Admin Notes:</div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>{selectedSubscription.adminNotes}</div>
                    </div>
                  )}

                  {selectedSubscription.status === 'PAUSED' && selectedSubscription.pauseReason && (
                    <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '6px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', marginBottom: '2px' }}>Paused Reason:</div>
                      <div style={{ fontSize: '13px', color: '#92400E' }}>{selectedSubscription.pauseReason}</div>
                      {selectedSubscription.resumeDate && (
                        <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                          Scheduled resume: {new Date(selectedSubscription.resumeDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Module Access (READ-ONLY) */}
              {drawerTab === 'access' && (
                <div>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '8px',
                      border: '1px solid #BFDBFE',
                      marginBottom: '16px',
                      fontSize: '12.5px',
                      color: '#1E40AF',
                      lineHeight: '1.4',
                    }}
                  >
                    <strong>Read-Only Access Architecture:</strong> Feature entitlements and exam scope are automatically inherited from the linked Module (<strong>{selectedSubscription.module?.name}</strong>). To alter unlocked features, modify the Module itself.
                  </div>

                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Module Name</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {selectedSubscription.module?.name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Exam Scope</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {selectedSubscription.exam?.titleEn || 'Global'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Access Scope</div>
                        <div style={{ fontSize: '13px', color: '#334155' }}>
                          {selectedSubscription.module?.scopeType === 'ENTIRE_EXAM' ? 'Entire Exam' : 'Selected Features'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Module Type</div>
                        <div style={{ fontSize: '13px', color: '#334155' }}>
                          {selectedSubscription.module?.moduleType}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                      Included Features (
                      {selectedSubscription.module?.features?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedSubscription.module?.features?.map((feat, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={14} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Payment Details */}
              {drawerTab === 'payment' && (
                <div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Payment Method</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                        {selectedSubscription.paymentMethod || 'Online Gateway / System'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Amount Charged</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        {selectedSubscription.amount > 0 ? `₹${selectedSubscription.amount.toLocaleString()} ${selectedSubscription.currency}` : 'Free'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Payment Status</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                        {selectedSubscription.paymentStatus}
                      </span>
                    </div>

                    {selectedSubscription.transactionId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Transaction ID</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: '#2563EB' }}>
                          {selectedSubscription.transactionId}
                        </span>
                      </div>
                    )}

                    {selectedSubscription.invoiceId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Invoice Number</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', color: '#0F172A' }}>
                          {selectedSubscription.invoiceId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Activity & History */}
              {drawerTab === 'history' && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                    Activity Timeline
                  </div>
                  {(!selectedSubscription.histories || selectedSubscription.histories.length === 0) ? (
                    <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>
                      No history recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid #E2E8F0', paddingLeft: '14px', marginLeft: '6px' }}>
                      {selectedSubscription.histories.map((h) => (
                        <div key={h.id} style={{ position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: '-20px',
                              top: '2px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#2563EB',
                              border: '2px solid #FFFFFF',
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                              {h.action}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                              by {h.actorName || h.actorType}
                            </span>
                          </div>
                          {h.reason && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                              {h.reason}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            {new Date(h.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '10px',
              }}
            >
              {(selectedSubscription.status === 'ACTIVE' || selectedSubscription.status === 'EXPIRED') && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Calendar size={14} />}
                  onClick={() => handleOpenRenew(selectedSubscription)}
                >
                  Renew / Extend
                </Button>
              )}

              {selectedSubscription.status === 'ACTIVE' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowRightLeft size={14} />}
                    onClick={() => handleOpenChangePlan(selectedSubscription)}
                  >
                    Change Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<PauseCircle size={14} />}
                    onClick={() => handleOpenPause(selectedSubscription)}
                  >
                    Pause
                  </Button>
                </>
              )}

              {selectedSubscription.status === 'PAUSED' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlayCircle size={14} />}
                  onClick={() => handleResume(selectedSubscription)}
                >
                  Resume
                </Button>
              )}

              {(selectedSubscription.status === 'ACTIVE' || selectedSubscription.status === 'PAUSED') && (
                <Button
                  variant="outline"
                  size="sm"
                  style={{ color: '#DC2626', borderColor: '#FECACA' }}
                  icon={<XCircle size={14} />}
                  onClick={() => handleOpenCancel(selectedSubscription)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. + ADD SUBSCRIPTION MODAL (6 STRUCTURED SECTIONS)                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Student Subscription"
        maxWidth="750px"
      >
        <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '6px' }}>
          {addFormError && (
            <div style={{ marginBottom: '16px' }}>
              <Alert message={addFormError} variant="error" />
            </div>
          )}

          {/* Section 1: Student Selection */}
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
                Student *
              </h4>
            </div>

            {selectedStudent ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {selectedStudent.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {selectedStudent.fullName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {selectedStudent.email} {selectedStudent.mobile ? `• ${selectedStudent.mobile}` : ''}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div>
                <SearchInput
                  value={studentSearchInput}
                  onChange={(e) => setStudentSearchInput(e.target.value)}
                  placeholder="Search existing student by name, email, phone or ID..."
                />
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    marginTop: '6px',
                  }}
                >
                  {studentSearchResults.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
                      {studentSearchInput ? 'No students found' : 'Type to search students...'}
                    </div>
                  ) : (
                    studentSearchResults.map((s) => (
                      <div
                        key={s.userId}
                        onClick={() => setSelectedStudent(s)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{s.fullName}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>
                            {s.email}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" style={{ padding: '2px 8px', fontSize: '11px' }}>
                          Select
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Plan Selection */}
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
                Plan Selection *
              </h4>
            </div>

            <FormField label="Choose Active Plan" helperText="Module and exam are inherited automatically from the plan">
              <Select
                options={(planOptions || []).map((p) => ({
                  value: p.id,
                  label: `${p.name} — ₹${p.price} (${p.durationValue} ${p.durationUnit?.toLowerCase()}) [${p.module?.name || ''}]`,
                }))}
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              />
            </FormField>
          </div>

          {/* Section 3: Plan & Access Preview */}
          {selectedPlanOption && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ShieldCheck size={18} color="#2563EB" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Access Preview (Inherited Automatically)
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Module</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedPlanOption.module.name}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Exam</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedPlanOption.module.exam?.titleEn || 'Universal'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Standard Duration</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedPlanOption.durationValue} {selectedPlanOption.durationUnit?.toLowerCase()}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Included Features:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(selectedPlanOption.module?.features || []).map((feat, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#ECFDF5',
                        color: '#047857',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={12} /> {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Subscription Dates */}
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
                Subscription Dates
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Start Date *">
                <Input
                  type="date"
                  value={addStartDate}
                  onChange={(e) => setAddStartDate(e.target.value)}
                />
              </FormField>

              <FormField
                label="End Date (Auto-Calculated)"
                helperText={addOverrideExpiry ? 'Custom expiry enabled' : 'Calculated by backend from plan duration'}
              >
                <Input
                  type="date"
                  value={addOverrideExpiry ? addEndDate : calculatedAddEndDate}
                  disabled={!addOverrideExpiry}
                  onChange={(e) => setAddEndDate(e.target.value)}
                />
              </FormField>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={addOverrideExpiry}
                onChange={(e) => setAddOverrideExpiry(e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>Override Expiry Date manually</span>
            </label>

            {addOverrideExpiry && (
              <FormField label="Reason for Date Override *" helperText="Mandatory for audit logging">
                <Input
                  value={addOverrideReason}
                  onChange={(e) => setAddOverrideReason(e.target.value)}
                  placeholder="e.g. Compensatory validity extension approved by admin"
                />
              </FormField>
            )}
          </div>

          {/* Section 5: Assignment Source & Payment */}
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
                4
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Assignment Source & Payment
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Assignment Source *">
                <Select
                  options={[
                    { value: 'PAID_PURCHASE', label: 'Paid Purchase' },
                    { value: 'ADMIN_GRANT', label: 'Admin Grant (Scholarship/Free)' },
                    { value: 'FREE_PLAN', label: 'Free Plan' },
                    { value: 'PROMOTION', label: 'Promotion / Offer' },
                    { value: 'MIGRATION', label: 'Migration' },
                    { value: 'COMPENSATION', label: 'Compensation' },
                  ]}
                  value={addAssignmentSource}
                  onChange={(e) => {
                    const src = e.target.value;
                    setAddAssignmentSource(src);
                    if (src === 'ADMIN_GRANT' || src === 'FREE_PLAN') {
                      setAddPaymentStatus('NOT_REQUIRED');
                      setAddAmount('0');
                    } else {
                      setAddPaymentStatus('PAID');
                      if (selectedPlanOption) setAddAmount(selectedPlanOption.price.toString());
                    }
                  }}
                />
              </FormField>

              <FormField label="Payment Status *">
                <Select
                  options={[
                    { value: 'PAID', label: 'Paid' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'NOT_REQUIRED', label: 'Not Required' },
                    { value: 'FAILED', label: 'Failed' },
                  ]}
                  value={addPaymentStatus}
                  onChange={(e) => setAddPaymentStatus(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <FormField label="Amount (INR) *">
                <Input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                />
              </FormField>

              <FormField label="Payment Method">
                <Select
                  options={[
                    { value: 'UPI', label: 'UPI' },
                    { value: 'CARD', label: 'Credit/Debit Card' },
                    { value: 'NET_BANKING', label: 'Net Banking' },
                    { value: 'MANUAL_OFFLINE', label: 'Offline / Bank Transfer' },
                  ]}
                  value={addPaymentMethod}
                  onChange={(e) => setAddPaymentMethod(e.target.value)}
                />
              </FormField>

              <FormField label="Transaction / Ref ID">
                <Input
                  value={addTransactionId}
                  onChange={(e) => setAddTransactionId(e.target.value)}
                  placeholder="e.g. TXN-12345"
                />
              </FormField>
            </div>
          </div>

          {/* Section 6: Renewal, Overlap & Notes */}
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
                5
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Options & Internal Notes
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {selectedPlanOption?.autoRenewEligible ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addAutoRenew}
                    onChange={(e) => setAddAutoRenew(e.target.checked)}
                  />
                  <span>Enable Auto Renewal for this subscription</span>
                </label>
              ) : (
                <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                  Auto renewal is not supported for this Plan.
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={addAllowOverlap}
                  onChange={(e) => setAddAllowOverlap(e.target.checked)}
                />
                <span>Allow overlapping duplicate active subscription if one already exists</span>
              </label>
            </div>

            <FormField label="Admin Notes" helperText="Internal reference for subscription audit log">
              <Textarea
                value={addAdminNotes}
                onChange={(e) => setAddAdminNotes(e.target.value)}
                placeholder="e.g. Granted under special educator recommendation"
                rows={2}
              />
            </FormField>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={actionLoading} onClick={handleCreateSubscription}>
            Create Subscription
          </Button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. RENEW / EXTEND MODAL                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title={`Renew / Extend Subscription: ${renewTarget?.subscriptionNumber}`}
        maxWidth="500px"
      >
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#475569' }}>
            Current Expiry: <strong>{renewTarget?.endDate ? new Date(renewTarget.endDate).toLocaleDateString() : 'Lifetime'}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <FormField label="Duration Value *">
              <Input
                type="number"
                min={1}
                value={renewDurationValue}
                onChange={(e) => setRenewDurationValue(parseInt(e.target.value) || 1)}
              />
            </FormField>

            <FormField label="Duration Unit *">
              <Select
                options={[
                  { value: 'DAYS', label: 'Days' },
                  { value: 'WEEKS', label: 'Weeks' },
                  { value: 'MONTHS', label: 'Months' },
                  { value: 'YEARS', label: 'Years' },
                ]}
                value={renewDurationUnit}
                onChange={(e) => setRenewDurationUnit(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Renewal Fee (INR)">
            <Input
              type="number"
              value={renewAmount}
              onChange={(e) => setRenewAmount(parseFloat(e.target.value) || 0)}
            />
          </FormField>

          <FormField label="Reason for Extension *">
            <Input
              value={renewReason}
              onChange={(e) => setRenewReason(e.target.value)}
              placeholder="e.g. Monthly renewal payment confirmed"
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setRenewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={actionLoading} onClick={handleConfirmRenew}>
              Confirm Extension
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. CHANGE PLAN MODAL                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        title={`Change Plan: ${changePlanTarget?.subscriptionNumber}`}
        maxWidth="550px"
      >
        <div>
          <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '14px', fontSize: '13px' }}>
            Current Plan: <strong>{changePlanTarget?.plan?.name}</strong> (Module: {changePlanTarget?.module?.name})
          </div>

          <FormField label="Select New Plan *">
            <Select
              options={(planOptions || []).map((p) => ({
                value: p.id,
                label: `${p.name} — ₹${p.price} (${p.module?.name || ''})`,
              }))}
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
            />
          </FormField>

          {targetChangePlanOption && (
            <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE', margin: '12px 0', fontSize: '12.5px', color: '#1E40AF' }}>
              <div><strong>Access Impact:</strong> Student will now access <strong>{targetChangePlanOption.module?.name}</strong> ({targetChangePlanOption.module?.exam?.titleEn || 'Universal'}).</div>
              <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
                Included: {(targetChangePlanOption.module?.features || []).join(', ')}
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={changePlanRecalculate}
              onChange={(e) => setChangePlanRecalculate(e.target.checked)}
            />
            <span>Recalculate expiration date based on new plan duration</span>
          </label>

          <FormField label="Reason for Plan Change *">
            <Input
              value={changePlanReason}
              onChange={(e) => setChangePlanReason(e.target.value)}
              placeholder="e.g. Student upgraded to Full Access package"
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setChangePlanModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={actionLoading} onClick={handleConfirmChangePlan}>
              Confirm Plan Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 9. PAUSE MODAL                                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        title={`Pause Subscription: ${pauseTarget?.subscriptionNumber}`}
        maxWidth="480px"
      >
        <div>
          <div style={{ padding: '12px', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '14px', fontSize: '13px', color: '#92400E' }}>
            Pausing will suspend the student's access to <strong>{pauseTarget?.module?.name}</strong> until the subscription is resumed.
          </div>

          <FormField label="Pause Reason *">
            <Input
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="e.g. Student requested medical study leave"
            />
          </FormField>

          <FormField label="Optional Expected Resume Date">
            <Input
              type="date"
              value={pauseResumeDate}
              onChange={(e) => setPauseResumeDate(e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setPauseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" style={{ backgroundColor: '#B45309' }} isLoading={actionLoading} onClick={handleConfirmPause}>
              Pause Subscription
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 10. CANCEL MODAL                                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Subscription: ${cancelTarget?.subscriptionNumber}`}
        maxWidth="480px"
      >
        <div>
          <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA', marginBottom: '14px', fontSize: '13px', color: '#991B1B' }}>
            <strong>Important:</strong> Cancellation terminates platform access according to selected policy. Cancellation does NOT automatically trigger a financial refund.
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Cancellation Timing:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelImmediate}
                  onChange={() => setCancelImmediate(true)}
                />
                <span><strong>Cancel Immediately</strong> (access revoked now)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cancelType"
                  checked={!cancelImmediate}
                  onChange={() => setCancelImmediate(false)}
                />
                <span><strong>Cancel at End of Period</strong> (access continues until {cancelTarget?.endDate ? new Date(cancelTarget.endDate).toLocaleDateString() : 'end'})</span>
              </label>
            </div>
          </div>

          <FormField label="Cancellation Reason *">
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Student opted out / policy cancellation"
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button variant="primary" style={{ backgroundColor: '#DC2626' }} isLoading={actionLoading} onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentSubscriptionsPage;
