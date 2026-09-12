import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchExams } from '../../services/examApi';
import {
  fetchPatterns,
  fetchPatternById,
  createPattern,
  clonePatternRevision,
  triggerPatternWorkflow,
  deleteDraftPattern,
  deleteDraftStage,
  deleteDraftPaper,
  deleteDraftSection,
  createStage,
  updateStage,
  createPaper,
  updatePaper,
  createSection,
  updateSection,
} from '../../services/examPatternApi';
import { ExamCycle, ExamPattern, ExamStage, ExamPaper, ExamPaperSection } from '@study-karnataka/shared-types';
import { StageFormModal } from './components/StageFormModal';
import { PaperFormModal } from './components/PaperFormModal';
import { SectionFormModal } from './components/SectionFormModal';

export const ExamStagesBuilderPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || '');
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [patternDetail, setPatternDetail] = useState<ExamPattern | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tree Expansion State
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({});

  // Modal States
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ExamStage | null>(null);

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [activePaperStageId, setActivePaperStageId] = useState<string>('');
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [activeSectionPaperId, setActiveSectionPaperId] = useState<string>('');
  const [editingSection, setEditingSection] = useState<ExamPaperSection | null>(null);



  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchExams();
      setExams(data);
      const targetId = examId || (data.length > 0 ? data[0].id : '');
      if (targetId) {
        setSelectedExamId(targetId);
        await loadPatterns(targetId);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exams');
      setLoading(false);
    }
  };

  const loadPatterns = async (eId: string) => {
    try {
      setLoading(true);
      const data = await fetchPatterns(eId);
      setPatterns(data);
      if (data.length > 0) {
        const currentOrLatest = data.find((p) => p.isCurrent) || data[0];
        setSelectedPatternId(currentOrLatest.id);
        await loadPatternDetail(eId, currentOrLatest.id);
      } else {
        setSelectedPatternId('');
        setPatternDetail(null);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load patterns');
      setLoading(false);
    }
  };

  const loadPatternDetail = async (eId: string, pId: string) => {
    try {
      setLoading(true);
      const detail = await fetchPatternById(eId, pId);
      setPatternDetail(detail);

      const stageExp: Record<string, boolean> = {};
      const paperExp: Record<string, boolean> = {};
      
      setExpandedStages(stageExp);
      setExpandedPapers(paperExp);
    } catch (err: any) {
      setError(err.message || 'Failed to load pattern details');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eId = e.target.value;
    setSelectedExamId(eId);
    navigate(`/exams/${eId}/pattern`);
    loadPatterns(eId);
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPatternId(pId);
    loadPatternDetail(selectedExamId, pId);
  };

  const handleCreateInitialPattern = async () => {
    const selectedExam = exams.find((e) => e.id === selectedExamId);
    if (!selectedExam) return;
    try {
      setActionLoading(true);
      await createPattern(selectedExamId, {
        titleEn: `${selectedExam.titleEn} Pattern`,
        titleKn: `${selectedExam.titleKn} ಪರೀಕ್ಷಾ ವಿಧಾನ`,
        descriptionEn: `Official Academic Pattern for ${selectedExam.titleEn}`,
        descriptionKn: `${selectedExam.titleKn} ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ವಿಧಾನ`,
      });
      await loadPatterns(selectedExamId);
    } catch (err: any) {
      alert(err.message || 'Failed to create pattern');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloneRevision = async () => {
    if (!patternDetail) return;
    if (!confirm(`Create new draft revision based on Revision ${patternDetail.revisionNumber}?`)) return;
    try {
      setActionLoading(true);
      const cloned = await clonePatternRevision(selectedExamId, patternDetail.id);
      await loadPatterns(selectedExamId);
      setSelectedPatternId(cloned.id);
      await loadPatternDetail(selectedExamId, cloned.id);
    } catch (err: any) {
      alert(err.message || 'Failed to clone pattern revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRevision = async () => {
    if (!patternDetail) return;
    if (!confirm(`Are you sure you want to permanently delete Revision ${patternDetail.revisionNumber}?`)) return;
    try {
      setActionLoading(true);
      await deleteDraftPattern(selectedExamId, patternDetail.id);
      await loadPatterns(selectedExamId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete pattern revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWorkflowAction = async (action: 'submit-review' | 'request-changes' | 'approve' | 'publish') => {
    if (!patternDetail) return;
    try {
      setActionLoading(true);
      await triggerPatternWorkflow(selectedExamId, patternDetail.id, action);
      await loadPatterns(selectedExamId);
      await loadPatternDetail(selectedExamId, patternDetail.id);
    } catch (err: any) {
      alert(err.message || `Failed to execute ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const togglePaperExpand = (paperId: string) => {
    setExpandedPapers((prev) => ({ ...prev, [paperId]: !prev[paperId] }));
  };

  // Stage Handlers
  const handleSaveStage = async (payload: any) => {
    if (!patternDetail) return;
    if (editingStage) {
      await updateStage(selectedExamId, patternDetail.id, editingStage.id, payload);
    } else {
      await createStage(selectedExamId, patternDetail.id, payload);
    }
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!patternDetail) return;
    if (!confirm('Are you sure you want to delete this draft stage?')) return;
    await deleteDraftStage(selectedExamId, patternDetail.id, stageId);
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  // Paper Handlers
  const handleSavePaper = async (payload: any) => {
    if (!patternDetail) return;
    if (editingPaper) {
      await updatePaper(activePaperStageId, editingPaper.id, payload);
    } else {
      await createPaper(activePaperStageId, payload);
    }
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  const handleDeletePaper = async (stageId: string, paperId: string) => {
    if (!patternDetail) return;
    if (!confirm('Are you sure you want to delete this draft paper?')) return;
    await deleteDraftPaper(stageId, paperId);
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  // Section Handlers
  const handleSaveSection = async (payload: any) => {
    if (!patternDetail) return;
    if (editingSection) {
      await updateSection(activeSectionPaperId, editingSection.id, payload);
    } else {
      await createSection(activeSectionPaperId, payload);
    }
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  const handleDeleteSection = async (paperId: string, sectionId: string) => {
    if (!patternDetail) return;
    if (!confirm('Are you sure you want to delete this draft section?')) return;
    await deleteDraftSection(paperId, sectionId);
    loadPatternDetail(selectedExamId, patternDetail.id);
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const totals = patternDetail?.totals;
  const readiness = patternDetail?.readiness;
  const validation = (patternDetail as any)?.validation;
  const isPublished = patternDetail?.status === 'PUBLISHED';

  const activeStage = patternDetail?.stages?.find(s => s.id === activePaperStageId);
  const nextPaperOrder = (activeStage?.papers?.length || 0) + 1;

  let activePaperForSection: ExamPaper | null = null;
  patternDetail?.stages?.forEach(s => {
    const p = s.papers?.find(p => p.id === activeSectionPaperId);
    if (p) activePaperForSection = p;
  });
  const nextSectionOrder = (activePaperForSection?.sections?.length || 0) + 1;

  return (
    <div style={{ padding: '16px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', system-ui, -apple-system, 'Noto Sans Kannada', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Exam Stages Builder</h1>
            {patternDetail && (
              <span
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '12px',
                  background: patternDetail.status === 'PUBLISHED' ? '#dcfce7' : patternDetail.status === 'APPROVED' ? '#dbeafe' : '#fef9c3',
                  color: patternDetail.status === 'PUBLISHED' ? '#166534' : patternDetail.status === 'APPROVED' ? '#1e40af' : '#854d0e',
                }}
              >
                {patternDetail.status}
              </span>
            )}
          </div>
          {selectedExam && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
              <span style={{ fontWeight: 600 }}>Authority:</span> {selectedExam.programme?.authority?.code || 'N/A'}
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ fontWeight: 600 }}>Programme:</span> {selectedExam.programme?.code || 'N/A'}
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ fontWeight: 600 }}>Year:</span> {selectedExam.cycleYear || 'N/A'}
            </div>
          )}
        </div>

        {/* Workflow Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedExamId && (
            <button
              onClick={() => navigate(`/exams/syllabus?examId=${selectedExamId}`)}
              style={{
                padding: '10px 16px',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              View Exam Syllabus
            </button>
          )}

          {patternDetail && (
            <>
              {patternDetail.status === 'DRAFT' || patternDetail.status === 'CHANGES_REQUESTED' ? (
                <>
                  {patternDetail.status === 'DRAFT' && (
                    <button
                      disabled={actionLoading}
                      onClick={handleDeleteRevision}
                      style={{
                        padding: '10px 16px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      Delete Draft
                    </button>
                  )}
                  <button
                    disabled={actionLoading || !validation?.isValid}
                    onClick={() => handleWorkflowAction('submit-review')}
                    style={{
                      padding: '10px 18px',
                      background: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      opacity: actionLoading || !validation?.isValid ? 0.6 : 1,
                    }}
                  >
                    Submit for Review
                  </button>
                </>
              ) : null}

              {patternDetail.status === 'REVIEW_PENDING' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleWorkflowAction('request-changes')}
                    style={{ padding: '10px 16px', background: '#fef3c7', color: '#78350f', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Request Changes
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleWorkflowAction('approve')}
                    style={{ padding: '10px 18px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Approve Pattern
                  </button>
                </>
              )}

              {patternDetail.status === 'APPROVED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleWorkflowAction('publish')}
                  style={{ padding: '10px 18px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Publish Pattern
                </button>
              )}


            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Selectors Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
            Exam Programme
          </label>
          <select
            value={selectedExamId}
            onChange={handleExamChange}
            style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: 500 }}
          >
            <option value="" disabled>-- Select Programme --</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.programme ? `${ex.programme.code} — ${ex.programme.nameEn}` : ex.titleEn} ({ex.cycleYear})
              </option>
            ))}
          </select>
        </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
              Pattern Revision
            </label>
            <select
              value={selectedPatternId}
              onChange={handlePatternChange}
              disabled={patterns.length === 0}
              style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: patterns.length === 0 ? '#f1f5f9' : '#ffffff' }}
            >
              {patterns.length === 0 ? (
                <option value="">No Pattern Revisions Found</option>
              ) : (
                patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    Revision {p.revisionNumber} ({p.status}) {p.isCurrent ? '★ Current Active' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

      {/* Published Lock Notice Banner */}
      {isPublished && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                This Published Revision is Locked & Immutable
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
                Published exam patterns are read-only to safeguard live student & exam data. Click <strong>+ Create New Revision</strong> to clone this pattern into an editable DRAFT.
              </p>
            </div>
          </div>
          <button
            disabled={actionLoading}
            onClick={handleCloneRevision}
            style={{
              padding: '9px 16px',
              background: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Create New Revision
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading Exam Pattern...</div>
      ) : !patternDetail ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>No Exam Stages Revision</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
            There are no pattern revisions for {selectedExam?.titleEn || 'this exam'}. Create Revision 1 to start configuring stages and papers.
          </p>
          <button
            onClick={handleCreateInitialPattern}
            disabled={actionLoading}
            style={{
              padding: '10px 20px',
              background: '#084B7A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Initialize Revision 1 Pattern
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>


          {/* Validation & Readiness Panel */}
          {(!validation?.isValid || readiness?.state !== 'BOTH_COMPLETE') && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: '#78350f', fontSize: '14px', marginBottom: '8px' }}>
                ⚠️ Pattern Validation Issues ({validation?.issues?.length || 0})
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#92400e' }}>
                {validation?.issues?.map((iss: any, idx: number) => (
                  <li key={idx}><strong>{iss.code}:</strong> {iss.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Tree Builder */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Stages & Papers Hierarchy Tree</h3>
              {!isPublished && (
                <button
                  onClick={() => {
                    setEditingStage(null);
                    setIsStageModalOpen(true);
                  }}
                  style={{ padding: '8px 14px', background: '#084B7A', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  + Add Stage
                </button>
              )}
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(patternDetail.stages || []).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  No stages defined. Click <strong>+ Add Stage</strong> to start building the pattern.
                </div>
              ) : (
                (patternDetail.stages || []).map((stage) => (
                  <div key={stage.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Stage Header */}
                    <div style={{ padding: '12px 16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => toggleStageExpand(stage.id)}
                          style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b', fontWeight: 700 }}
                        >
                          {expandedStages[stage.id] ? '▼' : '▶'}
                        </button>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {stage.code}
                          </span>
                          <span style={{ marginLeft: '8px', fontWeight: 700, color: '#0f172a' }}>{stage.nameEn}</span>
                          <span style={{ marginLeft: '6px', fontSize: '12px', color: '#64748b' }}>({stage.nameKn})</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!isPublished && (
                          <>
                            <button
                              onClick={() => {
                                setActivePaperStageId(stage.id);
                                setEditingPaper(null);
                                setIsPaperModalOpen(true);
                              }}
                              style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                              + Add Paper
                            </button>
                            <button
                              onClick={() => {
                                setEditingStage(stage);
                                setIsStageModalOpen(true);
                              }}
                              style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Papers List */}
                    {expandedStages[stage.id] && (
                      <div style={{ padding: '16px 16px 16px 36px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(stage.papers || []).length === 0 ? (
                          <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                            No papers in this stage. Click <strong>+ Add Paper</strong>.
                          </div>
                        ) : (
                          (stage.papers || []).map((paper) => (
                            <div key={paper.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              {/* Paper Header */}
                              <div style={{ padding: '10px 14px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', border: '1px solid #bfdbfe' }}>
                                    {paper.code}
                                  </span>
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{paper.nameEn}</span>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>({paper.nameKn})</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {!isPublished && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActivePaperStageId(stage.id);
                                          setEditingPaper(paper);
                                          setIsPaperModalOpen(true);
                                        }}
                                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeletePaper(stage.id, paper.id)}
                                        style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Paper Details */}
                              <div style={{ padding: '10px 14px', background: '#ffffff', display: 'flex', gap: '24px', fontSize: '12px', color: '#475569' }}>
                                {paper.totalMarks != null && (
                                  <div><strong style={{ color: '#0f172a' }}>Marks:</strong> {paper.totalMarks}</div>
                                )}
                                {paper.durationMinutes != null && (
                                  <div><strong style={{ color: '#0f172a' }}>Duration:</strong> {paper.durationMinutes} mins</div>
                                )}
                                {paper.totalQuestions != null && (
                                  <div><strong style={{ color: '#0f172a' }}>Questions:</strong> {paper.totalQuestions}</div>
                                )}
                                <div><strong style={{ color: '#0f172a' }}>Mode:</strong> {paper.assessmentMode}</div>
                                <div><strong style={{ color: '#0f172a' }}>Medium:</strong> {paper.mediumRule}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StageFormModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onSave={handleSaveStage}
        stage={editingStage}
        nextOrder={(patternDetail?.stages?.length || 0) + 1}
      />

      <PaperFormModal
        isOpen={isPaperModalOpen}
        onClose={() => setIsPaperModalOpen(false)}
        onSave={handleSavePaper}
        paper={editingPaper}
        nextOrder={nextPaperOrder}
      />

      <SectionFormModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onSave={handleSaveSection}
        section={editingSection}
        nextOrder={nextSectionOrder}
      />
    </div>
  );
};
