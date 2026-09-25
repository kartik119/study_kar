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
  FileText,
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
  RotateCcw,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { InvoicesApi, Invoice, InvoiceMetrics } from '../../api/invoices.api';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string; icon: any }
> = {
  PAID: { label: 'Paid', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: CheckCircle2 },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A', icon: Clock },
  FAILED: { label: 'Failed', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: XCircle },
  CANCELLED: { label: 'Cancelled', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: XCircle },
  REFUNDED: { label: 'Refunded', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: CheckCircle2 },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF', icon: CheckCircle2 },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
];

const METHOD_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Card', label: 'Card' },
  { value: 'Net Banking', label: 'Net Banking' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'Manual', label: 'Manual' },
];

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<InvoiceMetrics>({
    totalInvoices: { value: 0, trend: 0 },
    paidInvoices: { value: 0, trend: 0 },
    pendingInvoices: { value: 0, trend: 0 },
    failedCancelledInvoices: { value: 0, trend: 0 },
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Empty state tracking
  const [isTotallyEmpty, setIsTotallyEmpty] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await InvoicesApi.getMetrics();
      if (data) setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch invoice metrics', err);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await InvoicesApi.getInvoices({
        page,
        pageSize,
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentMethod: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
      });

      setInvoices(result.invoices || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.total || 0);

      if (!search && statusFilter === 'ALL' && methodFilter === 'ALL' && !startDate && !endDate && result.total === 0) {
        setIsTotallyEmpty(true);
      } else {
        setIsTotallyEmpty(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch invoices', err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, statusFilter, methodFilter]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchInvoices();
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
      const blob = await InvoicesApi.exportInvoices({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentMethod: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export invoices');
    } finally {
      setExporting(false);
    }
  };

  const openInvoiceDrawer = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setDrawerOpen(true);
    setLoadingDetails(true);
    try {
      const detailed = await InvoicesApi.getInvoiceById(inv.id);
      if (detailed) setSelectedInvoice(detailed);
    } catch (e) {
      console.error('Failed to fetch full invoice details', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadPdf = async (inv: Invoice) => {
    try {
      setDownloadingId(inv.id);
      await InvoicesApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
    } catch (err) {
      console.error('Failed to download invoice PDF', err);
      alert('Failed to download invoice PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRegeneratePdf = async (inv: Invoice) => {
    try {
      setRegeneratingId(inv.id);
      const res = await InvoicesApi.regenerateInvoicePdf(inv.id);
      if (res.success) {
        alert('Invoice PDF regenerated successfully!');
      }
    } catch (err) {
      console.error('Failed to regenerate invoice PDF', err);
      alert('Failed to regenerate PDF');
    } finally {
      setRegeneratingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(invoices.map(i => i.id));
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

  // Helper to format date
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string) => {
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
          title="Invoices"

          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/invoices' },
            { label: 'Invoices' },
          ]}
          actions={
            <div className="flex gap-3">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
                onClick={handleExport}
                loading={exporting}
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

        {/* KPI Cards (4 in horizontal row) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Invoices"
            value={metrics.totalInvoices.value.toLocaleString('en-IN')}
            icon={<FileText size={24} color="#64748B" />}
            trend={{ value: metrics.totalInvoices.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Paid Invoices"
            value={metrics.paidInvoices.value.toLocaleString('en-IN')}
            icon={<CheckCircle2 size={24} color="#16A34A" />}
            trend={{ value: metrics.paidInvoices.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Pending Invoices"
            value={metrics.pendingInvoices.value.toLocaleString('en-IN')}
            icon={<Clock size={24} color="#CA8A04" />}
            trend={{ value: metrics.pendingInvoices.trend || 0, isPositive: true }}
          />
          <MetricCard
            title="Failed / Cancelled"
            value={metrics.failedCancelledInvoices.value.toLocaleString('en-IN')}
            icon={<XCircle size={24} color="#DC2626" />}
            trend={{ value: metrics.failedCancelledInvoices.trend || 0, isPositive: false }}
          />
        </div>

        {/* Filter Area Below KPI Cards */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center flex-wrap">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="w-full md:w-72">
              <SearchInput
                placeholder="Search invoice, student, plan, txn..."
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
              icon={<FileText size={48} className="text-slate-400" />}
              title="No invoices found"
              description="Invoices will appear here when student subscription payments are completed."
            />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState
              icon={<FileText size={48} className="text-slate-400" />}
              title="No invoices match your filters"
              description="Try adjusting your search or filters."
              action={
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
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
                        checked={selectedIds.length === invoices.length && invoices.length > 0}
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Invoice Number</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Student</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Plan / Module</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Amount</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Payment Method</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Invoice Date</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {invoices.map(inv => {
                    const statusObj = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PAID;
                    const studentName = inv.studentNameSnapshot || inv.student?.user?.fullName || 'Student';
                    const studentEmail = inv.studentEmailSnapshot || inv.student?.user?.email || '—';
                    const planName = inv.planNameSnapshot || inv.subscription?.plan?.name || 'Subscription Plan';
                    const moduleName = inv.moduleNameSnapshot || inv.subscription?.plan?.module?.name || 'General Access';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(inv.id)}
                            onChange={e => handleSelectRow(inv.id, e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Invoice Number Column */}
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => openInvoiceDrawer(inv)}
                              className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold text-xs"
                            >
                              {inv.invoiceNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(inv.invoiceNumber, `inv-${inv.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                              title="Copy invoice number"
                            >
                              <Copy size={13} />
                            </button>
                            {copiedKey === `inv-${inv.id}` && (
                              <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                            )}
                          </div>
                        </td>

                        {/* Student Column */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{studentName}</div>
                          <div className="text-xs text-slate-500">{studentEmail}</div>
                        </td>

                        {/* Plan / Module Column */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{planName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                            {moduleName}
                          </div>
                        </td>

                        {/* Amount Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            ₹{inv.finalAmount?.toLocaleString('en-IN') || '0'}
                          </div>
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">
                            {inv.currency || 'INR'}
                          </div>
                        </td>

                        {/* Payment Method Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {inv.paymentMethod || 'Online'}
                          </span>
                        </td>

                        {/* Status Column */}
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

                        {/* Invoice Date Column */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-xs">
                          <div>{formatDateOnly(inv.invoiceDate)}</div>
                          <div className="text-slate-400 text-[11px]">
                            {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'hh:mm a') : ''}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openInvoiceDrawer(inv)}
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
                                  onClick: () => openInvoiceDrawer(inv),
                                },
                                {
                                  label: downloadingId === inv.id ? 'Downloading...' : 'Download Invoice',
                                  icon: <Download size={14} />,
                                  onClick: () => handleDownloadPdf(inv),
                                },
                                ...(inv.studentId
                                  ? [
                                      {
                                        label: 'View Student',
                                        icon: <User size={14} />,
                                        onClick: () => navigate(`/students?id=${inv.studentId}`),
                                      },
                                    ]
                                  : []),
                                ...(inv.subscriptionId
                                  ? [
                                      {
                                        label: 'View Subscription',
                                        icon: <Layers size={14} />,
                                        onClick: () => navigate(`/subscriptions/student-subscriptions`),
                                      },
                                    ]
                                  : []),
                                ...(inv.transactionId
                                  ? [
                                      {
                                        label: 'View Transaction',
                                        icon: <RotateCcw size={14} />,
                                        onClick: () => navigate(`/subscriptions/transactions`),
                                      },
                                    ]
                                  : []),
                                {
                                  label: regeneratingId === inv.id ? 'Regenerating...' : 'Regenerate PDF',
                                  icon: <Sparkles size={14} />,
                                  onClick: () => handleRegeneratePdf(inv),
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

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT-SIDE INVOICE DETAILS DRAWER                                         */}
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
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Invoice Details</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-slate-600">
                      {selectedInvoice?.invoiceNumber}
                    </span>
                    {selectedInvoice && (
                      <span
                        className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: (STATUS_CONFIG[selectedInvoice.status] || STATUS_CONFIG.PAID).bg,
                          color: (STATUS_CONFIG[selectedInvoice.status] || STATUS_CONFIG.PAID).color,
                          border: `1px solid ${(STATUS_CONFIG[selectedInvoice.status] || STATUS_CONFIG.PAID).border}`,
                        }}
                      >
                        {selectedInvoice.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
              {loadingDetails && (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              {selectedInvoice && (
                <>
                  {/* 1. Student Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Student Information
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {(selectedInvoice.studentNameSnapshot || selectedInvoice.student?.user?.fullName || 'S')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {selectedInvoice.studentNameSnapshot || selectedInvoice.student?.user?.fullName || 'Student'}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {selectedInvoice.studentEmailSnapshot || selectedInvoice.student?.user?.email || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Phone</span>
                          <span className="font-medium text-slate-700">
                            {selectedInvoice.studentPhoneSnapshot || selectedInvoice.student?.user?.mobile || '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/students?id=${selectedInvoice.studentId}`)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                          >
                            <span>View Student</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Invoice Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Invoice Information
                    </h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Invoice Number</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-800">
                            {selectedInvoice.invoiceNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(selectedInvoice.invoiceNumber, 'drawer-inv')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            title="Copy"
                          >
                            <Copy size={12} />
                          </button>
                          {copiedKey === 'drawer-inv' && (
                            <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Invoice Date</span>
                        <span className="font-medium text-slate-800">
                          {formatDateTime(selectedInvoice.invoiceDate)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Payment Status</span>
                        <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          {selectedInvoice.status}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Payment Method</span>
                        <span className="font-medium text-slate-800">
                          {selectedInvoice.paymentMethod || 'Online'}
                        </span>
                      </div>

                      {/* Transaction ID */}
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Transaction ID</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700 truncate max-w-[150px]">
                            {selectedInvoice.transaction?.transactionNumber || selectedInvoice.transactionId || '—'}
                          </span>
                          {selectedInvoice.transaction?.transactionNumber && (
                            <button
                              onClick={() =>
                                copyToClipboard(selectedInvoice.transaction!.transactionNumber, 'drawer-txn')
                              }
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                              title="Copy"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                          {copiedKey === 'drawer-txn' && (
                            <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                          )}
                        </div>
                      </div>

                      {/* Gateway Order ID */}
                      {selectedInvoice.gatewayOrderId && (
                        <div className="flex justify-between py-2 items-center">
                          <span className="text-slate-500">Gateway Order ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-700 truncate max-w-[150px]">
                              {selectedInvoice.gatewayOrderId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(selectedInvoice.gatewayOrderId!, 'drawer-order')}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                              <Copy size={12} />
                            </button>
                            {copiedKey === 'drawer-order' && (
                              <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Gateway Payment ID */}
                      {selectedInvoice.gatewayPaymentId && (
                        <div className="flex justify-between py-2 items-center">
                          <span className="text-slate-500">Gateway Payment ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-700 truncate max-w-[150px]">
                              {selectedInvoice.gatewayPaymentId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(selectedInvoice.gatewayPaymentId!, 'drawer-pay')}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                              <Copy size={12} />
                            </button>
                            {copiedKey === 'drawer-pay' && (
                              <span className="text-[10px] text-green-600 font-medium">Copied!</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">PDF Status</span>
                        <span className="font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Available
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
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-500">Subscription ID</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedInvoice.subscription?.subscriptionNumber ||
                            selectedInvoice.subscriptionId ||
                            '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Plan</span>
                        <span className="font-bold text-slate-800">
                          {selectedInvoice.planNameSnapshot || selectedInvoice.subscription?.plan?.name || '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Module</span>
                        <span className="font-medium text-slate-800">
                          {selectedInvoice.moduleNameSnapshot || '—'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Exam</span>
                        <span className="font-medium text-slate-800">
                          {selectedInvoice.examNameSnapshot || 'State Exam'}
                        </span>
                      </div>

                      {selectedInvoice.billingPeriodSnapshot && (
                        <div className="flex justify-between py-2">
                          <span className="text-slate-500">Billing Period</span>
                          <span className="font-medium text-slate-700">
                            {selectedInvoice.billingPeriodSnapshot}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Subscription Status</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selectedInvoice.subscription?.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Amount Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Amount Breakdown
                    </h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Plan Amount (Subtotal)</span>
                        <span className="font-medium">
                          ₹{selectedInvoice.subtotal?.toLocaleString('en-IN') || '0'}.00
                        </span>
                      </div>

                      {/* Coupon Discount Row */}
                      {selectedInvoice.discountAmount > 0 ? (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>
                            Discount {selectedInvoice.couponCodeSnapshot && `(${selectedInvoice.couponCodeSnapshot})`}
                          </span>
                          <span>- ₹{selectedInvoice.discountAmount?.toLocaleString('en-IN')}.00</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-slate-400">
                          <span>Discount / Coupon</span>
                          <span>₹0.00</span>
                        </div>
                      )}

                      {/* Tax Breakdown */}
                      <div className="flex justify-between text-slate-600">
                        <span>Tax (GST 0%)</span>
                        <span className="font-medium">₹0.00</span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Other Charges</span>
                        <span>₹0.00</span>
                      </div>

                      {/* Final Amount */}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                        <span>Final Amount</span>
                        <span className="text-base text-blue-600">
                          ₹{selectedInvoice.finalAmount?.toLocaleString('en-IN') || '0'}.00 {selectedInvoice.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Information Details if used */}
                  {selectedInvoice.couponCodeSnapshot && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
                      <div className="font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-600" />
                        <span>Coupon Applied</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-slate-600 mt-2">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Code</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedInvoice.couponCodeSnapshot}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Type</span>
                          <span className="font-medium text-slate-800">
                            {selectedInvoice.discountTypeSnapshot || 'PERCENTAGE'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Discount</span>
                          <span className="font-bold text-emerald-600">
                            ₹{selectedInvoice.discountAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Drawer Bottom Actions */}
            {selectedInvoice && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col gap-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  leftIcon={<Download size={16} />}
                  onClick={() => handleDownloadPdf(selectedInvoice)}
                  loading={downloadingId === selectedInvoice.id}
                >
                  Download Invoice
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center"
                    leftIcon={<Layers size={14} />}
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate('/subscriptions/student-subscriptions');
                    }}
                  >
                    View Subscription
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 justify-center"
                    leftIcon={<RotateCcw size={14} />}
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate('/subscriptions/transactions');
                    }}
                  >
                    View Transaction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
