import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Download,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Eye,
  CreditCard,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  PaymentReportsApi,
  PaymentReportResponse,
  FilterOptionsResponse,
  PaymentReportFilterParams,
} from '../../api/payment-reports.api';

// Canonical status styling
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  SUCCESSFUL: { label: 'Successful', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  PAID: { label: 'Paid', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  PENDING: { label: 'Pending', bg: '#FEFCE8', color: '#A16207', border: '#FEF08A' },
  PROCESSING: { label: 'Processing', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  FAILED: { label: 'Failed', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  CANCELLED: { label: 'Cancelled', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  REFUNDED: { label: 'Refunded', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
};

const CHART_COLORS = [
  '#2563EB', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export const PaymentReportsPage: React.FC = () => {
  const navigate = useNavigate();

  // Date Range Quick State
  const now = new Date();
  const defaultStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const defaultEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  // Filter State
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [datePreset, setDatePreset] = useState<'this-month' | 'last-month' | '30-days' | '7-days' | 'custom'>('this-month');
  
  const [selectedExam, setSelectedExam] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  // Applied Filters State (triggers query)
  const [appliedFilters, setAppliedFilters] = useState<PaymentReportFilterParams>({
    startDate: defaultStart,
    endDate: defaultEnd,
    examId: 'ALL',
    moduleId: 'ALL',
    planId: 'ALL',
    status: 'ALL',
    paymentMethod: 'ALL',
  });

  // Data & Loading States
  const [report, setReport] = useState<PaymentReportResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active hover tooltip for Revenue Trend chart
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // 1. Load Filter Options (Exams, Modules, Plans) once
  useEffect(() => {
    async function loadOptions() {
      try {
        const opts = await PaymentReportsApi.getFilterOptions();
        setFilterOptions(opts);
      } catch (err: any) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, []);

  // 2. Load Payment Report whenever appliedFilters changes
  useEffect(() => {
    let isMounted = true;
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await PaymentReportsApi.getSummary(appliedFilters);
        if (isMounted) {
          setReport(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load payment reports');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [appliedFilters]);

  // Dependent Modules List
  const availableModules = useMemo(() => {
    if (!filterOptions) return [];
    if (selectedExam === 'ALL') return filterOptions.modules;
    return filterOptions.modules.filter(m => m.examId === selectedExam);
  }, [filterOptions, selectedExam]);

  // Dependent Plans List
  const availablePlans = useMemo(() => {
    if (!filterOptions) return [];
    if (selectedModule === 'ALL') {
      if (selectedExam === 'ALL') return filterOptions.plans;
      const modIds = availableModules.map(m => m.id);
      return filterOptions.plans.filter(p => modIds.includes(p.moduleId));
    }
    return filterOptions.plans.filter(p => p.moduleId === selectedModule);
  }, [filterOptions, selectedModule, selectedExam, availableModules]);

  // Quick Preset Date Handlers
  const handlePresetChange = (preset: 'this-month' | 'last-month' | '30-days' | '7-days' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'this-month') {
      const s = format(startOfMonth(today), 'yyyy-MM-dd');
      const e = format(endOfMonth(today), 'yyyy-MM-dd');
      setStartDate(s);
      setEndDate(e);
      setAppliedFilters(prev => ({ ...prev, startDate: s, endDate: e }));
    } else if (preset === 'last-month') {
      const prevM = subMonths(today, 1);
      const s = format(startOfMonth(prevM), 'yyyy-MM-dd');
      const e = format(endOfMonth(prevM), 'yyyy-MM-dd');
      setStartDate(s);
      setEndDate(e);
      setAppliedFilters(prev => ({ ...prev, startDate: s, endDate: e }));
    } else if (preset === '30-days') {
      const s = format(subDays(today, 30), 'yyyy-MM-dd');
      const e = format(today, 'yyyy-MM-dd');
      setStartDate(s);
      setEndDate(e);
      setAppliedFilters(prev => ({ ...prev, startDate: s, endDate: e }));
    } else if (preset === '7-days') {
      const s = format(subDays(today, 7), 'yyyy-MM-dd');
      const e = format(today, 'yyyy-MM-dd');
      setStartDate(s);
      setEndDate(e);
      setAppliedFilters(prev => ({ ...prev, startDate: s, endDate: e }));
    }
  };

  // Apply filters from Right Sidebar
  const handleApplyFilters = () => {
    setAppliedFilters({
      startDate,
      endDate,
      examId: selectedExam,
      moduleId: selectedModule,
      planId: selectedPlan,
      status: selectedStatus,
      paymentMethod: selectedMethod,
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    const s = defaultStart;
    const e = defaultEnd;
    setStartDate(s);
    setEndDate(e);
    setDatePreset('this-month');
    setSelectedExam('ALL');
    setSelectedModule('ALL');
    setSelectedPlan('ALL');
    setSelectedStatus('ALL');
    setSelectedMethod('ALL');
    setAppliedFilters({
      startDate: s,
      endDate: e,
      examId: 'ALL',
      moduleId: 'ALL',
      planId: 'ALL',
      status: 'ALL',
      paymentMethod: 'ALL',
    });
  };

  // Export CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await PaymentReportsApi.exportCSV(appliedFilters);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Network error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Trend Chart Metrics
  const trendMaxAmount = useMemo(() => {
    if (!report || report.revenueTrend.length === 0) return 1000;
    const maxVal = Math.max(...report.revenueTrend.map(p => Math.max(p.revenue, p.refunds, p.netRevenue)));
    return maxVal > 0 ? maxVal * 1.15 : 1000;
  }, [report]);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: 'inherit', color: '#1E293B' }}>
      {/* 1. Header with Breadcrumb, Title & Top Controls */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
          <span>Admin</span>
          <ChevronRight size={14} />
          <span>Subscriptions & Payments</span>
          <ChevronRight size={14} />
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Payment Reports</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Payment Reports
            </h1>
          </div>

          {/* Top Right Controls: Date Range & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Date Preset Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <button
                type="button"
                onClick={() => handlePresetChange('this-month')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: datePreset === 'this-month' ? '#F1F5F9' : 'transparent',
                  color: datePreset === 'this-month' ? '#0F172A' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('last-month')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: datePreset === 'last-month' ? '#F1F5F9' : 'transparent',
                  color: datePreset === 'last-month' ? '#0F172A' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('30-days')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: datePreset === '30-days' ? '#F1F5F9' : 'transparent',
                  color: datePreset === '30-days' ? '#0F172A' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                Last 30 Days
              </button>
            </div>

            {/* Current Range Label Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Calendar size={15} style={{ color: '#64748B' }} />
              <span>
                {report ? `${format(new Date(report.meta.dateRange.startDate), 'dd MMM yyyy')} – ${format(new Date(report.meta.dateRange.endDate), 'dd MMM yyyy')}` : 'Loading...'}
              </span>
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={15} />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* 1. Filters Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} style={{ color: '#2563EB' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Filters</h3>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {/* Filter Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              {/* Date Range Inputs */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Date Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      fontSize: '12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      fontSize: '12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Exam Filter */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Target Exam
                </label>
                <select
                  value={selectedExam}
                  onChange={e => {
                    setSelectedExam(e.target.value);
                    setSelectedModule('ALL');
                    setSelectedPlan('ALL');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Exams</option>
                  {filterOptions?.exams?.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              {/* Module Filter */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Subscription Module
                </label>
                <select
                  value={selectedModule}
                  onChange={e => {
                    setSelectedModule(e.target.value);
                    setSelectedPlan('ALL');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Modules</option>
                  {availableModules.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Plan Filter */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Subscription Plan
                </label>
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Plans</option>
                  {availablePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Payment Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Status</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <select
                  value={selectedMethod}
                  onChange={e => setSelectedMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="WALLET">Wallet</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Apply Filters Button */}
              <button
                type="button"
                onClick={handleApplyFilters}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.15s',
                }}
              >
                <Filter size={14} />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>



          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '16px',
            }}
          >
            {/* KPI 1: Total Revenue */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Revenue</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {report ? report.kpis.totalRevenue.formatted : '₹0'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                {report && report.kpis.totalRevenue.trend !== undefined && report.kpis.totalRevenue.trend !== 0 ? (
                  report.kpis.totalRevenue.trend > 0 ? (
                    <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingUp size={14} /> +{report.kpis.totalRevenue.trend}%
                    </span>
                  ) : (
                    <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingDown size={14} /> {report.kpis.totalRevenue.trend}%
                    </span>
                  )
                ) : (
                  <span style={{ color: '#94A3B8' }}>No prior comparison</span>
                )}
                <span style={{ color: '#94A3B8' }}>vs previous period</span>
              </div>
            </div>

            {/* KPI 2: Successful Payments */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Successful Payments</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {report ? report.kpis.successfulPayments.formatted : '0'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                {report && report.kpis.successfulPayments.trend !== undefined && report.kpis.successfulPayments.trend !== 0 ? (
                  report.kpis.successfulPayments.trend > 0 ? (
                    <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingUp size={14} /> +{report.kpis.successfulPayments.trend}%
                    </span>
                  ) : (
                    <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingDown size={14} /> {report.kpis.successfulPayments.trend}%
                    </span>
                  )
                ) : (
                  <span style={{ color: '#94A3B8' }}>Steady volume</span>
                )}
                <span style={{ color: '#94A3B8' }}>vs previous period</span>
              </div>
            </div>

            {/* KPI 3: Refund Amount */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Refund Amount</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#FFF7ED',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={18} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {report ? report.kpis.refundAmount.formatted : '₹0'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: '#64748B' }}>
                  {report && report.kpis.totalRevenue.value > 0
                    ? `${Math.round((report.kpis.refundAmount.value / report.kpis.totalRevenue.value) * 100)}% refund rate`
                    : 'Completed refunds'}
                </span>
              </div>
            </div>

            {/* KPI 4: Net Revenue */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Net Revenue</span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', letterSpacing: '-0.02em' }}>
                {report ? report.kpis.netRevenue.formatted : '₹0'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: '#059669', fontWeight: 500 }}>Total Revenue − Refunds</span>
              </div>
            </div>
          </div>

          {/* Row 1 Charts: Revenue Trend (55-60%) + Revenue by Exam (40-45%) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: '20px',
            }}
          >
            {/* Chart 1: Revenue Trend */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Revenue Trend</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Daily revenue, refunds & net collection</p>
                </div>
                {/* Legends */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#2563EB' }} />
                    <span style={{ color: '#475569', fontWeight: 500 }}>Revenue</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#F43F5E' }} />
                    <span style={{ color: '#475569', fontWeight: 500 }}>Refunds</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10B981' }} />
                    <span style={{ color: '#475569', fontWeight: 500 }}>Net Revenue</span>
                  </div>
                </div>
              </div>

              {/* Trend SVG Visualizer */}
              {report && report.revenueTrend.length > 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '220px', marginTop: '10px' }}>
                  <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                    {/* Background Grid Lines */}
                    {[0, 50, 100, 150].map(y => (
                      <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                    ))}

                    {/* Bars / Points */}
                    {report.revenueTrend.map((p, idx) => {
                      const totalPts = report.revenueTrend.length;
                      const colWidth = Math.max(8, Math.min(24, 500 / totalPts));
                      const x = (idx / Math.max(1, totalPts - 1)) * (600 - colWidth);
                      const revHeight = (p.revenue / trendMaxAmount) * 160;
                      const refHeight = (p.refunds / trendMaxAmount) * 160;
                      const netHeight = (p.netRevenue / trendMaxAmount) * 160;

                      return (
                        <g
                          key={p.rawDate}
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Revenue Bar */}
                          <rect
                            x={x}
                            y={180 - revHeight}
                            width={colWidth}
                            height={revHeight}
                            fill="#2563EB"
                            rx="2"
                            opacity={hoveredTrendIndex === null || hoveredTrendIndex === idx ? 0.85 : 0.4}
                          />
                          {/* Net Revenue Overlay */}
                          <rect
                            x={x}
                            y={180 - netHeight}
                            width={colWidth}
                            height={netHeight}
                            fill="#10B981"
                            rx="2"
                            opacity={hoveredTrendIndex === null || hoveredTrendIndex === idx ? 0.75 : 0.3}
                          />
                          {/* Refund Bar if any */}
                          {p.refunds > 0 && (
                            <rect
                              x={x}
                              y={180 - refHeight}
                              width={colWidth}
                              height={refHeight}
                              fill="#F43F5E"
                              rx="2"
                              opacity={0.9}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* X Axis Date Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                    <span>{report.revenueTrend[0]?.date || ''}</span>
                    {report.revenueTrend.length > 2 && (
                      <span>{report.revenueTrend[Math.floor(report.revenueTrend.length / 2)]?.date || ''}</span>
                    )}
                    <span>{report.revenueTrend[report.revenueTrend.length - 1]?.date || ''}</span>
                  </div>

                  {/* Tooltip on Hover */}
                  {hoveredTrendIndex !== null && report.revenueTrend[hoveredTrendIndex] && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '3px', marginBottom: '3px' }}>
                        {report.revenueTrend[hoveredTrendIndex].date}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#93C5FD' }}>Revenue:</span>
                        <span style={{ fontWeight: 600 }}>₹{report.revenueTrend[hoveredTrendIndex].revenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#FCA5A5' }}>Refunds:</span>
                        <span style={{ fontWeight: 600 }}>₹{report.revenueTrend[hoveredTrendIndex].refunds.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#6EE7B7' }}>Net:</span>
                        <span style={{ fontWeight: 600 }}>₹{report.revenueTrend[hoveredTrendIndex].netRevenue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No revenue trend data for the selected period
                </div>
              )}
            </div>

            {/* Chart 2: Revenue by Exam */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Revenue by Exam</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Share of collections per target examination</p>
              </div>

              {report && report.revenueByExam.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', alignItems: 'center', minHeight: '180px' }}>
                  {/* SVG Donut */}
                  <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto' }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      {(() => {
                        let accumulated = 0;
                        return report.revenueByExam.map((item, idx) => {
                          const pct = item.percentage;
                          const strokeDasharray = `${pct} ${100 - pct}`;
                          const strokeDashoffset = -accumulated;
                          accumulated += pct;
                          const color = CHART_COLORS[idx % CHART_COLORS.length];
                          return (
                            <circle
                              key={item.examId}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={color}
                              strokeWidth="18"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              pathLength="100"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* Donut Center Total */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500, textTransform: 'uppercase' }}>Total</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {report.kpis.totalRevenue.formatted}
                      </span>
                    </div>
                  </div>

                  {/* Exam Legend List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                    {report.revenueByExam.map((item, idx) => (
                      <div key={item.examId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }} title={item.examName}>
                            {item.examName}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.formattedRevenue}</div>
                          <div style={{ color: '#94A3B8', fontSize: '11px' }}>{item.percentage}% ({item.count})</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No exam payment data available
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Revenue by Module + Payment Method + Transaction Status */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '20px',
            }}
          >
            {/* Card 1: Revenue by Module (Horizontal Progress Bars) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Revenue by Module</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Top contributing subscription modules</p>
              </div>

              {report && report.revenueByModule.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  {report.revenueByModule.slice(0, 5).map((mod, idx) => (
                    <div key={mod.moduleId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={mod.moduleName}>
                          {mod.moduleName}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{mod.formattedRevenue}</span>
                      </div>
                      {/* Bar */}
                      <div style={{ width: '100%', height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, mod.percentage)}%`,
                            height: '100%',
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
                        <span>{mod.count} purchase{mod.count === 1 ? '' : 's'}</span>
                        <span>{mod.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No module sales recorded
                </div>
              )}
            </div>

            {/* Card 2: Payment Method Breakdown (Donut) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Payment Method Breakdown</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Transactions by payment gateway rail</p>
              </div>

              {report && report.paymentMethodBreakdown.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Donut representation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        {(() => {
                          let accumulated = 0;
                          return report.paymentMethodBreakdown.map((pm, idx) => {
                            const pct = pm.percentage;
                            const strokeDasharray = `${pct} ${100 - pct}`;
                            const strokeDashoffset = -accumulated;
                            accumulated += pct;
                            const color = CHART_COLORS[idx % CHART_COLORS.length];
                            return (
                              <circle
                                key={pm.method}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={color}
                                strokeWidth="18"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                pathLength="100"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: '#64748B' }}>Txns</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {report.paymentMethodBreakdown.reduce((sum, m) => sum + m.count, 0)}
                        </span>
                      </div>
                    </div>

                    {/* Method List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                      {report.paymentMethodBreakdown.map((pm, idx) => (
                        <div key={pm.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '2px',
                                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                              }}
                            />
                            <span style={{ color: '#334155', fontWeight: 600 }}>{pm.method}</span>
                          </div>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>
                            {pm.percentage}% <span style={{ color: '#94A3B8', fontWeight: 400 }}>({pm.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No payment methods recorded
                </div>
              )}
            </div>

            {/* Card 3: Transaction Status (Donut) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Transaction Status</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Completion & outcome ratios</p>
              </div>

              {report && report.transactionStatusBreakdown.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Donut representation */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      {(() => {
                        let accumulated = 0;
                        const statusColors: Record<string, string> = {
                          SUCCESSFUL: '#10B981',
                          PENDING: '#F59E0B',
                          FAILED: '#EF4444',
                          CANCELLED: '#94A3B8',
                          REFUNDED: '#8B5CF6',
                          PARTIALLY_REFUNDED: '#7E22CE',
                        };
                        return report.transactionStatusBreakdown.map(st => {
                          const pct = st.percentage;
                          const strokeDasharray = `${pct} ${100 - pct}`;
                          const strokeDashoffset = -accumulated;
                          accumulated += pct;
                          const color = statusColors[st.status] || '#64748B';
                          return (
                            <circle
                              key={st.status}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={color}
                              strokeWidth="18"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              pathLength="100"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: '#64748B' }}>Total</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {report.transactionStatusBreakdown.reduce((sum, s) => sum + s.count, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Status List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                    {report.transactionStatusBreakdown.map(st => {
                      const cfg = STATUS_CONFIG[st.status] || { color: '#64748B' };
                      return (
                        <div key={st.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '2px',
                                backgroundColor: cfg.color,
                              }}
                            />
                            <span style={{ color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }} title={cfg.label || st.label}>
                              {cfg.label || st.label}
                            </span>
                          </div>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>
                            {st.percentage}% <span style={{ color: '#94A3B8', fontWeight: 400 }}>({st.count})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  No transaction status data
                </div>
              )}
            </div>
          </div>




          {/* 2. Key Insights Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#D97706' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Key Insights</h3>
            </div>

            {/* List of Insights */}
            {report && report.keyInsights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {report.keyInsights.map(ins => {
                  let iconBg = '#F1F5F9';
                  let iconColor = '#475569';
                  let icon = <Award size={15} />;

                  if (ins.type === 'growth') {
                    iconBg = '#ECFDF5';
                    iconColor = '#059669';
                    icon = <TrendingUp size={15} />;
                  } else if (ins.type === 'exam') {
                    iconBg = '#EFF6FF';
                    iconColor = '#2563EB';
                    icon = <BookOpen size={15} />;
                  } else if (ins.type === 'module') {
                    iconBg = '#FAF5FF';
                    iconColor = '#7E22CE';
                    icon = <Layers size={15} />;
                  } else if (ins.type === 'method') {
                    iconBg = '#FDF4FF';
                    iconColor = '#C026D3';
                    icon = <CreditCard size={15} />;
                  } else if (ins.type === 'refund') {
                    iconBg = '#FFF7ED';
                    iconColor = '#EA580C';
                    icon = <RotateCcw size={15} />;
                  }

                  return (
                    <div
                      key={ins.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        padding: '12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: iconBg,
                          color: iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {icon}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{ins.primaryValue}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: iconBg,
                              color: iconColor,
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {ins.badge}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{ins.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                Not enough payment data to generate insights for this period.
              </div>
            )}
          </div>
      {/* Row 3: Recent Transactions (Last 10) Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Recent Transactions (Last 10)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Latest transactions filtered by the active reporting parameters
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/subscriptions/transactions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#2563EB',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              transition: 'background-color 0.15s',
            }}
          >
            <span>View All Transactions</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Table */}
        {report && report.recentTransactions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Transaction ID</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Plan / Module</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Invoice</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.recentTransactions.map((txn, index) => {
                  const cfg = STATUS_CONFIG[txn.status] || {
                    label: txn.status,
                    bg: '#F1F5F9',
                    color: '#475569',
                    border: '#CBD5E1',
                  };

                  return (
                    <tr
                      key={txn.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 10px', color: '#94A3B8' }}>{index + 1}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                        {txn.transactionNumber}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{txn.studentName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{txn.studentEmail}</div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={txn.planName}>{txn.planName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={txn.moduleName}>{txn.moduleName}</div>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0F172A' }}>
                        {txn.formattedAmount}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#475569' }}>
                        <span style={{ backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {txn.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {txn.paidAt || txn.createdAt}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {txn.invoiceNumber ? (
                          <button
                            type="button"
                            onClick={() => navigate('/subscriptions/invoices')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563EB',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            {txn.invoiceNumber}
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate('/subscriptions/transactions')}
                          title="View in Transactions module"
                          style={{
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
            No transactions found for the selected reporting parameters
          </div>
        )}
      </div>
      </div>
    </div>
  );
};