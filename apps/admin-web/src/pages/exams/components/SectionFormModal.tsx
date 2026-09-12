import React, { useState } from 'react';
import { ExamPaperSection } from '@study-karnataka/shared-types';

interface SectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  section?: ExamPaperSection | null;
  nextOrder: number;
}

export const SectionFormModal: React.FC<SectionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  section,
  nextOrder,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: section?.code || '',
    questionFormat: section?.questionFormat || 'MCQ_SINGLE_CORRECT',
    nameEn: section?.nameEn || '',
    nameKn: section?.nameKn || '',
    descriptionEn: section?.descriptionEn || '',
    descriptionKn: section?.descriptionKn || '',
    displayOrder: section?.displayOrder || nextOrder,
    totalQuestions: section?.totalQuestions !== undefined && section?.totalQuestions !== null ? String(section.totalQuestions) : '50',
    questionsToAnswer: section?.questionsToAnswer !== undefined && section?.questionsToAnswer !== null ? String(section.questionsToAnswer) : '50',
    marksPerQuestion: section?.marksPerQuestion !== undefined && section?.marksPerQuestion !== null ? String(section.marksPerQuestion) : '2',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedMarks = (Number(formData.questionsToAnswer) || 0) * (Number(formData.marksPerQuestion) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave({
        ...formData,
        code: formData.code || formData.nameEn.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 30),
        displayOrder: Number(formData.displayOrder),
        totalQuestions: Number(formData.totalQuestions),
        questionsToAnswer: Number(formData.questionsToAnswer),
        marksPerQuestion: Number(formData.marksPerQuestion),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save section');
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
    maxWidth: '650px', width: '100%',
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
            {section ? 'Edit Paper Section' : 'Add New Paper Section'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'none' }}>
              <label style={labelStyle}>Section Code *</label>
              <input
                type="text"
                disabled={!!section}
                placeholder="SEC_A"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ ...inputStyle, fontFamily: 'monospace', background: section ? '#f1f5f9' : '#ffffff' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Question Format *</label>
              <select
                value={formData.questionFormat}
                onChange={(e) => setFormData({ ...formData, questionFormat: e.target.value as any })}
                style={inputStyle}
              >
                <option value="MCQ_SINGLE_CORRECT">MCQ_SINGLE_CORRECT</option>
                <option value="MCQ_MULTIPLE_CORRECT">MCQ_MULTIPLE_CORRECT</option>
                <option value="TRUE_FALSE">TRUE_FALSE</option>
                <option value="MATCHING">MATCHING</option>
                <option value="SHORT_ANSWER">SHORT_ANSWER</option>
                <option value="LONG_ANSWER">LONG_ANSWER</option>
                <option value="ESSAY">ESSAY</option>
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
              <label style={labelStyle}>English Section Name *</label>
              <input
                type="text"
                required
                placeholder="Current Affairs & History"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Kannada Section Name *</label>
              <input
                type="text"
                required
                placeholder="ಪ್ರಸ್ತುತ ಘಟನೆಗಳು ಮತ್ತು ಇತಿಹಾಸ"
                value={formData.nameKn}
                onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ ...labelStyle, color: '#1e40af' }}>Total Qs *</label>
              <input type="number" required min={1} value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#1e40af' }}>To Answer *</label>
              <input type="number" required min={1} value={formData.questionsToAnswer} onChange={(e) => setFormData({ ...formData, questionsToAnswer: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#1e40af' }}>Marks/Q *</label>
              <input type="number" required step="0.01" min={0.1} value={formData.marksPerQuestion} onChange={(e) => setFormData({ ...formData, marksPerQuestion: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#1e3a8a' }}>Calculated Total</label>
              <input type="text" readOnly disabled value={calculatedMarks} style={{ ...inputStyle, background: '#dbeafe', border: '1px solid #93c5fd', fontWeight: 700, color: '#1e3a8a', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#084B7A', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : section ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
