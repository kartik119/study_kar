import React, { useState } from 'react';
import { ExamPaper } from '@study-karnataka/shared-types';

interface PaperFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  paper?: ExamPaper | null;
  nextOrder: number;
}

export const PaperFormModal: React.FC<PaperFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  paper,
  nextOrder,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: paper?.code || '',
    assessmentMode: paper?.assessmentMode || 'OBJECTIVE',
    nameEn: paper?.nameEn || '',
    nameKn: paper?.nameKn || '',
    shortNameEn: paper?.shortNameEn || '',
    shortNameKn: paper?.shortNameKn || '',
    mediumRule: paper?.mediumRule || 'BILINGUAL',
    displayOrder: paper?.displayOrder || nextOrder,
    durationMinutes: paper?.durationMinutes !== undefined && paper?.durationMinutes !== null ? String(paper.durationMinutes) : '120',
    totalQuestions: paper?.totalQuestions !== undefined && paper?.totalQuestions !== null ? String(paper.totalQuestions) : '100',
    questionsToAnswer: paper?.questionsToAnswer !== undefined && paper?.questionsToAnswer !== null ? String(paper.questionsToAnswer) : '100',
    totalMarks: paper?.totalMarks !== undefined && paper?.totalMarks !== null ? String(paper.totalMarks) : '200',
    isQualifying: paper?.isQualifying || false,
    contributesToStageMerit: paper?.contributesToStageMerit !== undefined ? paper.contributesToStageMerit : true,
    defaultNegativeMarkingType: paper?.defaultNegativeMarkingType || 'NONE',
    defaultNegativeMarkingValue: paper?.defaultNegativeMarkingValue !== undefined && paper?.defaultNegativeMarkingValue !== null ? String(paper.defaultNegativeMarkingValue) : '',
    defaultNegativeFractionNumerator: paper?.defaultNegativeFractionNumerator !== undefined && paper?.defaultNegativeFractionNumerator !== null ? String(paper.defaultNegativeFractionNumerator) : '',
    defaultNegativeFractionDenominator: paper?.defaultNegativeFractionDenominator !== undefined && paper?.defaultNegativeFractionDenominator !== null ? String(paper.defaultNegativeFractionDenominator) : '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const generateShortCode = (name: string) => {
        return name
          .toUpperCase()
          .replace(/PRELIMINARY/g, 'PRELIMS')
          .replace(/EXAMINATION/g, 'EXAM')
          .replace(/GENERAL\s*STUDIES/g, 'GS')
          .replace(/PAPER/g, 'P')
          .replace(/INTERVIEW/g, 'INT')
          .replace(/KANNADA/g, 'KAN')
          .replace(/ENGLISH/g, 'ENG')
          .replace(/COMPULSORY/g, 'COMP')
          .replace(/OPTIONAL/g, 'OPT')
          .replace(/[^A-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 20);
      };

      await onSave({
        ...formData,
        code: formData.code || generateShortCode(formData.nameEn),
        displayOrder: Number(formData.displayOrder),
        durationMinutes: formData.durationMinutes ? Number(formData.durationMinutes) : null,
        totalQuestions: formData.totalQuestions ? Number(formData.totalQuestions) : null,
        questionsToAnswer: formData.questionsToAnswer ? Number(formData.questionsToAnswer) : null,
        totalMarks: formData.totalMarks ? Number(formData.totalMarks) : null,
        defaultNegativeMarkingValue: formData.defaultNegativeMarkingValue ? Number(formData.defaultNegativeMarkingValue) : null,
        defaultNegativeFractionNumerator: formData.defaultNegativeFractionNumerator ? Number(formData.defaultNegativeFractionNumerator) : null,
        defaultNegativeFractionDenominator: formData.defaultNegativeFractionDenominator ? Number(formData.defaultNegativeFractionDenominator) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save paper');
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#ffffff', borderRadius: '16px',
    maxWidth: '750px', width: '100%',
    maxHeight: '90vh', overflowY: 'auto',
    padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid #fef3c7',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700,
    textTransform: 'uppercase', color: '#475569', marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: '14px',
    border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {paper ? 'Edit Exam Paper' : 'Add New Exam Paper'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Paper Code *</label>
              <input
                type="text"
                disabled={!!paper}
                placeholder="GS_PAPER_1"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ ...inputStyle, fontFamily: 'monospace', background: paper ? '#f1f5f9' : '#ffffff' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Mode *</label>
              <select
                value={formData.assessmentMode}
                onChange={(e) => setFormData({ ...formData, assessmentMode: e.target.value as any })}
                style={inputStyle}
              >
                <option value="OBJECTIVE">OBJECTIVE</option>
                <option value="DESCRIPTIVE">DESCRIPTIVE</option>
                <option value="INTERVIEW">INTERVIEW</option>
                <option value="PRACTICAL">PRACTICAL</option>
                <option value="SKILL">SKILL</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Medium</label>
              <select
                value={formData.mediumRule}
                onChange={(e) => setFormData({ ...formData, mediumRule: e.target.value as any })}
                style={inputStyle}
              >
                <option value="BILINGUAL">BILINGUAL</option>
                <option value="KANNADA">KANNADA</option>
                <option value="ENGLISH">ENGLISH</option>
                <option value="CANDIDATE_CHOICE">CANDIDATE_CHOICE</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Order *</label>
              <input
                type="number"
                required
                min={1}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>English Paper Name *</label>
              <input
                type="text"
                required
                placeholder="General Studies Paper I"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Kannada Paper Name *</label>
              <input
                type="text"
                required
                placeholder="ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I"
                value={formData.nameKn}
                onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Marks, Duration, and Questions Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Total Marks</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 200"
                value={formData.totalMarks}
                onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (Minutes)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 120"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Total Questions</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 100"
                value={formData.totalQuestions}
                onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#084B7A', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : paper ? 'Update Paper' : 'Create Paper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
