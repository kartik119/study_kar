import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExams } from '../../services/examApi';
import { fetchPatterns, reorderStages, deleteDraftStage, createStage, updateStage, createPattern } from '../../services/examPatternApi';
import { ExamCycle, ExamPattern, ExamStage } from '@study-karnataka/shared-types';
import { StageFormModal } from './components/StageFormModal';

export const ExamStagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamCycle[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<ExamPattern | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<ExamStage | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchExams();
      setExams(data);
      if (data.length > 0) {
        setSelectedExamId(data[0].id);
        loadPatterns(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exams');
      setLoading(false);
    }
  };

  const loadPatterns = async (examId: string) => {
    try {
      setLoading(true);
      const data = await fetchPatterns(examId);
      setPatterns(data);
      if (data.length > 0) {
        const currentOrLatest = data.find((p) => p.isCurrent) || data[0];
        setSelectedPatternId(currentOrLatest.id);
        setSelectedPattern(currentOrLatest);
      } else {
        setSelectedPatternId('');
        setSelectedPattern(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const examId = e.target.value;
    setSelectedExamId(examId);
    loadPatterns(examId);
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPatternId(pId);
    const found = patterns.find((p) => p.id === pId) || null;
    setSelectedPattern(found);
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

  const handleMoveStage = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedPattern || !selectedPattern.stages) return;
    const stages = [...selectedPattern.stages];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    const orderedIds = stages.map((s) => s.id);
    try {
      await reorderStages(selectedExamId, selectedPattern.id, orderedIds);
      loadPatterns(selectedExamId);
    } catch (err: any) {
      alert(err.message || 'Failed to reorder stages');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPattern) return;
    if (!confirm('Are you sure you want to delete this draft stage?')) return;
    try {
      await deleteDraftStage(selectedExamId, selectedPattern.id, stageId);
      loadPatterns(selectedExamId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete stage');
    }
  };

  const handleSaveStage = async (payload: any) => {
    if (!selectedPattern) return;
    if (editingStage) {
      await updateStage(selectedExamId, selectedPattern.id, editingStage.id, payload);
    } else {
      await createStage(selectedExamId, selectedPattern.id, payload);
    }
    loadPatterns(selectedExamId);
  };

  const stages = selectedPattern?.stages || [];
  const isPublished = selectedPattern?.status === 'PUBLISHED';
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>Exam Stages</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Configure academic stages (Prelims, Mains, Interview) for exam patterns</p>
        </div>

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

          {selectedPattern && !isPublished && (
            <button
              onClick={() => {
                setEditingStage(null);
                setIsModalOpen(true);
              }}
              style={{
                padding: '10px 18px',
                background: '#084B7A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add Stage
            </button>
          )}
        </div>
      </div>

      {/* Selectors Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
            Select Exam Cycle
          </label>
          <select
            value={selectedExamId}
            onChange={handleExamChange}
            style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.titleEn} ({ex.cycleYear})
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
            style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: patterns.length === 0 ? '#f1f5f9' : '#ffffff' }}
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
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🔒</span>
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#166534' }}>
              This Published Revision is Locked & Immutable
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
              Published exam pattern stages are read-only. Switch to an active DRAFT revision or create a new revision in the Exam Pattern Builder to edit stages.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading Exam Stages...</div>
      ) : error ? (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px' }}>{error}</div>
      ) : !selectedPattern ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>No Exam Pattern Found</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
            Create an initial Exam Pattern revision for {selectedExam?.titleEn || 'this exam'} to start configuring Stages.
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
            Create Exam Pattern
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pattern Revision {selectedPattern.revisionNumber}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#78350f' }}>{selectedPattern.titleEn}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    background: selectedPattern.status === 'PUBLISHED' ? '#dcfce7' : selectedPattern.status === 'APPROVED' ? '#dbeafe' : '#fef9c3',
                    color: selectedPattern.status === 'PUBLISHED' ? '#166534' : selectedPattern.status === 'APPROVED' ? '#1e40af' : '#854d0e',
                  }}
                >
                  {selectedPattern.status}
                </span>
                {selectedPattern.isCurrent && (
                  <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '12px', background: '#f3e8ff', color: '#6b21a8' }}>
                    Current Active
                  </span>
                )}
              </div>
            </div>

            {stages.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                No stages added yet to Revision {selectedPattern.revisionNumber}.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', width: '60px' }}>Order</th>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>English Name</th>
                    <th style={{ padding: '12px 16px' }}>Kannada Name</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Papers</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage, idx) => (
                    <tr key={stage.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b' }}>{stage.displayOrder}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{stage.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{stage.nameEn}</td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{stage.nameKn}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, background: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>
                          {stage.stageType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {stage.papers?.length || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {!isPublished && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveStage(idx, 'UP')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: idx === 0 ? '#cbd5e1' : '#475569', fontWeight: 'bold' }}
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === stages.length - 1}
                              onClick={() => handleMoveStage(idx, 'DOWN')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: idx === stages.length - 1 ? '#cbd5e1' : '#475569', fontWeight: 'bold' }}
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => {
                                setEditingStage(stage);
                                setIsModalOpen(true);
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: '13px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 600, fontSize: '13px' }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Stage Form Modal */}
      <StageFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStage}
        stage={editingStage}
        nextOrder={stages.length + 1}
      />
    </div>
  );
};
