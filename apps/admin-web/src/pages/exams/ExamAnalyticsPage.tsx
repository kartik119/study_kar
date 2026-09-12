import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  SearchInput,
  Select,
  EmptyState,
  Modal,
} from '@study-karnataka/ui';
import {
  ExamPortfolioOverview,
  ExamReadinessListItem,
  ExamWorkflowQueue,
  ExamImportantDateAnalytics,
  ExamReadinessIssue,
  ExamAnalyticsFilters,
} from '@study-karnataka/shared-types';
import {
  fetchPortfolioOverview,
  fetchReadinessList,
  fetchWorkflowQueues,
  fetchImportantDatesAnalytics,
  fetchPerExamIssues,
} from '../../services/exam-analytics.service';
import './ExamAnalyticsPage.css';

export const ExamAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ExamPortfolioOverview | null>(null);
  const [readinessItems, setReadinessItems] = useState<ExamReadinessListItem[]>([]);
  const [readinessMeta, setReadinessMeta] = useState<any>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [queues, setQueues] = useState<ExamWorkflowQueue | null>(null);
  const [importantDates, setImportantDates] = useState<ExamImportantDateAnalytics | null>(null);

  // Filters State
  const [filters, setFilters] = useState<ExamAnalyticsFilters>({
    search: searchParams.get('search') || '',
    authorityId: searchParams.get('authorityId') || '',
    programmeId: searchParams.get('programmeId') || '',
    cycleYear: searchParams.get('cycleYear') ? Number(searchParams.get('cycleYear')) : undefined,
    status: (searchParams.get('status') as any) || undefined,
    visibility: (searchParams.get('visibility') as any) || undefined,
    readinessStatus: (searchParams.get('readinessStatus') as any) || undefined,
    bilingualState: (searchParams.get('bilingualState') as any) || undefined,
    patternStatus: (searchParams.get('patternStatus') as any) || undefined,
    syllabusStatus: (searchParams.get('syllabusStatus') as any) || undefined,
    includeArchived: searchParams.get('includeArchived') === 'true',
    page: Number(searchParams.get('page')) || 1,
    limit: 10,
    sortBy: 'lastUpdated',
    sortOrder: 'desc',
  });

  // Drawer state
  const [drawerExam, setDrawerExam] = useState<ExamReadinessListItem | null>(null);
  const [drawerIssues, setDrawerIssues] = useState<ExamReadinessIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, listData, queueData, dateData] = await Promise.all([
        fetchPortfolioOverview(filters),
        fetchReadinessList(filters),
        fetchWorkflowQueues(filters),
        fetchImportantDatesAnalytics(filters),
      ]);

      setOverview(ovData);
      setReadinessItems(listData.data);
      setReadinessMeta(listData.meta);
      setQueues(queueData);
      setImportantDates(dateData);
    } catch (err: any) {
      setError(err.message || 'Failed to load exam analytics data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleFilterChange = (key: keyof ExamAnalyticsFilters, val: any) => {
    const newFilters = { ...filters, [key]: val, page: key === 'page' ? val : 1 };
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      authorityId: '',
      programmeId: '',
      cycleYear: undefined,
      status: undefined,
      visibility: undefined,
      readinessStatus: undefined,
      bilingualState: undefined,
      patternStatus: undefined,
      syllabusStatus: undefined,
      includeArchived: false,
      page: 1,
      limit: 10,
      sortBy: 'lastUpdated',
      sortOrder: 'desc',
    });
  };

  const handleOpenDrawer = async (item: ExamReadinessListItem) => {
    setDrawerExam(item);
    setLoadingIssues(true);
    try {
      const issues = await fetchPerExamIssues(item.id);
      setDrawerIssues(issues);
    } catch (err) {
      setDrawerIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  };

  const getReadinessBadgeVariant = (status: string): 'success' | 'info' | 'error' | 'warning' | 'neutral' => {
    switch (status) {
      case 'LIVE': return 'success';
      case 'READY': return 'info';
      case 'BLOCKED': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'NOT_STARTED': return 'neutral';
      case 'ARCHIVED': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div className="exam-analytics-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--sk-color-dark, #1E293B)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 style={{ color: 'var(--sk-color-primary, #D97706)' }} />
            Exam Analytics & Readiness Dashboard
          </h1>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '14px' }}>
            Real-time readiness diagnostics, publication blockers, workflow queues and date tracking across all Exam Cycles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {overview?.asOf && (
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              As of: {new Date(overview.asOf).toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadAnalyticsData} leftIcon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} /> Filter Exam Portfolio
          </h3>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <SearchInput
            placeholder="Search exam, programme, authority..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Exam Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'REVIEW_PENDING', label: 'Review Pending' },
              { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'CLOSED', label: 'Closed' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            value={filters.status || ''}
            onChange={(val) => handleFilterChange('status', val || undefined)}
          />

          <Select
            options={[
              { value: '', label: 'All Readiness Statuses' },
              { value: 'NOT_STARTED', label: 'Not Started' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'BLOCKED', label: 'Blocked' },
              { value: 'READY', label: 'Ready' },
              { value: 'LIVE', label: 'Live' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            value={filters.readinessStatus || ''}
            onChange={(val) => handleFilterChange('readinessStatus', val || undefined)}
          />

          <Select
            options={[
              { value: '', label: 'All Language Readiness' },
              { value: 'BOTH_COMPLETE', label: 'Both Languages Complete' },
              { value: 'ENGLISH_COMPLETE', label: 'English Complete Only' },
              { value: 'KANNADA_COMPLETE', label: 'Kannada Complete Only' },
              { value: 'INCOMPLETE', label: 'Incomplete' },
            ]}
            value={filters.bilingualState || ''}
            onChange={(val) => handleFilterChange('bilingualState', val || undefined)}
          />

          <Select
            options={[
              { value: '', label: 'All Visibilities' },
              { value: 'PUBLIC', label: 'Public' },
              { value: 'UNLISTED', label: 'Unlisted' },
              { value: 'PRIVATE', label: 'Private' },
            ]}
            value={filters.visibility || ''}
            onChange={(val) => handleFilterChange('visibility', val || undefined)}
          />

          <Select
            options={[
              { value: '', label: 'All Cycle Years' },
              { value: '2026', label: 'Year 2026' },
              { value: '2025', label: 'Year 2025' },
              { value: '2024', label: 'Year 2024' },
            ]}
            value={filters.cycleYear ? String(filters.cycleYear) : ''}
            onChange={(val) => handleFilterChange('cycleYear', val ? Number(val) : undefined)}
          />
        </div>

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <input
            type="checkbox"
            id="includeArchivedCheck"
            checked={!!filters.includeArchived}
            onChange={(e) => handleFilterChange('includeArchived', e.target.checked)}
          />
          <label htmlFor="includeArchivedCheck" style={{ cursor: 'pointer', color: '#475569' }}>
            Include Archived Exam Cycles in Analytics
          </label>
        </div>
      </Card>

      {/* Overview Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Card style={{ padding: '16px', borderLeft: '4px solid #3B82F6' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>TOTAL EXAMS</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1E293B', marginTop: '4px' }}>{overview.totalCycles}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Across {overview.totalProgrammes} Programmes</div>
          </Card>

          <Card style={{ padding: '16px', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>LIVE EXAMS</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#065F46', marginTop: '4px' }}>{overview.readinessCounts.LIVE || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Publicly accessible</div>
          </Card>

          <Card style={{ padding: '16px', borderLeft: '4px solid #0EA5E9' }}>
            <div style={{ fontSize: '12px', color: '#0EA5E9', fontWeight: '600' }}>READY</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#0369A1', marginTop: '4px' }}>{overview.readinessCounts.READY || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Approved & ready to publish</div>
          </Card>

          <Card style={{ padding: '16px', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>BLOCKED</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#991B1B', marginTop: '4px' }}>{overview.readinessCounts.BLOCKED || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Validation blockers present</div>
          </Card>

          <Card style={{ padding: '16px', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600' }}>IN PROGRESS</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#92400E', marginTop: '4px' }}>{overview.readinessCounts.IN_PROGRESS || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Draft / Review Pending</div>
          </Card>

          <Card style={{ padding: '16px', borderLeft: '4px solid #8B5CF6' }}>
            <div style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: '600' }}>BILINGUAL COMPLETE</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#5B21B6', marginTop: '4px' }}>{overview.bilingualCounts.bothComplete}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{overview.bilingualCounts.incomplete} incomplete</div>
          </Card>
        </div>
      )}

      {/* Main Grid: Workflow Queues & Important Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Actionable Workflow Queues */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#D97706' }} /> Actionable Workflow Queues
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Awaiting Content Manager</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Drafts or Changes Requested</div>
              </div>
              <Badge variant="warning" label={String(queues?.awaitingManager.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Awaiting Reviewer</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Submitted for Editorial Review</div>
              </div>
              <Badge variant="info" label={String(queues?.awaitingReviewer.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Awaiting Super Admin Publication</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Approved Exam Cycles</div>
              </div>
              <Badge variant="success" label={String(queues?.awaitingSuperAdmin.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#991B1B' }}>Blocked by Validation</div>
                <div style={{ fontSize: '12px', color: '#991B1B' }}>Unresolved publication blockers</div>
              </div>
              <Badge variant="error" label={String(queues?.blockedByValidation.length || 0)} />
            </div>
          </div>
        </Card>

        {/* Important Dates Summary */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: '#2563EB' }} /> Important Date Monitoring
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#065F46' }}>Applications Currently Open</div>
                <div style={{ fontSize: '12px', color: '#047857' }}>Active registration windows</div>
              </div>
              <Badge variant="success" label={String(importantDates?.applicationsOpen.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#92400E' }}>Closing in 7 Days</div>
                <div style={{ fontSize: '12px', color: '#B45309' }}>Application deadlines closing soon</div>
              </div>
              <Badge variant="warning" label={String(importantDates?.applicationsClosingSoon.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Upcoming Examinations</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Scheduled stage exams</div>
              </div>
              <Badge variant="info" label={String(importantDates?.upcomingExams.length || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Tentative Dates Flagged</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Dates requiring official confirmation</div>
              </div>
              <Badge variant="neutral" label={String(importantDates?.tentativeDates.length || 0)} />
            </div>
          </div>
        </Card>
      </div>

      {/* Readiness Table */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
            Exam Cycle Readiness Diagnostics ({readinessMeta.total})
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading readiness data...</div>
        ) : error ? (
          <div style={{ color: '#DC2626', padding: '20px', textAlign: 'center' }}>{error}</div>
        ) : readinessItems.length === 0 ? (
          <EmptyState
            title="No Exam Cycles Found"
            description="No Exam Cycles match the active readiness filters."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px' }}>Exam Title</th>
                  <th style={{ padding: '12px' }}>Authority / Programme</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Pattern</th>
                  <th style={{ padding: '12px' }}>Syllabus</th>
                  <th style={{ padding: '12px' }}>Completion %</th>
                  <th style={{ padding: '12px' }}>Readiness</th>
                  <th style={{ padding: '12px' }}>Issues</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {readinessItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#1E293B' }}>{item.titleEn}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{item.titleKn} ({item.cycleYear})</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{item.programmeNameEn}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{item.authorityNameEn}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={item.status === 'PUBLISHED' ? 'success' : item.status === 'APPROVED' ? 'info' : 'warning'}
                        label={item.status}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={item.patternStatus === 'PUBLISHED' ? 'success' : item.patternStatus ? 'warning' : 'neutral'}
                        label={item.patternStatus ? `Rev ${item.patternRevisionNumber} (${item.patternStatus})` : 'Missing'}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={item.syllabusStatus === 'PUBLISHED' ? 'success' : item.syllabusStatus ? 'warning' : 'neutral'}
                        label={item.syllabusStatus ? `Rev ${item.syllabusRevisionNumber} (${item.syllabusStatus})` : 'Missing'}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '700', color: item.overallCompletionPercentage === 100 ? '#10B981' : '#D97706' }}>
                        {item.overallCompletionPercentage}%
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={getReadinessBadgeVariant(item.overallReadinessStatus)}
                        label={item.overallReadinessStatus}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      {item.blockerCount > 0 ? (
                        <span
                          style={{ color: '#DC2626', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenDrawer(item)}
                        >
                          <AlertTriangle size={14} /> {item.blockerCount} Blocker(s)
                        </span>
                      ) : item.warningCount > 0 ? (
                        <span style={{ color: '#D97706', fontSize: '12px' }}>{item.warningCount} Warning(s)</span>
                      ) : (
                        <span style={{ color: '#10B981', fontSize: '12px' }}>Clean</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/exams/${item.id}/analytics`)}
                        >
                          Readiness
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/exams/${item.id}/edit`)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {readinessMeta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Page {readinessMeta.page} of {readinessMeta.totalPages} ({readinessMeta.total} total exams)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={readinessMeta.page <= 1}
                onClick={() => handleFilterChange('page', readinessMeta.page - 1)}
                leftIcon={<ChevronLeft size={14} />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={readinessMeta.page >= readinessMeta.totalPages}
                onClick={() => handleFilterChange('page', readinessMeta.page + 1)}
                rightIcon={<ChevronRight size={14} />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Readiness Issue Drawer / Modal */}
      {drawerExam && (
        <Modal
          isOpen={!!drawerExam}
          onClose={() => setDrawerExam(null)}
          title={`Readiness Diagnostics — ${drawerExam.titleEn}`}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Badge
                variant={getReadinessBadgeVariant(drawerExam.overallReadinessStatus)}
                label={drawerExam.overallReadinessStatus}
              />
              <span style={{ fontWeight: '600' }}>Overall Completion: {drawerExam.overallCompletionPercentage}%</span>
            </div>

            {loadingIssues ? (
              <div>Loading diagnostic issues...</div>
            ) : drawerIssues.length === 0 ? (
              <div style={{ color: '#10B981', padding: '16px', textAlign: 'center' }}>
                No active blockers or warnings found for this Exam Cycle.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {drawerIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      borderLeft: issue.severity === 'BLOCKER' ? '4px solid #EF4444' : '4px solid #F59E0B',
                      backgroundColor: issue.severity === 'BLOCKER' ? '#FEF2F2' : '#FFFBEB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: issue.severity === 'BLOCKER' ? '#991B1B' : '#92400E' }}>
                        [{issue.severity}] {issue.category} — {issue.code}
                      </span>
                      <Badge
                        variant={issue.severity === 'BLOCKER' ? 'error' : 'warning'}
                        label={issue.severity}
                      />
                    </div>

                    <div style={{ fontSize: '14px', marginTop: '6px', color: '#1E293B', fontWeight: '500' }}>
                      {issue.message}
                    </div>

                    {issue.suggestedAction && (
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                        <strong>Suggested Correction:</strong> {issue.suggestedAction}
                      </div>
                    )}

                    {issue.destinationRoute && (
                      <div style={{ marginTop: '8px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDrawerExam(null);
                            navigate(issue.destinationRoute!);
                          }}
                          rightIcon={<ExternalLink size={12} />}
                        >
                          Fix in Management Screen
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExamAnalyticsPage;
