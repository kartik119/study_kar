import React, { useState } from 'react';
import { ExamStage } from '@study-karnataka/shared-types';

interface StageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  stage?: ExamStage | null;
  nextOrder: number;
}

export const StageFormModal: React.FC<StageFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  stage,
  nextOrder,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: stage?.code || '',
    stageType: stage?.stageType || 'PRELIMINARY',
    nameEn: stage?.nameEn || '',
    nameKn: stage?.nameKn || '',
    shortNameEn: stage?.shortNameEn || '',
    shortNameKn: stage?.shortNameKn || '',
    descriptionEn: stage?.descriptionEn || '',
    descriptionKn: stage?.descriptionKn || '',
    instructionsEn: stage?.instructionsEn || '',
    instructionsKn: stage?.instructionsKn || '',
    displayOrder: stage?.displayOrder || nextOrder,
    isQualifying: stage?.isQualifying || false,
    contributesToFinalMerit: stage?.contributesToFinalMerit !== undefined ? stage.contributesToFinalMerit : true,
    qualificationRuleType: stage?.qualificationRuleType || 'NONE',
    qualificationValue: stage?.qualificationValue !== undefined && stage?.qualificationValue !== null ? String(stage.qualificationValue) : '',
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
          .replace(/PHYSICAL/g, 'PHYS')
          .replace(/DOCUMENT\s*VERIFICATION/g, 'DV')
          .replace(/MEDICAL/g, 'MED')
          .replace(/[^A-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 20);
      };

      await onSave({
        ...formData,
        code: formData.code || generateShortCode(formData.nameEn),
        displayOrder: Number(formData.displayOrder),
        qualificationValue: formData.qualificationValue ? Number(formData.qualificationValue) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '680px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid #fef3c7',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {stage ? 'Edit Exam Stage' : 'Add New Exam Stage'}
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
            <div>
              <label style={labelStyle}>Stage Code *</label>
              <input
                type="text"
                disabled={!!stage}
                placeholder="PRELIMS"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                style={{ ...inputStyle, fontFamily: 'monospace', background: stage ? '#f1f5f9' : '#ffffff' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Stage Type *</label>
              <select
                value={formData.stageType}
                onChange={(e) => setFormData({ ...formData, stageType: e.target.value as any })}
                style={inputStyle}
              >
                <option value="PRELIMINARY">PRELIMINARY</option>
                <option value="MAIN">MAIN</option>
                <option value="INTERVIEW">INTERVIEW</option>
                <option value="PHYSICAL_TEST">PHYSICAL_TEST</option>
                <option value="SKILL_TEST">SKILL_TEST</option>
                <option value="PRACTICAL_TEST">PRACTICAL_TEST</option>
                <option value="DOCUMENT_VERIFICATION">DOCUMENT_VERIFICATION</option>
                <option value="MEDICAL_TEST">MEDICAL_TEST</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Display Order *</label>
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
              <label style={labelStyle}>English Stage Name *</label>
              <input
                type="text"
                required
                placeholder="Preliminary Examination"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Kannada Stage Name *</label>
              <input
                type="text"
                required
                placeholder="ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ"
                value={formData.nameKn}
                onChange={(e) => setFormData({ ...formData, nameKn: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '9px 20px', background: '#084B7A', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : stage ? 'Update Stage' : 'Create Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
