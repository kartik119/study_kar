import React, { useState, useEffect } from 'react';
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
  LoadingSpinner,
  EmptyState,
} from '@study-karnataka/ui';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  Filter,
  MoreVertical,
  X,
  User,
  Copy,
  Layers,
  CreditCard,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { RefundsApi, Refund, RefundMetrics } from '../../api/refunds.api';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  REFUNDED: { label: 'Refunded', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  APPROVED: { label: 'Approved', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  PROCESSING: { label: 'Processing', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A' },
  REJECTED: { label: 'Rejected', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  FAILED: { label: 'Failed', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
];

const METHOD_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Card', label: 'Card' },
  { value: 'Net Banking', label: 'Net Banking' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'Manual', label: 'Manual' },
];

export const RefundsPage: React.FC = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<RefundMetrics>({
    totalRequests: { value: 0, trend: 0 },
    approvedRefunds: { value: 0, trend: 0 },
    pendingRefunds: { value: 0, trend: 0 },
    totalRefundedAmount: { value: 0, trend: 0 },
  });
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Action Modals State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeActionRefund, setActiveActionRefund] = useState<Refund | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Empty state tracking
  const [isTotallyEmpty, setIsTotallyEmpty] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await RefundsApi.getMetrics();
      if (data) setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch refund metrics', err);
    }
  };

  const fetchRefunds = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await RefundsApi.getRefunds({
        page,
        pageSize,
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentMethod: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
      });

      setRefunds(result.refunds || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.total || 0);

      if (!search && statusFilter === 'ALL' && methodFilter === 'ALL' && !startDate && !endDate && result.total === 0) {
        setIsTotallyEmpty(true);
      } else {
        setIsTotallyEmpty(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch refunds', err);
      setError(err.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [page, pageSize, statusFilter, methodFilter]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchRefunds();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await RefundsApi.exportRefunds({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentMethod: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `refunds-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export refunds');
    } finally {
      setExporting(false);
    }
  };

  const openRefundDrawer = async (ref: Refund) => {
    setSelectedRefund(ref);
    setDrawerOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await RefundsApi.getRefundById(ref.id);
      if (detailed) setSelectedRefund(detailed);
    } catch (e) {
      console.error('Failed to fetch full refund details', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!activeActionRefund) return;
    setActionLoading(true);
    try {
      await RefundsApi.approveRefund(activeActionRefund.id);
      setApproveModalOpen(false);
      setActiveActionRefund(null);
      await fetchMetrics();
      await fetchRefunds();
      if (selectedRefund && selectedRefund.id === activeActionRefund.id) {
        openRefundDrawer(activeActionRefund);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeActionRefund || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await RefundsApi.rejectRefund(activeActionRefund.id, rejectionReason.trim());
      setRejectModalOpen(false);
      setActiveActionRefund(null);
      setRejectionReason('');
      await fetchMetrics();
      await fetchRefunds();
      if (selectedRefund && selectedRefund.id === activeActionRefund.id) {
        openRefundDrawer(activeActionRefund);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (ref: Refund) => {
    setActionLoading(true);
    try {
      await RefundsApi.processRefund(ref.id);
      await fetchMetrics();
      await fetchRefunds();
      if (selectedRefund && selectedRefund.id === ref.id) {
        openRefundDrawer(ref);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(refunds.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 relative">
        {/* Page Header */}
        <PageHeader
          title="Refunds"

          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/refunds' },
            { label: 'Refunds' },
          ]}
          actions={
            <div className="flex gap-3">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
                onClick={handleExport}
                isLoading={exporting}
              >
                Export
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Filter size={18} />}
                onClick={handleApplyFilters}
              >
                Filter
              </Button>
            </div>
          }
        />

        {/* 4 KPI Cards in one horizontal row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Refund Requests"
            value={metrics.totalRequests.value.toLocaleString('en-IN')}
            icon={<RotateCcw size={24} color="#64748B" />}
            trend={{ value: metrics.totalRequests.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Approved Refunds"
            value={metrics.approvedRefunds.value.toLocaleString('en-IN')}
            icon={<CheckCircle2 size={24} color="#16A34A" />}
            trend={{ value: metrics.approvedRefunds.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Pending Refunds"
            value={metrics.pendingRefunds.value.toLocaleString('en-IN')}
            icon={<Clock size={24} color="#CA8A04" />}
            trend={{ value: metrics.pendingRefunds.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Total Refunded Amount"
            value={`₹${metrics.totalRefundedAmount.value.toLocaleString('en-IN')}`}
            icon={<CreditCard size={24} color="#2563EB" />}
            trend={{ value: metrics.totalRefundedAmount.trend || 0, isPositive: true }}
          />
        </div>

        {/* Filter Area Below KPI Cards */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center flex-wrap">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="w-full md:w-72">
              <SearchInput
                placeholder="Search by refund ID, invoice, transaction, student..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>

            <div className="w-40">
              <Select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target ? e.target.value : e)}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>

            <div className="w-40">
              <Select
                value={methodFilter}
                onChange={(e: any) => setMethodFilter(e.target ? e.target.value : e)}
                options={METHOD_FILTER_OPTIONS}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 outline-none focus:border-blue-500"
                placeholder="Start Date"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 outline-none focus:border-blue-500"
                placeholder="End Date"
                title="End Date"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button variant="primary" size="sm" onClick={handleApplyFilters}>
              Apply
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Table / Empty State Area */}
        {loading ? (
          <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-slate-200">
            <LoadingSpinner size="lg" />
          </div>
        ) : isTotallyEmpty ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState
              icon={<RotateCcw size={48} className="text-slate-400" />}
              title="No refunds found"
              description="Refund requests and processed refunds will appear here."
            />
          </div>
        ) : refunds.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState
              icon={<RotateCcw size={48} className="text-slate-400" />}
              title="No refunds match your filters"
              description="Try adjusting your search or filters."
              actionLabel="Clear Filters"
              onAction={handleResetFilters}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === refunds.length && refunds.length > 0}
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Refund ID</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Student</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Invoice / Transaction</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Plan / Module</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Refund Amount</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Refund Method</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Refund Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Requested On</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {refunds.map(ref => {
                    const statusObj = STATUS_CONFIG[ref.status] || STATUS_CONFIG.PENDING;
                    const studentName = ref.student?.user?.fullName || 'Student';
                    const studentEmail = ref.student?.user?.email || '—';
                    const invNumber = ref.invoice?.invoiceNumber;
                    const txnNumber = ref.transaction?.transactionNumber;
                    const planName = ref.subscription?.plan?.name || 'Subscription Plan';
                    const moduleName = ref.subscription?.plan?.module?.name || 'Academic Module';
                    const currentAmt = ref.approvedAmount ?? ref.requestedAmount;

                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(ref.id)}
                            onChange={e => handleSelectRow(ref.id, e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Refund ID Column */}
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => openRefundDrawer(ref)}
                              className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold text-xs"
                            >
                              {ref.refundNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(ref.refundNumber, `ref-${ref.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                              title="Copy refund ID"
                            >
                              <Copy size={13} />
                            </button>
                            {copiedKey === `ref-${ref.id}` && (
                              <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                            )}
                          </div>
                        </td>

                        {/* Student Column */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{studentName}</div>
                          <div className="text-xs text-slate-500">{studentEmail}</div>
                        </td>

                        {/* Invoice / Transaction Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {invNumber ? (
                            <div className="font-mono text-xs font-semibold text-slate-700">
                              {invNumber}
                            </div>
                          ) : null}
                          <div className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                            {txnNumber || '—'}
                          </div>
                        </td>

                        {/* Plan / Module Column */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{planName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                            {moduleName}
                          </div>
                        </td>

                        {/* Refund Amount Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            ₹{currentAmt?.toLocaleString('en-IN') || '0'}
                          </div>
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">
                            {ref.currency || 'INR'}
                          </div>
                        </td>

                        {/* Refund Method Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {ref.paymentMethod || 'UPI'}
                          </span>
                        </td>

                        {/* Refund Status Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: statusObj.bg,
                              color: statusObj.color,
                              border: `1px solid ${statusObj.border}`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: statusObj.color }}
                            />
                            {statusObj.label}
                          </span>
                        </td>

                        {/* Requested On Column */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-xs">
                          <div>{formatDateOnly(ref.requestedAt)}</div>
                          <div className="text-slate-400 text-[11px]">
                            {ref.requestedAt ? format(new Date(ref.requestedAt), 'hh:mm a') : ''}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRefundDrawer(ref)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>

                            <DropdownMenu
                              trigger={
                                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                  <MoreVertical size={16} />
                                </button>
                              }
                              items={[
                                {
                                  label: 'View Details',
                                  icon: <Eye size={14} />,
                                  onClick: () => openRefundDrawer(ref),
                                },
                                ...(ref.status === 'PENDING'
                                  ? [
                                      {
                                        label: 'Approve Refund',
                                        icon: <CheckCircle2 size={14} />,
                                        onClick: () => {
                                          setActiveActionRefund(ref);
                                          setApproveModalOpen(true);
                                        },
                                      },
                                      {
                                        label: 'Reject Refund',
                                        icon: <XCircle size={14} />,
                                        danger: true,
                                        onClick: () => {
                                          setActiveActionRefund(ref);
                                          setRejectModalOpen(true);
                                        },
                                      },
                                    ]
                                  : []),
                                ...(ref.status === 'APPROVED'
                                  ? [
                                      {
                                        label: 'Process Refund',
                                        icon: <RotateCcw size={14} />,
                                        onClick: () => handleProcessRefund(ref),
                                      },
                                    ]
                                  : []),
                                ...(ref.invoiceId
                                  ? [
                                      {
                                        label: 'View Invoice',
                                        icon: <FileText size={14} />,
                                        onClick: () => navigate('/subscriptions/invoices'),
                                      },
                                    ]
                                  : []),
                                {
                                  label: 'View Transaction',
                                  icon: <CreditCard size={14} />,
                                  onClick: () => navigate('/subscriptions/transactions'),
                                },
                                ...(ref.subscriptionId
                                  ? [
                                      {
                                        label: 'View Subscription',
                                        icon: <Layers size={14} />,
                                        onClick: () => navigate('/subscriptions/student-subscriptions'),
                                      },
                                    ]
                                  : []),
                                {
                                  label: 'Copy Refund ID',
                                  icon: <Copy size={14} />,
                                  onClick: () => copyToClipboard(ref.refundNumber, `menu-${ref.id}`),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {/* Pagination (Section 58) */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-slate-500">
                Showing {refunds.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, totalCount)} of {totalCount} refunds
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="p-1 border border-slate-300 rounded text-xs bg-white text-slate-700 outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT-SIDE REFUND DETAILS DRAWER (~28-32% desktop width)                   */}
      {/* ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Modal Window */}
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header & Student Summary */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <RotateCcw size={16} />
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Refund Details</h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Header Summary */}
              {selectedRefund && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                      {(selectedRefund.student?.user?.fullName || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate text-sm">
                        {selectedRefund.student?.user?.fullName || 'Student'}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {selectedRefund.student?.user?.email || '—'}
                      </div>
                      {selectedRefund.student?.user?.mobile && (
                        <div className="text-[11px] text-slate-400">
                          {selectedRefund.student.user.mobile}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/students?id=${selectedRefund.studentId}`)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                    title="View Student"
                  >
                    <User size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
              {loadingDetails && (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              {selectedRefund && (
                <>
                  {/* 1. Refund Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Refund Information
                    </h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Refund ID</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-800">
                            {selectedRefund.refundNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(selectedRefund.refundNumber, 'd-ref')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          >
                            <Copy size={12} />
                          </button>
                          {copiedKey === 'd-ref' && (
                            <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Refund Status</span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: (STATUS_CONFIG[selectedRefund.status] || STATUS_CONFIG.PENDING).bg,
                            color: (STATUS_CONFIG[selectedRefund.status] || STATUS_CONFIG.PENDING).color,
                            border: `1px solid ${(STATUS_CONFIG[selectedRefund.status] || STATUS_CONFIG.PENDING).border}`,
                          }}
                        >
                          {selectedRefund.status}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Refund Amount</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{(selectedRefund.approvedAmount ?? selectedRefund.requestedAmount)?.toLocaleString('en-IN')}{' '}
                          {selectedRefund.currency}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Refund Type</span>
                        <span className="font-medium text-slate-800">
                          {selectedRefund.refundType === 'FULL' ? 'Full Refund' : 'Partial Refund'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Refund Method</span>
                        <span className="font-medium text-slate-800">
                          {selectedRefund.paymentMethod || 'UPI'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Requested Date</span>
                        <span className="font-medium text-slate-800">
                          {formatDateTime(selectedRefund.requestedAt)}
                        </span>
                      </div>

                      {selectedRefund.processedAt && (
                        <div className="flex justify-between py-2">
                          <span className="text-slate-500">Processed Date</span>
                          <span className="font-medium text-slate-800">
                            {formatDateTime(selectedRefund.processedAt)}
                          </span>
                        </div>
                      )}

                      {selectedRefund.gatewayRefundId && (
                        <div className="flex justify-between py-2 items-center">
                          <span className="text-slate-500">Gateway Refund ID</span>
                          <span className="font-mono text-slate-700">
                            {selectedRefund.gatewayRefundId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Refund Reason Card */}
                    <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-semibold uppercase mb-1">
                        Reason for Refund
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed m-0">
                        {selectedRefund.reason || 'No reason provided.'}
                      </p>
                    </div>

                    {/* Rejection Reason Card if rejected */}
                    {selectedRefund.status === 'REJECTED' && selectedRefund.rejectionReason && (
                      <div className="mt-3 p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-800 mb-1">
                          <AlertTriangle size={14} />
                          <span>Rejection Reason</span>
                        </div>
                        <p className="text-red-700 m-0 leading-relaxed">
                          {selectedRefund.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. Payment Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Payment Information
                    </h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Transaction ID</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-800">
                            {selectedRefund.transaction?.transactionNumber || selectedRefund.transactionId}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                selectedRefund.transaction?.transactionNumber || selectedRefund.transactionId,
                                'd-txn'
                              )
                            }
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Invoice Number</span>
                        <span className="font-mono text-slate-800 font-medium">
                          {selectedRefund.invoice?.invoiceNumber || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Original Paid Amount</span>
                        <span className="font-bold text-slate-800">
                          ₹{selectedRefund.originalAmount?.toLocaleString('en-IN')}.00
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Payment Method</span>
                        <span className="font-medium text-slate-800">
                          {selectedRefund.paymentMethod || 'UPI'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Paid Date</span>
                        <span className="font-medium text-slate-800">
                          {formatDateTime(selectedRefund.transaction?.paidAt || selectedRefund.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Subscription Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Subscription Information
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200/70 text-xs">
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Subscription ID</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedRefund.subscription?.subscriptionNumber ||
                            selectedRefund.subscriptionId ||
                            '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Plan</span>
                        <span className="font-bold text-slate-800">
                          {selectedRefund.subscription?.plan?.name || '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Module</span>
                        <span className="font-medium text-slate-800">
                          {selectedRefund.subscription?.plan?.module?.name || '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Exam</span>
                        <span className="font-medium text-slate-800">
                          {selectedRefund.subscription?.plan?.module?.exam?.titleEn || 'State Exam'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Subscription Status</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selectedRefund.subscription?.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Drawer Bottom Actions */}
            {selectedRefund && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col gap-2">
                {selectedRefund.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700"
                      leftIcon={<CheckCircle2 size={16} />}
                      onClick={() => {
                        setActiveActionRefund(selectedRefund);
                        setApproveModalOpen(true);
                      }}
                    >
                      Approve Refund
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 justify-center text-red-600 border-red-200 hover:bg-red-50"
                      leftIcon={<XCircle size={16} />}
                      onClick={() => {
                        setActiveActionRefund(selectedRefund);
                        setRejectModalOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {selectedRefund.status === 'APPROVED' && (
                  <Button
                    variant="primary"
                    className="w-full justify-center"
                    leftIcon={<RotateCcw size={16} />}
                    onClick={() => handleProcessRefund(selectedRefund)}
                    isLoading={actionLoading}
                  >
                    Process Refund
                  </Button>
                )}

                <div className="flex gap-2">
                  {selectedRefund.invoiceId && (
                    <Button
                      variant="outline"
                      className="flex-1 justify-center"
                      leftIcon={<FileText size={14} />}
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate('/subscriptions/invoices');
                      }}
                    >
                      View Invoice
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 justify-center"
                    leftIcon={<CreditCard size={14} />}
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate('/subscriptions/transactions');
                    }}
                  >
                    View Transaction
                  </Button>
                  {selectedRefund.subscriptionId && (
                    <Button
                      variant="outline"
                      className="flex-1 justify-center"
                      leftIcon={<Layers size={14} />}
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate('/subscriptions/student-subscriptions');
                      }}
                    >
                      Subscription
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPROVE CONFIRMATION MODAL                                                */}
      {/* ========================================================================= */}
      {approveModalOpen && activeActionRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => !actionLoading && setApproveModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Refund</h3>
                <p className="text-xs text-slate-500">
                  Please review the refund details before confirming approval.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-semibold text-slate-800">
                  {activeActionRefund.student?.user?.fullName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono text-slate-700">
                  {activeActionRefund.transaction?.transactionNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Paid:</span>
                <span className="font-semibold text-slate-800">
                  ₹{activeActionRefund.originalAmount?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Refund:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  ₹{activeActionRefund.requestedAmount?.toLocaleString('en-IN')} ({activeActionRefund.refundType})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Refund Method:</span>
                <span className="font-medium text-slate-800">
                  {activeActionRefund.paymentMethod || 'UPI'}
                </span>
              </div>
              {activeActionRefund.reason && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Reason:</span>
                  <span className="text-slate-700 italic">"{activeActionRefund.reason}"</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setApproveModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmApprove}
                isLoading={actionLoading}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECT REFUND MODAL                                                       */}
      {/* ========================================================================= */}
      {rejectModalOpen && activeActionRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => !actionLoading && setRejectModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Refund Request</h3>
                <p className="text-xs text-slate-500">
                  Rejection requires a documented reason for administrative records.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="State the reason for rejecting this refund request..."
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                isLoading={actionLoading}
              >
                Reject Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
