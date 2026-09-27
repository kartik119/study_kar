const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
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
  EmptyState,
} from '@study-karnataka/ui';
import {
  Ticket,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MoreVertical,
  Eye,
  Edit2,
  Copy,
  Trash2,
  X,
  Tag
} from 'lucide-react';
import { couponsApi } from '../../api/coupons.api';
import { SubscriptionModulesApi } from '../../api/subscription-modules.api';
import { PlansApi } from '../../api/plans.api';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE: { bg: '#F0FDF4', color: '#166534', border: '#DCFCE7', label: 'Active' },
  DRAFT: { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', label: 'Draft' },
  SCHEDULED: { bg: '#EFF6FF', color: '#1E40AF', border: '#DBEAFE', label: 'Scheduled' },
  INACTIVE: { bg: '#FFF7ED', color: '#9A3412', border: '#FFEDD5', label: 'Inactive' },
  EXPIRED: { bg: '#FEF2F2', color: '#991B1B', border: '#FEE2E2', label: 'Expired' }
};

export const CouponsPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalCoupons: { value: 0, trend: 0 },
    activeCoupons: { value: 0, trend: 0 },
    expiredCoupons: { value: 0, trend: 0 },
    totalRedemptions: { value: 0, trend: 0 },
  });
  
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modules, setModules] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [search, setSearch] = useState('');
  const [discountType, setDiscountType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  // Check if we are totally empty (no coupons at all vs no results for filter)
  const [isTotallyEmpty, setIsTotallyEmpty] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [page, pageSize, search, discountType, status, moduleFilter, planFilter]);

  const fetchOptions = async () => {
    try {
      const [modRes, planRes] = await Promise.all([
        SubscriptionModulesApi.getModules({ pageSize: 100 }),
        PlansApi.getPlans({ pageSize: 100 })
      ]);
      setModules(modRes.items || []);
      setPlans(planRes.items || []);
    } catch (e) {
      console.error('Failed to load filter options', e);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await couponsApi.getMetrics();
      if (response.success) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch coupon metrics', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponsApi.getCoupons({
        page,
        pageSize,
        search,
        discountType: discountType !== 'ALL' ? discountType : undefined,
        status: status !== 'ALL' ? status : undefined,
        moduleId: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        planId: planFilter !== 'ALL' ? planFilter : undefined
      });
      if (response.success) {
        setCoupons(response.data.coupons || []);
        setTotalCount(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
        
        // If this is the initial load with no filters and total is 0
        if (!search && discountType === 'ALL' && status === 'ALL' && moduleFilter === 'ALL' && planFilter === 'ALL' && (response.data.total === 0)) {
           setIsTotallyEmpty(true);
        } else {
           setIsTotallyEmpty(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch coupons', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDiscountType('ALL');
    setStatus('ALL');
    setModuleFilter('ALL');
    setPlanFilter('ALL');
    setPage(1);
  };

  const openCouponDrawer = async (coupon: any) => {
    setSelectedCoupon(coupon);
    setDrawerOpen(true);
    // Fetch full details including history
    try {
      const res = await couponsApi.getCouponById(coupon.id);
      if (res.success) {
        setSelectedCoupon(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 relative">
        <PageHeader
          title="Coupons"
          subtitle="Create and manage discount coupons for student subscriptions."
          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/coupons' },
            { label: 'Coupons' }
          ]}
          actions={
            <div className="flex gap-3">
              <Button variant="outline" leftIcon={<Download size={18} />}>
                Export
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => navigate('/subscriptions/coupons/add')}
              >
                Add Coupon
              </Button>
            </div>
          }
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Coupons"
            value={metrics.totalCoupons?.value?.toLocaleString('en-IN') || '0'}
            icon={<Ticket size={24} color="#64748B" />}
            trend={{ value: metrics.totalCoupons?.trend || 0, isPositive: (metrics.totalCoupons?.trend || 0) >= 0 }}
          />
          <MetricCard
            title="Active Coupons"
            value={metrics.activeCoupons?.value?.toLocaleString('en-IN') || '0'}
            icon={<CheckCircle2 size={24} color="#64748B" />}
            trend={{ value: metrics.activeCoupons?.trend || 0, isPositive: (metrics.activeCoupons?.trend || 0) >= 0 }}
          />
          <MetricCard
            title="Expired Coupons"
            value={metrics.expiredCoupons?.value?.toLocaleString('en-IN') || '0'}
            icon={<XCircle size={24} color="#64748B" />}
            trend={{ value: metrics.expiredCoupons?.trend || 0, isPositive: (metrics.expiredCoupons?.trend || 0) >= 0 }}
          />
          <MetricCard
            title="Total Redemptions"
            value={metrics.totalRedemptions?.value?.toLocaleString('en-IN') || '0'}
            icon={<TrendingUp size={24} color="#64748B" />}
            trend={{ value: metrics.totalRedemptions?.trend || 0, isPositive: (metrics.totalRedemptions?.trend || 0) >= 0 }}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <div className="w-64">
                <SearchInput
                  placeholder="Search code, name, description..."
                  value={search}
                  onChange={setSearch}
                />
              </div>
              <div className="w-40">
                <Select
                  value={discountType}
                  onChange={(val) => setDiscountType(val)}
                  options={[
                    { value: 'ALL', label: 'All Discounts' },
                    { value: 'PERCENTAGE', label: 'Percentage' },
                    { value: 'FIXED_AMOUNT', label: 'Flat Amount' }
                  ]}
                  placeholder="Discount Type"
                />
              </div>
              <div className="w-40">
                <Select
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={[
                    { value: 'ALL', label: 'All Status' },
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'SCHEDULED', label: 'Scheduled' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    { value: 'EXPIRED', label: 'Expired' }
                  ]}
                  placeholder="Status"
                />
              </div>
              <div className="w-44">
                <Select
                  value={moduleFilter}
                  onChange={setModuleFilter}
                  options={[{ value: 'ALL', label: 'All Modules' }, ...modules.map(m => ({ value: m.id, label: m.name }))]}
                  placeholder="Module"
                />
              </div>
              <div className="w-44">
                <Select
                  value={planFilter}
                  onChange={setPlanFilter}
                  options={[{ value: 'ALL', label: 'All Plans' }, ...plans.map(p => ({ value: p.id, label: p.name }))]}
                  placeholder="Plan"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : isTotallyEmpty ? (
            <div className="py-20">
              <EmptyState
                title="No coupons found"
                description="Create a discount coupon to manage offers for subscription plans."
                icon={<Ticket size={32} color="#94A3B8" />}
                actionLabel="Add Coupon"
                onAction={() => navigate('/subscriptions/coupons/add')}
              />
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-20">
              <EmptyState
                title="No coupons match your filters"
                description="Try adjusting your search or filters."
                icon={<Ticket size={32} color="#94A3B8" />}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="w-12"><input type="checkbox" className="rounded border-slate-300" /></Table.Head>
                      <Table.Head>Code</Table.Head>
                      <Table.Head>Coupon Name</Table.Head>
                      <Table.Head>Discount</Table.Head>
                      <Table.Head>Applicable Plans / Modules</Table.Head>
                      <Table.Head>Usage</Table.Head>
                      <Table.Head>Validity Period</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head className="text-right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {coupons.map((coupon) => {
                      const st = STATUS_CONFIG[coupon.status] || { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', label: coupon.status };
                      const isPercentage = coupon.discountType === 'PERCENTAGE';
                      const valueText = isPercentage ? \`\${coupon.discountValue}%\` : \`₹\${Number(coupon.discountValue).toLocaleString('en-IN')}\`;
                      
                      // Applicability
                      let applicabilityText = "Selected Plans";
                      let plansCount = coupon.applicablePlans?.length || 0;
                      if (coupon.applicableModules?.length > 0 && plansCount === 0) {
                        applicabilityText = "All Plans in Module";
                      } else if (plansCount > 0) {
                        applicabilityText = "Selected Plans";
                      }

                      // Usage
                      const used = coupon.usedCount || 0;
                      const max = coupon.usageType === 'UNLIMITED' ? null : (coupon.maximumUsage || 0);
                      const usagePercent = max ? Math.min(100, Math.round((used / max) * 100)) : 0;

                      return (
                        <Table.Row key={coupon.id}>
                          <Table.Cell>
                            <input type="checkbox" className="rounded border-slate-300" />
                          </Table.Cell>
                          <Table.Cell>
                            <button onClick={() => openCouponDrawer(coupon)} className="font-mono font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                              {coupon.code}
                            </button>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="font-medium text-slate-900">{coupon.name}</div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{valueText}</span>
                              <span className="text-xs text-slate-500">{isPercentage ? 'Percentage' : 'Flat Amount'}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                             <div className="flex flex-col">
                               <span className="text-sm font-medium text-slate-700">{applicabilityText}</span>
                               {plansCount > 0 && <span className="text-xs text-slate-500">{plansCount} Plans</span>}
                             </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col w-32 gap-1 mt-1">
                              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                                {used} / {max ? max : 'Unlimited'}
                              </span>
                              {max ? (
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: \`\${usagePercent}%\` }}></div>
                                </div>
                              ) : (
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                              )}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="text-xs text-slate-600">
                              <div className="font-medium text-slate-900">{new Date(coupon.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div>{new Date(coupon.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: st.bg, color: st.color, border: \`1px solid \${st.border}\` }}
                            >
                              {st.label}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={() => openCouponDrawer(coupon)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">View</button>
                               <DropdownMenu
                                  trigger={
                                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                                      <MoreVertical size={16} />
                                    </button>
                                  }
                                  items={[
                                    { label: 'View Details', icon: <Eye size={14} />, onClick: () => openCouponDrawer(coupon) },
                                    { label: 'Edit Coupon', icon: <Edit2 size={14} />, onClick: () => {} },
                                    { label: 'Duplicate Coupon', icon: <Copy size={14} />, onClick: () => {} },
                                    { label: 'View Redemptions', icon: <TrendingUp size={14} />, onClick: () => {} },
                                    { type: 'divider' },
                                    { label: 'Deactivate', icon: <Trash2 size={14} />, onClick: () => {}, danger: true },
                                  ]}
                                />
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
              {totalCount > 0 && (
                <div className="mt-4 pb-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p: number) => setPage(p)}
                  />
                  <div className="text-center mt-2 text-sm text-slate-500">
                     Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} coupons
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DRAWER COMPONENT */}
      {drawerOpen && selectedCoupon && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 z-40 transition-opacity" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-xl z-50 flex flex-col transform transition-transform border-l border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                   <Tag size={20} />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedCoupon.code}</h2>
                   <p className="text-sm font-medium text-slate-500">{selectedCoupon.name}</p>
                 </div>
               </div>
               <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               
               {/* Basic Information */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Basic Information</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Status</p>
                     <div
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                           backgroundColor: STATUS_CONFIG[selectedCoupon.status]?.bg,
                           color: STATUS_CONFIG[selectedCoupon.status]?.color,
                           border: \`1px solid \${STATUS_CONFIG[selectedCoupon.status]?.border}\`
                        }}
                      >
                        {STATUS_CONFIG[selectedCoupon.status]?.label || selectedCoupon.status}
                      </div>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Discount</p>
                     <p className="text-sm font-medium text-slate-900">
                       {selectedCoupon.discountType === 'PERCENTAGE' ? \`\${selectedCoupon.discountValue}%\` : \`₹\${selectedCoupon.discountValue}\`}
                     </p>
                   </div>
                   {selectedCoupon.discountType === 'PERCENTAGE' && selectedCoupon.maximumDiscountAmount && (
                     <div>
                       <p className="text-xs text-slate-500 mb-1">Max Discount</p>
                       <p className="text-sm font-medium text-slate-900">₹{selectedCoupon.maximumDiscountAmount}</p>
                     </div>
                   )}
                   {selectedCoupon.minimumOrderAmount && (
                     <div>
                       <p className="text-xs text-slate-500 mb-1">Min Order</p>
                       <p className="text-sm font-medium text-slate-900">₹{selectedCoupon.minimumOrderAmount}</p>
                     </div>
                   )}
                   <div className="col-span-2">
                     <p className="text-xs text-slate-500 mb-1">Description</p>
                     <p className="text-sm text-slate-700">{selectedCoupon.description || 'No description provided.'}</p>
                   </div>
                 </div>
               </div>

               {/* Validity Period */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Validity Period</h3>
                 <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Start Date</p>
                     <p className="text-sm font-medium text-slate-900">{new Date(selectedCoupon.startDate).toLocaleDateString('en-GB')}</p>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">End Date</p>
                     <p className="text-sm font-medium text-slate-900">{new Date(selectedCoupon.endDate).toLocaleDateString('en-GB')}</p>
                   </div>
                 </div>
               </div>

               {/* Usage Limit */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Usage Limit</h3>
                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-xs text-slate-500 mb-1">Usage Type</p>
                       <p className="text-sm font-medium text-slate-900">{selectedCoupon.usageType === 'UNLIMITED' ? 'Unlimited' : 'Limited'}</p>
                     </div>
                     <div>
                       <p className="text-xs text-slate-500 mb-1">Per Student</p>
                       <p className="text-sm font-medium text-slate-900">{selectedCoupon.perUserLimit === 1 ? 'Single Use' : 'Multiple Uses'}</p>
                     </div>
                   </div>
                   
                   <div>
                     <div className="flex justify-between items-end mb-2">
                       <p className="text-xs text-slate-500">Global Usage Limit</p>
                       <p className="text-sm font-bold text-slate-900">{selectedCoupon.usedCount || 0} / {selectedCoupon.usageType === 'UNLIMITED' ? 'Unlimited' : selectedCoupon.maximumUsage}</p>
                     </div>
                     {selectedCoupon.usageType !== 'UNLIMITED' && (
                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full" style={{ width: \`\${Math.min(100, ((selectedCoupon.usedCount||0) / selectedCoupon.maximumUsage) * 100)}%\` }}></div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               {/* Applicability */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Applicable Plans / Modules</h3>
                 <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                   {(!selectedCoupon.applicableModules?.length && !selectedCoupon.applicablePlans?.length) ? (
                     <p className="text-sm text-slate-500">Applies to all plans</p>
                   ) : (
                     <>
                       {selectedCoupon.applicableModules?.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {selectedCoupon.applicableModules.map((m: any, i: number) => (
                             <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded border border-indigo-100">{m.module?.name || m.moduleId}</span>
                           ))}
                         </div>
                       )}
                       {selectedCoupon.applicablePlans?.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {selectedCoupon.applicablePlans.map((p: any, i: number) => (
                             <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded border border-slate-200">{p.plan?.name || p.planId}</span>
                           ))}
                         </div>
                       )}
                     </>
                   )}
                 </div>
               </div>

               {/* Recent Redemption History */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Redemption History</h3>
                   <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">View All</button>
                 </div>
                 {selectedCoupon.redemptions && selectedCoupon.redemptions.length > 0 ? (
                   <div className="space-y-3">
                     {selectedCoupon.redemptions.slice(0,3).map((r: any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                         <div>
                           <p className="text-sm font-medium text-slate-900">{r.student?.user?.fullName || 'Unknown Student'}</p>
                           <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('en-GB')}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-sm font-bold text-emerald-600">-₹{r.discountAmount}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                     <p className="text-sm text-slate-500">No redemptions yet.</p>
                   </div>
                 )}
               </div>
               
            </div>

            {/* Sticky Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
              <Button variant="outline" className="flex-1">Edit Coupon</Button>
              <Button variant="outline" className="flex-1">Duplicate</Button>
              <Button variant="primary" className="flex-1">Deactivate</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
`;

fs.writeFileSync('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', code);
console.log('Successfully wrote CouponsPage.tsx');
