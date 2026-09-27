import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  MetricCard,
  SearchInput,
  Select,
  Button,
  Table,
  Pagination,
  StatusBadge,
  Badge,
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
  Users,
  CheckCircle2,
  CreditCard,
  Plus,
  Download,
  Filter,
  Eye,
  Edit2,
  Copy,
  Archive,
  Power,
  X,
} from 'lucide-react';
import { PlansApi, Plan, PlanEntitlement } from '../../api/plans.api';
import { ProductsApi, Product } from '../../api/products.api';

const PLAN_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Plan Types' },
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

const DURATION_UNIT_OPTIONS = [
  { value: 'ALL', label: 'All Durations' },
  { value: 'DAYS', label: 'Days' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'YEARS', label: 'Years' },
];

export const PlansPage: React.FC = () => {
  // Data State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState({
    totalPlans: 0,
    activePlans: 0,
    paidPlans: 0,
    activeSubscribers: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message: string } | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('ALL');
  const [selectedPlanType, setSelectedPlanType] = useState('ALL');
  const [selectedDurationUnit, setSelectedDurationUnit] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Drawers State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; title: string; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    productId: '',
    planType: 'PAID',
    price: 0,
    currency: 'INR',
    duration: 1,
    durationUnit: 'MONTHS',
    status: 'DRAFT',
    trialEnabled: false,
    autoRenew: false,
  });
  const [formFeatures, setFormFeatures] = useState<string[]>(['']);
  const [formEntitlements, setFormEntitlements] = useState<PlanEntitlement[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchProducts = async () => {
    try {
      const res = await ProductsApi.getProducts({ page: 1, pageSize: 100 });
      setProducts(res.items);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedProductId !== 'ALL') params.productId = selectedProductId;
      if (selectedPlanType !== 'ALL') params.planType = selectedPlanType;
      if (selectedDurationUnit !== 'ALL') params.durationUnit = selectedDurationUnit;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await PlansApi.getPlans(params);
      setPlans(res.plans);
      setPagination(prev => ({
        ...prev,
        total: res.total,
        totalPages: res.totalPages,
      }));

      // In real app, this should be fetched from an endpoint /metrics
      let active = 0;
      let paid = 0;
      let subscribers = 0;
      res.plans.forEach(p => {
        if (p.status === 'ACTIVE') active++;
        if (p.planType === 'PAID') paid++;
        subscribers += p.activeSubscribers || 0;
      });
      setMetrics({
        totalPlans: res.total,
        activePlans: active,
        paidPlans: paid,
        activeSubscribers: subscribers,
      });

    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Error', message: 'Failed to load plans.' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, selectedProductId, selectedPlanType, selectedDurationUnit, selectedStatus]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedProductId('ALL');
    setSelectedPlanType('ALL');
    setSelectedDurationUnit('ALL');
    setSelectedStatus('ALL');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOpenAddForm = () => {
    setCurrentPlan(null);
    setFormData({
      name: '',
      productId: '',
      planType: 'PAID',
      price: 0,
      currency: 'INR',
      duration: 1,
      durationUnit: 'MONTHS',
      status: 'DRAFT',
      trialEnabled: false,
      autoRenew: false,
      displayOrder: 0,
    });
    setFormFeatures(['']);
    setFormEntitlements([]);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEditForm = (plan: Plan) => {
    setCurrentPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      productId: plan.productId,
      planType: plan.planType,
      price: plan.price,
      discountPrice: plan.discountPrice || 0,
      currency: plan.currency,
      duration: plan.duration,
      durationUnit: plan.durationUnit,
      status: plan.status,
      trialEnabled: plan.trialEnabled,
      trialDuration: plan.trialDuration || 0,
      trialDurationUnit: plan.trialDurationUnit || 'DAYS',
      autoRenew: plan.autoRenew,
      displayOrder: plan.displayOrder,
    });
    setFormFeatures(plan.features ? JSON.parse(plan.features as any) : ['']);
    setFormEntitlements(plan.entitlements || []);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleActionClick = (action: string, plan: Plan) => {
    if (action === 'edit') handleOpenEditForm(plan);
    else if (action === 'duplicate') {
      setConfirmAction({
        type: 'duplicate',
        id: plan.id,
        title: 'Duplicate Plan',
        message: `Are you sure you want to duplicate "${plan.name}"? The new plan will be created in DRAFT status.`
      });
      setIsConfirmModalOpen(true);
    } else if (action === 'activate') {
      setConfirmAction({
        type: 'activate',
        id: plan.id,
        title: 'Activate Plan',
        message: `Are you sure you want to activate "${plan.name}"? It will become available for subscriptions.`
      });
      setIsConfirmModalOpen(true);
    } else if (action === 'deactivate') {
      setConfirmAction({
        type: 'deactivate',
        id: plan.id,
        title: 'Deactivate Plan',
        message: `Are you sure you want to deactivate "${plan.name}"? Existing subscriptions will remain active.`
      });
      setIsConfirmModalOpen(true);
    } else if (action === 'archive') {
      setConfirmAction({
        type: 'archive',
        id: plan.id,
        title: 'Archive Plan',
        message: `Are you sure you want to archive "${plan.name}"? This action hides the plan from everywhere.`
      });
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'duplicate') {
        await PlansApi.duplicatePlan(confirmAction.id);
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan duplicated successfully.' });
      } else if (confirmAction.type === 'activate') {
        await PlansApi.updatePlanStatus(confirmAction.id, 'ACTIVE');
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan activated.' });
      } else if (confirmAction.type === 'deactivate') {
        await PlansApi.updatePlanStatus(confirmAction.id, 'INACTIVE');
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan deactivated.' });
      } else if (confirmAction.type === 'archive') {
        await PlansApi.deletePlan(confirmAction.id);
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan archived.' });
      }
      fetchPlans();
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Error', message: 'Action failed.' });
    } finally {
      setIsConfirmModalOpen(false);
      setConfirmAction(null);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.productId) errors.productId = 'Product is required';
    if (formData.planType !== 'FREE' && (!formData.price || formData.price <= 0)) {
      errors.price = 'Price must be greater than 0 for Paid/Freemium plans';
    }
    if (!formData.duration || formData.duration <= 0) errors.duration = 'Duration is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<Plan> = {
        ...formData,
        features: JSON.stringify(formFeatures.filter(f => f.trim() !== '')) as any,
        entitlements: formEntitlements.filter(e => e.entitlementKey.trim() !== '')
      };

      if (currentPlan) {
        await PlansApi.updatePlan(currentPlan.id, payload);
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan updated successfully.' });
      } else {
        await PlansApi.createPlan(payload);
        setAlertInfo({ type: 'success', title: 'Success', message: 'Plan created successfully.' });
      }
      setIsFormModalOpen(false);
      fetchPlans();
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Error', message: 'Failed to save plan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlanTypeBadge = (type: string) => {
    switch (type) {
      case 'FREE': return <Badge variant="neutral" label="Free" />;
      case 'FREEMIUM': return <Badge variant="info" label="Freemium" />;
      case 'PAID': return <Badge variant="success" label="Paid" />;
      default: return <Badge variant="neutral" label={type} />;
    }
  };

  const tableHeaders = [
    'Plan Name',
    'Product',
    'Type',
    'Price',
    'Duration',
    'Subscribers',
    'Status',
    'Actions'
  ];

  const tableRows = plans.map(plan => {
    const actions = [
      { label: 'Edit Plan', icon: <Edit2 size={14} />, onClick: () => handleActionClick('edit', plan) },
      { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => handleActionClick('duplicate', plan) },
      plan.status === 'ACTIVE'
        ? { label: 'Deactivate', icon: <Power size={14} color="#D97706" />, onClick: () => handleActionClick('deactivate', plan) }
        : { label: 'Activate', icon: <CheckCircle2 size={14} color="#059669" />, onClick: () => handleActionClick('activate', plan) },
      { label: 'Archive', icon: <Archive size={14} color="#DC2626" />, danger: true, onClick: () => handleActionClick('archive', plan) },
    ];

    return [
      <div key={`${plan.id}-name`} className="font-medium text-slate-900">{plan.name}</div>,
      <div key={`${plan.id}-prod`} className="text-sm text-slate-600">{plan.product?.name || '-'}</div>,
      <div key={`${plan.id}-type`}>{renderPlanTypeBadge(plan.planType)}</div>,
      <div key={`${plan.id}-price`} className="text-sm">
        {plan.planType === 'FREE' ? '₹0' : `₹${plan.price}`}
      </div>,
      <div key={`${plan.id}-dur`} className="text-sm">{`${plan.duration} ${plan.durationUnit}`}</div>,
      <div key={`${plan.id}-subs`} className="text-sm font-medium">{plan.activeSubscribers || 0}</div>,
      <div key={`${plan.id}-status`}><StatusBadge status={plan.status} /></div>,
      <div key={`${plan.id}-action`} className="flex justify-end">
        <DropdownMenu
          trigger={
            <button
              type="button"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#64748B' }}
              aria-label="Actions"
            >
              •••
            </button>
          }
          items={actions}
          align="right"
        />
      </div>
    ];
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <PageHeader
        title="Plans"
        subtitle="Manage subscription plans, pricing, duration, entitlements, and linked products."
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" leftIcon={<Download size={15} />}>
              Export
            </Button>
            <Button onClick={handleOpenAddForm} leftIcon={<Plus size={15} />}>
              Add Plan
            </Button>
          </div>
        }
      />

      {alertInfo && (
        <div className="mb-6">
          <Alert
            variant={alertInfo.type}
            title={alertInfo.title}
            message={alertInfo.message}
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Plans"
          value={metrics.totalPlans.toString()}
          icon={<Layers size={22} color="#4F46E5" />}
          changeLabel="Total variations"
        />
        <MetricCard
          title="Active Plans"
          value={metrics.activePlans.toString()}
          icon={<CheckCircle2 size={22} color="#16A34A" />}
          badgeText="Live"
        />
        <MetricCard
          title="Paid Plans"
          value={metrics.paidPlans.toString()}
          icon={<CreditCard size={22} color="#2563EB" />}
          badgeText="Premium"
        />
        <MetricCard
          title="Active Subscribers"
          value={metrics.activeSubscribers.toString()}
          icon={<Users size={22} color="#D97706" />}
          changeLabel="Total active"
        />
      </div>

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="w-full lg:w-1/3">
            <SearchInput
              placeholder="Search plans by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-1/6">
            <Select
              options={[{ value: 'ALL', label: 'All Products' }, ...products.map(p => ({ value: p.id, label: p.name }))]}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-1/6">
            <Select
              options={PLAN_TYPE_OPTIONS}
              value={selectedPlanType}
              onChange={(e) => setSelectedPlanType(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-1/6">
            <Select
              options={DURATION_UNIT_OPTIONS}
              value={selectedDurationUnit}
              onChange={(e) => setSelectedDurationUnit(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-1/6">
            <Select
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            />
          </div>
          <Button variant="ghost" onClick={handleResetFilters} leftIcon={<Filter size={15} />}>
            Reset
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            title="No plans found"
            description="Create a plan to configure pricing, duration and access for your products."
            actionLabel="Add Plan"
            onAction={handleOpenAddForm}
          />
        ) : (
          <>
            <Table headers={tableHeaders} rows={tableRows} />
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-sm text-slate-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} plans
              </span>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              />
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title={currentPlan ? 'Edit Plan' : 'Create New Plan'}
        maxWidth="740px"
      >
        <div className="space-y-8 max-h-[70vh] overflow-y-auto p-1">
          {/* Section A: Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Plan Name" error={formErrors.name} required>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. KAS Premium Monthly"
                />
              </FormField>
              <FormField label="Link Product" error={formErrors.productId} required>
                <Select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  options={[
                    { value: '', label: 'Select Product' },
                    ...products.map(p => ({ value: p.id, label: p.name }))
                  ]}
                  disabled={!!currentPlan} // Cannot change product after creation usually
                />
              </FormField>
              <FormField label="Plan Type">
                <Select
                  value={formData.planType}
                  onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                  options={[
                    { value: 'FREE', label: 'Free' },
                    { value: 'FREEMIUM', label: 'Freemium' },
                    { value: 'PAID', label: 'Paid' },
                  ]}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Description">
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description of the plan..."
                    rows={2}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Section B: Pricing & Duration */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">Pricing & Duration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Price (₹)" error={formErrors.price} required={formData.planType !== 'FREE'}>
                <Input
                  type="number"
                  disabled={formData.planType === 'FREE'}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Discount Price (₹)">
                <Input
                  type="number"
                  disabled={formData.planType === 'FREE'}
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Duration Value" error={formErrors.duration} required>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Duration Unit" required>
                <Select
                  value={formData.durationUnit}
                  onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value as any })}
                  options={[
                    { value: 'DAYS', label: 'Days' },
                    { value: 'MONTHS', label: 'Months' },
                    { value: 'YEARS', label: 'Years' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          {/* Section C: Benefits */}
          <div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Plan Benefits (Display)</h3>
              <Button size="sm" variant="outline" onClick={() => setFormFeatures([...formFeatures, ''])}>
                <Plus size={14} className="mr-1" /> Add Benefit
              </Button>
            </div>
            <div className="space-y-3">
              {formFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Input
                    value={feat}
                    onChange={(e) => {
                      const newFeats = [...formFeatures];
                      newFeats[idx] = e.target.value;
                      setFormFeatures(newFeats);
                    }}
                    placeholder="e.g. Access to 50+ mock tests"
                  />
                  <button
                    onClick={() => setFormFeatures(formFeatures.filter((_, i) => i !== idx))}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {formFeatures.length === 0 && <p className="text-sm text-slate-500">No benefits added.</p>}
            </div>
          </div>

          {/* Section D: Entitlements */}
          <div>
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Plan Entitlements (Access Control)</h3>
              <Button size="sm" variant="outline" onClick={() => setFormEntitlements([...formEntitlements, { entitlementKey: '', name: '' }])}>
                <Plus size={14} className="mr-1" /> Add Entitlement
              </Button>
            </div>
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              {formEntitlements.map((ent, idx) => (
                <div key={idx} className="flex items-start space-x-2 bg-white p-3 rounded shadow-sm border border-slate-100">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Key (e.g. mock_test_access)"
                      value={ent.entitlementKey}
                      onChange={(e) => {
                        const arr = [...formEntitlements];
                        arr[idx].entitlementKey = e.target.value;
                        setFormEntitlements(arr);
                      }}
                    />
                    <Input
                      placeholder="Name (e.g. Mock Tests)"
                      value={ent.name}
                      onChange={(e) => {
                        const arr = [...formEntitlements];
                        arr[idx].name = e.target.value;
                        setFormEntitlements(arr);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setFormEntitlements(formEntitlements.filter((_, i) => i !== idx))}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', marginTop: '8px' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {formEntitlements.length === 0 && <p className="text-sm text-slate-500">No specific plan entitlements.</p>}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 w-full mt-6 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => setIsFormModalOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {currentPlan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmAction?.title || 'Confirm'}
        maxWidth="400px"
      >
        <p className="text-slate-600 mb-6">{confirmAction?.message}</p>
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmAction}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
};
