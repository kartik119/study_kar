import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  FileText,
  ListTree,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Card, Badge, Button } from '@study-karnataka/ui';
import { ExamReadinessDetail } from '@study-karnataka/shared-types';
import { fetchPerExamReadinessDetail } from '../../services/exam-analytics.service';

export const ExamReadinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ExamReadinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPerExamReadinessDetail(id);
      setDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load per-exam readiness detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading per-exam readiness diagnostics...</div>;
  }

  if (error || !detail) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#DC2626', marginBottom: '16px' }}>{error || 'Exam not found'}</div>
        <Button onClick={() => navigate('/exams/analytics')}>Back to Analytics Overview</Button>
      </div>
    );
  }

  const { overview, examRecordSection, patternSection, syllabusSection, publicationSection, issues, recentActivity } = detail;

  const getStatusVariant = (st: string): 'success' | 'info' | 'error' | 'warning' | 'neutral' => {
    switch (st) {
      case 'LIVE': return 'success';
      case 'READY': return 'info';
      case 'BLOCKED': return 'error';
      case 'IN_PROGRESS': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/exams/analytics')} leftIcon={<ArrowLeft size={16} />}>
          Back to Exam Analytics
        </Button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${id}/edit`)}>
            Edit Exam Details
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${id}/pattern`)}>
            Open Pattern Builder
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${id}/syllabus`)}>
            Open Syllabus Builder
          </Button>
        </div>
      </div>

      {/* Main Overview Card */}
      <Card style={{ padding: '24px', marginBottom: '24px', borderLeft: `6px solid ${overview.overallReadiness === 'LIVE' ? '#10B981' : overview.overallReadiness === 'BLOCKED' ? '#EF4444' : '#F59E0B'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
              {overview.programmeNameEn} ({overview.authorityNameEn}) — {overview.cycleYear}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '4px 0 8px 0', color: '#1E293B' }}>
              {overview.titleEn}
            </h1>
            <div style={{ fontSize: '14px', color: '#64748B' }}>{overview.titleKn}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <Badge
              variant={getStatusVariant(overview.overallReadiness)}
              label={`Readiness: ${overview.overallReadiness}`}
            />
            <div style={{ fontSize: '24px', fontWeight: '800', color: overview.completionPercentage === 100 ? '#10B981' : '#D97706' }}>
              {overview.completionPercentage}% Complete
            </div>
          </div>
        </div>

        <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid #E2E8F0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', fontSize: '13px' }}>
          <div>
            <span style={{ color: '#64748B' }}>Cycle Status:</span> <strong>{overview.status}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Visibility:</span> <strong>{overview.visibility}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Blockers:</span> <strong style={{ color: overview.blockerCount > 0 ? '#DC2626' : '#10B981' }}>{overview.blockerCount}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Warnings:</span> <strong style={{ color: '#D97706' }}>{overview.warningCount}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Next Required Action:</span> <strong>{overview.nextAction}</strong>
          </div>
        </div>
      </Card>

      {/* Grid of Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* 1. Exam Record Section */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#2563EB' }} /> Exam Record Checks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {examRecordSection.checks.map((chk, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{chk.name}</span>
                <Badge
                  variant={chk.status === 'PASSED' ? 'success' : chk.status === 'WARNING' ? 'warning' : 'error'}
                  label={chk.status}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* 2. Pattern Section */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#8B5CF6' }} /> Pattern Checks (Rev {patternSection.currentRevision || 'None'})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#475569' }}>
            <div>Stages: <strong>{patternSection.stageCount}</strong></div>
            <div>Papers: <strong>{patternSection.paperCount}</strong></div>
            <div>Sections: <strong>{patternSection.sectionCount}</strong></div>
            <div>Total Marks: <strong>{patternSection.totalMarks}</strong></div>
            <div>Total Questions: <strong>{patternSection.totalQuestions}</strong></div>
            <div>Duration: <strong>{patternSection.approximateDurationMinutes} mins</strong></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {patternSection.checks.map((chk, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{chk.name}</span>
                <Badge
                  variant={chk.status === 'PASSED' ? 'success' : 'error'}
                  label={chk.status}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* 3. Syllabus Section */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListTree size={18} style={{ color: '#10B981' }} /> Syllabus Tree Checks (Rev {syllabusSection.currentRevision || 'None'})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#475569' }}>
            <div>Total Nodes: <strong>{syllabusSection.totalNodes}</strong></div>
            <div>Max Depth: <strong>{syllabusSection.maxDepth} levels</strong></div>
            <div>Root Subjects: <strong>{syllabusSection.subjectCount}</strong></div>
            <div>Bilingual Complete: <strong>{syllabusSection.bothLanguageCompleteNodes}</strong></div>
            <div>Incomplete Nodes: <strong style={{ color: syllabusSection.incompleteNodes > 0 ? '#DC2626' : '#10B981' }}>{syllabusSection.incompleteNodes}</strong></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {syllabusSection.checks.map((chk, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{chk.name}</span>
                <Badge
                  variant={chk.status === 'PASSED' ? 'success' : 'error'}
                  label={chk.status}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* 4. Publication Section */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#D97706' }} /> Publication & Public API Eligibility
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: publicationSection.isEligibleForPublication ? '#ECFDF5' : '#FEF2F2', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', fontSize: '13px' }}>Eligible for Portal Publication</span>
              <Badge
                variant={publicationSection.isEligibleForPublication ? 'success' : 'error'}
                label={publicationSection.isEligibleForPublication ? 'YES' : 'NO'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: publicationSection.isEligibleForPublicApi ? '#ECFDF5' : '#F8FAFC', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', fontSize: '13px' }}>Public API Accessible</span>
              <Badge
                variant={publicationSection.isEligibleForPublicApi ? 'success' : 'neutral'}
                label={publicationSection.isEligibleForPublicApi ? 'LIVE ON API' : 'NOT PUBLIC'}
              />
            </div>
          </div>

          {issues.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#991B1B' }}>
                Active Issues & Blockers ({issues.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {issues.map((iss, iIdx) => (
                  <div key={iIdx} style={{ fontSize: '12px', padding: '8px', backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: '4px' }}>
                    <strong>[{iss.severity}] {iss.code}:</strong> {iss.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 5. Audit Log History */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} style={{ color: '#475569' }} /> Audit Log History
        </h3>

        {recentActivity.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: '13px' }}>No audit activity recorded for this Exam Cycle yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.map((act) => (
              <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: '#1E293B' }}>{act.action}</strong> by {act.adminName} ({act.module})
                </div>
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>
                  {new Date(act.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExamReadinessDetailPage;
