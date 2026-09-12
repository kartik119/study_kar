import React from 'react';
import {
  PageHeader,
  MetricCard,
  Card,
  Alert,
  Skeleton,
  Breadcrumb,
  Badge,
  EmptyState,
} from '@study-karnataka/ui';

interface RoutePlaceholderProps {
  title: string;
  description: string;
  routePath: string;
}

export const ModuleRoutePlaceholder: React.FC<RoutePlaceholderProps> = ({
  title,
  description,
  routePath,
}) => (
  <div>
    <PageHeader
      title={title}
      subtitle={description}
      breadcrumbItems={[
        { label: 'Admin', href: '/' },
        { label: title },
      ]}
    />

    <Alert
      variant="info"
      title="Foundation Route Active"
      message={`${title} module will be implemented in a later development prompt.`}
    />

    <div style={{ marginTop: '24px' }}>
      <Card title={`${title} Administration`}>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
          This route <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{routePath}</code> is configured within the Study Karnataka Admin navigation shell.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      </Card>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const [overview, setOverview] = React.useState<any>(null);

  React.useEffect(() => {
    const userRaw = localStorage.getItem('admin_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const perms = user?.permissions || [];
    const isSuperAdmin = user?.roles?.includes('Super Admin');

    if (isSuperAdmin || perms.includes('exams.analytics.view')) {
      import('../services/exam-analytics.service')
        .then((mod) => mod.fetchPortfolioOverview())
        .then((data) => setOverview(data))
        .catch(() => {});
    }
  }, []);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Admin', href: '/' }, { label: 'Dashboard' }]} />

      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E6EAF0',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        <div>
          <Badge label="Exams Domain Operational" variant="success" />
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '8px 0 4px 0' }}>
            Welcome to Study Karnataka Admin Panel
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Platform management shell for KPSC, KAS, PSI, and Karnataka state competitive exams.
          </p>
        </div>
        <div style={{ padding: '8px 16px', backgroundColor: '#FDECEC', color: '#EF2323', borderRadius: '10px', fontWeight: 600, fontSize: '13px' }}>
          Prompt 06 Exam Analytics
        </div>
      </div>

      {/* Exam Readiness Widget (Prompt 6) */}
      {overview && (
        <Card title="Exam Portfolio Readiness Overview" subtitle="Real-time exam readiness diagnostics & publication readiness" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>LIVE EXAMS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#065F46' }}>{overview.readinessCounts.LIVE || 0}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#E0F2FE', borderRadius: '8px', borderLeft: '4px solid #0EA5E9' }}>
              <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700 }}>READY EXAMS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#075985' }}>{overview.readinessCounts.READY || 0}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', borderLeft: '4px solid #EF4444' }}>
              <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700 }}>BLOCKED EXAMS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#7F1D1D' }}>{overview.readinessCounts.BLOCKED || 0}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FFFBEB', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 700 }}>REVIEW PENDING</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#78350F' }}>{overview.statusCounts.REVIEW_PENDING || 0}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #64748B' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>MISSING PATTERN</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B' }}>{overview.patternReadinessCounts.missingPattern || 0}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #64748B' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>MISSING SYLLABUS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B' }}>{overview.syllabusReadinessCounts.missingSyllabus || 0}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Skeletons (No Fake Data / Fabricated Numbers) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Registered Students" value="--" badgeText="Pending Module" changeLabel="Data will be available once business modules are activated." />
        <MetricCard title="Exam Categories" value="--" badgeText="Pending Module" changeLabel="Data will be available once business modules are activated." />
        <MetricCard title="Study Material Items" value="--" badgeText="Pending Module" changeLabel="Data will be available once business modules are activated." />
        <MetricCard title="MCQ Bank Records" value="--" badgeText="Pending Module" changeLabel="Data will be available once business modules are activated." />
      </div>

      {/* Analytics & Activity Skeleton Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <Card title="Activity & Analytics Overview" subtitle="Real-time operational visualizer foundation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height="32px" />
            <Skeleton height="32px" />
            <Skeleton height="32px" />
            <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '8px 0 0 0' }}>
              Data streams will connect when Prompt 2 domain services are deployed.
            </p>
          </div>
        </Card>

        <Card title="Recent Admin Audit Logs" subtitle="System events and security audit trail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton height="28px" />
            <Skeleton height="28px" />
            <Skeleton height="28px" />
            <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '8px 0 0 0' }}>
              Audit log records will stream here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const ExamsPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Exams"
    description="Manage competitive exam categories, syllabus structures, and state notifications."
    routePath="/exams"
  />
);

export const StudyMaterialsPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Study Materials"
    description="Curate and publish bilingual study notes, syllabus PDFs, and reference guides."
    routePath="/study-materials"
  />
);



export const StudyPlansPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Study Plans"
    description="Structured timeline schedules, daily targets, and syllabus completion plans."
    routePath="/study-plans"
  />
);



export const CurrentAffairsPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Current Affairs"
    description="Daily news summaries, Karnataka state updates, and monthly digests."
    routePath="/current-affairs"
  />
);

export const QuickRevisionPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Quick Revision"
    description="Flashcards, summary tables, and rapid recall notes for exams."
    routePath="/quick-revision"
  />
);

export const SubscriptionsPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Subscriptions & Payments"
    description="Pricing plans, transaction logs, receipts, and access permissions."
    routePath="/subscriptions"
  />
);

export const TeamPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Team"
    description="Admin user management, role assignments, and audit log histories."
    routePath="/team"
  />
);

export const SupportPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Support"
    description="Student inquiries, feedback tickets, and issue resolutions."
    routePath="/support"
  />
);

export const SettingsPage: React.FC = () => (
  <ModuleRoutePlaceholder
    title="Settings"
    description="System configuration, security settings, and integration keys."
    routePath="/settings"
  />
);

export const NotFoundPage: React.FC = () => (
  <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
    <EmptyState title="404 — Page Not Found" description="The requested administration page does not exist." />
  </div>
);
