// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
  CreditCard,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Eye,
  RefreshCw,
  MoreVertical,
  X,
  User,
  Copy,
  FileText,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import {
  TransactionsApi,
  Transaction,
} from '../../api/transactions.api';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string; icon: any }
> = {
  SUCCESSFUL: { label: 'Successful', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: CheckCircle2 },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A', icon: Clock },
  PROCESSING: { label: 'Processing', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: RefreshCw },
  FAILED: { label: 'Failed', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: XCircle },
  CANCELLED: { label: 'Cancelled', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: XCircle },
  REFUNDED: { label: 'Refunded', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: CheckCircle2 },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF', icon: CheckCircle2 },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'SUCCESSFUL', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
];

const METHOD_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'WALLET', label: 'Wallet' },
  { value: 'MANUAL', label: 'Manual' },
];

export const TransactionsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Empty state logic
  const [isTotallyEmpty, setIsTotallyEmpty] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await TransactionsApi.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await TransactionsApi.getTransactions({
        page,
        pageSize,
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentSource: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined
      });
      setTransactions(result.transactions || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.total || 0);

      if (!search && statusFilter === 'ALL' && methodFilter === 'ALL' && !startDate && !endDate && (result.total === 0)) {
        setIsTotallyEmpty(true);
      } else {
        setIsTotallyEmpty(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, search, statusFilter, methodFilter, startDate, endDate]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await TransactionsApi.exportTransactions({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        paymentSource: methodFilter === 'ALL' ? undefined : methodFilter,
        startDate: startDate ? startDate : undefined,
        endDate: endDate ? endDate : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-export-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const openTransactionDrawer = async (txn: Transaction) => {
    setSelectedTransaction(txn);
    setDrawerOpen(true);
    try {
      const data = await TransactionsApi.getTransactionById(txn.id);
      setSelectedTransaction(data);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6 relative">
        <PageHeader
          title="Transactions"

          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Subscriptions & Payments', href: '/subscriptions/transactions' },
            { label: 'Transactions' },
          ]}
          actions={
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          }
        />

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Volume"
              value={`₹${(metrics.totalVolume?.value || 0).toLocaleString('en-IN')}`}
              icon={<TrendingUp size={24} color="#64748B" />}
              trend={{ value: metrics.totalVolume?.trend || 0, isPositive: (metrics.totalVolume?.trend || 0) >= 0 }}
            />
            <MetricCard
              title="Successful Txns"
              value={(metrics.successfulTxns?.value || 0).toLocaleString('en-IN')}
              icon={<CheckCircle2 size={24} color="#64748B" />}
              trend={{ value: metrics.successfulTxns?.trend || 0, isPositive: (metrics.successfulTxns?.trend || 0) >= 0 }}
            />
            <MetricCard
              title="Failed Txns"
              value={(metrics.failedTxns?.value || 0).toLocaleString('en-IN')}
              icon={<XCircle size={24} color="#64748B" />}
              trend={{ value: metrics.failedTxns?.trend || 0, isPositive: (metrics.failedTxns?.trend || 0) >= 0 }}
            />
            <MetricCard
              title="Avg. Txn Value"
              value={`₹${(metrics.avgTxnValue?.value || 0).toLocaleString('en-IN')}`}
              icon={<CreditCard size={24} color="#64748B" />}
              trend={{ value: metrics.avgTxnValue?.trend || 0, isPositive: (metrics.avgTxnValue?.trend || 0) >= 0 }}
            />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              <div className="w-72">
                <SearchInput
                  placeholder="Search Txn ID, Student, Email..."
                  value={search}
                  onChange={setSearch}
                />
              </div>
              <div className="w-40">
                <Select
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="Payment Status"
                />
              </div>
              <div className="w-40">
                <Select
                  options={METHOD_FILTER_OPTIONS}
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  placeholder="Payment Method"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 h-[38px] w-36"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 h-[38px] w-36"
                />
              </div>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="py-12 flex justify-center text-red-600">
              <p>{error}</p>
            </div>
          ) : isTotallyEmpty ? (
            <div className="py-20">
              <EmptyState
                title="No transactions found"
                description="Payments will appear here when students purchase or renew subscription plans."
                icon={<CreditCard size={32} color="#94A3B8" />}
              />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20">
              <EmptyState
                title="No transactions found"
                description="No financial transactions match your current filters."
                icon={<CreditCard size={32} color="#94A3B8" />}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="w-12"><input type="checkbox" className="rounded border-slate-300" /></Table.Head>
                      <Table.Head>Transaction ID</Table.Head>
                      <Table.Head>Student</Table.Head>
                      <Table.Head>Plan / Module</Table.Head>
                      <Table.Head>Amount</Table.Head>
                      <Table.Head>Payment Method</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head>Date & Time</Table.Head>
                      <Table.Head className="text-right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(transactions || []).map((txn) => {
                      const statusConfig = STATUS_CONFIG[txn.status] || STATUS_CONFIG.PENDING;
                      
                      let displayMethod = txn.paymentMethod || txn.paymentSource || 'Unknown';
                      if (txn.paymentProvider) {
                         displayMethod = `${displayMethod} (${txn.paymentProvider})`;
                      }

                      return (
                        <Table.Row key={txn.id}>
                          <Table.Cell>
                            <input type="checkbox" className="rounded border-slate-300" />
                          </Table.Cell>
                          <Table.Cell>
                             <div className="flex items-center gap-2">
                               <button onClick={() => openTransactionDrawer(txn)} className="font-mono text-sm font-bold text-indigo-600 hover:text-indigo-800">
                                 {txn.gatewayPaymentId || txn.transactionNumber}
                               </button>
                               <button className="text-slate-400 hover:text-slate-600" onClick={() => copyToClipboard(txn.gatewayPaymentId || txn.transactionNumber)}>
                                 <Copy size={12} />
                               </button>
                             </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">{txn.student?.user?.fullName || 'Unknown'}</span>
                              <span className="text-xs text-slate-500">{txn.student?.user?.email || txn.student?.user?.mobile}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{txn.planSnapshot?.name || txn.subscription?.plan?.name || 'Manual Plan'}</span>
                              <span className="text-xs text-slate-500">{txn.moduleSnapshot?.name || 'Subscription Module'}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-900">₹{Number(txn.amount).toLocaleString('en-IN')}</span>
                               <span className="text-xs text-slate-500 uppercase">{txn.currency || 'INR'}</span>
                             </div>
                          </Table.Cell>
                          <Table.Cell>
                             <span className="text-sm text-slate-700 font-medium">{displayMethod}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <div
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}` }}
                            >
                              {statusConfig.label}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                             <div className="text-xs text-slate-600">
                                <div className="font-medium text-slate-900">{format(new Date(txn.createdAt), 'dd MMM yyyy')}</div>
                                <div>{format(new Date(txn.createdAt), 'hh:mm a')}</div>
                             </div>
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={() => openTransactionDrawer(txn)} className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-colors" title="View Details">
                                 <Eye size={18} />
                               </button>
                               <DropdownMenu
                                  trigger={
                                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                                      <MoreVertical size={16} />
                                    </button>
                                  }
                                  items={[
                                    { label: 'View Details', icon: <Eye size={14} />, onClick: () => openTransactionDrawer(txn) },
                                    { label: 'View Student', icon: <User size={14} />, onClick: () => {} },
                                    { label: 'View Subscription', icon: <BookOpen size={14} />, onClick: () => {} },
                                    { label: 'Copy Transaction ID', icon: <Copy size={14} />, onClick: () => copyToClipboard(txn.gatewayPaymentId || txn.transactionNumber) },
                                    { type: 'divider' },
                                    { label: 'Refund Payment', icon: <RotateCcw size={14} />, onClick: () => {} },
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
                     Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} transactions
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL COMPONENT */}
      {drawerOpen && selectedTransaction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-slate-900/40 z-40 transition-opacity" onClick={() => setDrawerOpen(false)} />
          <div className="bg-white rounded-xl shadow-2xl z-50 flex flex-col w-[480px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                   <FileText size={20} />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-slate-900 leading-tight">Transaction Details</h2>
                   <p className="text-sm font-medium text-slate-500">{selectedTransaction.gatewayPaymentId || selectedTransaction.transactionNumber}</p>
                 </div>
               </div>
               <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               
               {/* 1. Student */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Student</h3>
                 <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                       {selectedTransaction.student?.user?.fullName?.charAt(0) || 'S'}
                     </div>
                     <div>
                       <p className="font-bold text-slate-900">{selectedTransaction.student?.user?.fullName}</p>
                       <p className="text-xs text-slate-500">{selectedTransaction.student?.user?.email}</p>
                       <p className="text-xs text-slate-500">{selectedTransaction.student?.user?.mobile}</p>
                     </div>
                   </div>
                   <Button variant="outline" size="sm" onClick={() => {}}>View Student</Button>
                 </div>
               </div>

               {/* 2. Payment Information */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Payment Information</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Transaction ID</p>
                     <p className="text-sm font-medium text-slate-900 break-all">{selectedTransaction.gatewayPaymentId || selectedTransaction.transactionNumber}</p>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                     <div
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                        style={{
                           backgroundColor: STATUS_CONFIG[selectedTransaction.status]?.bg,
                           color: STATUS_CONFIG[selectedTransaction.status]?.color,
                           border: `1px solid ${STATUS_CONFIG[selectedTransaction.status]?.border}`
                        }}
                      >
                        {STATUS_CONFIG[selectedTransaction.status]?.label || selectedTransaction.status}
                      </div>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Amount</p>
                     <p className="text-sm font-bold text-slate-900">₹{Number(selectedTransaction.amount).toLocaleString('en-IN')}</p>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Currency</p>
                     <p className="text-sm font-medium text-slate-900">{selectedTransaction.currency || 'INR'}</p>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                     <p className="text-sm font-medium text-slate-900">{selectedTransaction.paymentMethod || selectedTransaction.paymentSource || 'Unknown'} {selectedTransaction.paymentProvider ? `(${selectedTransaction.paymentProvider})` : ''}</p>
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 mb-1">Payment Date</p>
                     <p className="text-sm font-medium text-slate-900">{format(new Date(selectedTransaction.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-xs text-slate-500 mb-1">Order ID</p>
                     <p className="text-sm font-medium text-slate-900 break-all">{selectedTransaction.gatewayOrderId || 'N/A'}</p>
                   </div>
                 </div>
               </div>

               {/* 3. Subscription Information */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Subscription Information</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                   <div className="col-span-2">
                     <p className="text-xs text-slate-500 mb-1">Student Subscription ID</p>
                     <p className="text-sm font-medium text-slate-900">{selectedTransaction.subscriptionId || 'N/A'}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-xs text-slate-500 mb-1">Plan</p>
                     <p className="text-sm font-medium text-slate-900">{selectedTransaction.planSnapshot?.name || selectedTransaction.subscription?.plan?.name || 'N/A'}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-xs text-slate-500 mb-1">Module</p>
                     <p className="text-sm font-medium text-slate-900">{selectedTransaction.moduleSnapshot?.name || 'N/A'}</p>
                   </div>
                 </div>
               </div>

               {/* 4. Module Access */}
               <div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Module Access</h3>
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-slate-900 mb-1">{selectedTransaction.moduleSnapshot?.name || 'Subscription Module'}</p>
                    <p className="text-xs text-slate-500 mb-3">{selectedTransaction.moduleSnapshot?.description || 'Access to specific features.'}</p>
                    
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 mt-4">Included Features</p>
                    <div className="flex flex-wrap gap-2">
                       {selectedTransaction.moduleSnapshot?.features?.map((f: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded border border-slate-200">
                             {f.featureName || f}
                          </span>
                       )) || (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded border border-indigo-100">
                             {selectedTransaction.moduleSnapshot?.moduleType || 'Custom Access'}
                          </span>
                       )}
                    </div>
                 </div>
               </div>
               
            </div>

            {/* Sticky Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
              <Button variant="outline" className="flex-1 text-slate-700" leftIcon={<FileText size={16} />}>Download Invoice</Button>
              <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" leftIcon={<RotateCcw size={16} />}>Refund</Button>
              <Button variant="primary" className="flex-1">View Subscription</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
