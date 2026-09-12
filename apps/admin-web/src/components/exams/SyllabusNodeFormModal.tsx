import React, { useState, useEffect } from 'react';
import {
  ExamSyllabusNode,
  ExamSyllabusNodeType,
  ExamSyllabusScopeType,
  ExamStage,
  ExamPaper,
} from '@study-karnataka/shared-types';
import { CreateNodePayload } from '../../services/examSyllabusApi';
import {
  Drawer,
  FormField,
  Input,
  Select,
  Textarea,
  Switch,
  Button,
  Badge,
} from '@study-karnataka/ui';
import '../../pages/exams/ExamSyllabusPage.css';

interface SyllabusNodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateNodePayload) => Promise<void>;
  initialData?: ExamSyllabusNode | null;
  parentId?: string | null;
  parentNode?: ExamSyllabusNode | null;
  stages?: ExamStage[];
  papers?: ExamPaper[];
  isSubmitting?: boolean;
}

const nodeTypeOptions = [
  { label: 'Subject', value: 'SUBJECT' },
  { label: 'Section', value: 'SECTION' },
  { label: 'Unit', value: 'UNIT' },
  { label: 'Topic', value: 'TOPIC' },
  { label: 'Subtopic', value: 'SUBTOPIC' },
  { label: 'Knowledge Area', value: 'KNOWLEDGE_AREA' },
  { label: 'Theme', value: 'THEME' },
  { label: 'Other', value: 'OTHER' },
];

const scopeTypeOptions = [
  { label: 'Global (Entire Exam)', value: 'GLOBAL' },
  { label: 'Stage Scope (Specific Stage)', value: 'STAGE' },
  { label: 'Paper Scope (Specific Paper)', value: 'PAPER' },
];

export const SyllabusNodeFormModal: React.FC<SyllabusNodeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  parentId,
  parentNode,
  stages = [],
  papers = [],
  isSubmitting = false,
}) => {
  const [code, setCode] = useState('');
  const [nodeType, setNodeType] = useState<ExamSyllabusNodeType>('SUBJECT');
  const [scopeType, setScopeType] = useState<ExamSyllabusScopeType>('GLOBAL');
  const [examStageId, setExamStageId] = useState<string>('');
  const [examPaperId, setExamPaperId] = useState<string>('');
  const [nameEn, setNameEn] = useState('');
  const [nameKn, setNameKn] = useState('');
  const [shortNameEn, setShortNameEn] = useState('');
  const [shortNameKn, setShortNameKn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionKn, setDescriptionKn] = useState('');
  const [officialTextEn, setOfficialTextEn] = useState('');
  const [officialTextKn, setOfficialTextKn] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Field level validation errors
  const [codeError, setCodeError] = useState<string | undefined>();
  const [nameEnError, setNameEnError] = useState<string | undefined>();
  const [nameKnError, setNameKnError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setNodeType(initialData.nodeType);
      setScopeType(initialData.scopeType || 'GLOBAL');
      setExamStageId(initialData.examStageId || '');
      setExamPaperId(initialData.examPaperId || '');
      setNameEn(initialData.nameEn);
      setNameKn(initialData.nameKn);
      setShortNameEn(initialData.shortNameEn || '');
      setShortNameKn(initialData.shortNameKn || '');
      setDescriptionEn(initialData.descriptionEn || '');
      setDescriptionKn(initialData.descriptionKn || '');
      setOfficialTextEn(initialData.officialTextEn || '');
      setOfficialTextKn(initialData.officialTextKn || '');
      setSourceReference(initialData.sourceReference || '');
      setDisplayOrder(initialData.displayOrder || 1);
      setIsActive(initialData.isActive);
    } else {
      setCode('');
      setNodeType(parentId ? 'UNIT' : 'SUBJECT');
      setScopeType('GLOBAL');
      setExamStageId('');
      setExamPaperId('');
      setNameEn('');
      setNameKn('');
      setShortNameEn('');
      setShortNameKn('');
      setDescriptionEn('');
      setDescriptionKn('');
      setOfficialTextEn('');
      setOfficialTextKn('');
      setSourceReference('');
      setDisplayOrder(1);
      setIsActive(true);
    }
    setCodeError(undefined);
    setNameEnError(undefined);
    setNameKnError(undefined);
    setFormError(null);
  }, [initialData, parentId, isOpen]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toUpperCase().replace(/\s+/g, '_');
    setCode(sanitized);
    if (sanitized.trim()) setCodeError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    if (!code.trim()) {
      setCodeError('Node Code is required.');
      hasError = true;
    }
    if (!nameEn.trim()) {
      setNameEnError('English Node Name is required.');
      hasError = true;
    }
    if (!nameKn.trim()) {
      setNameKnError('Kannada Node Name is required.');
      hasError = true;
    }

    if (hasError) return;

    try {
      const payload: CreateNodePayload = {
        parentId: initialData ? initialData.parentId : parentId || null,
        code: code.trim().toUpperCase().replace(/\s+/g, '_'),
        nodeType,
        scopeType,
        examStageId: scopeType === 'STAGE' ? examStageId || null : null,
        examPaperId: scopeType === 'PAPER' ? examPaperId || null : null,
        nameEn: nameEn.trim(),
        nameKn: nameKn.trim(),
        shortNameEn: shortNameEn.trim() || undefined,
        shortNameKn: shortNameKn.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionKn: descriptionKn.trim() || undefined,
        officialTextEn: officialTextEn.trim() || undefined,
        officialTextKn: officialTextKn.trim() || undefined,
        sourceReference: sourceReference.trim() || undefined,
        displayOrder,
        isActive,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Failed to save node';
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }
      setFormError(msg);
    }
  };

  const stageOptions = [
    { label: '-- Select Stage --', value: '' },
    ...stages.map((st) => ({ label: `${st.nameEn} (${st.code})`, value: st.id })),
  ];

  const paperOptions = [
    { label: '-- Select Paper --', value: '' },
    ...papers.map((p) => ({ label: `${p.nameEn} (${p.code})`, value: p.id })),
  ];

  const drawerTitle = initialData
    ? 'Edit Syllabus Node'
    : parentId
    ? 'Add Child Syllabus Node'
    : 'Add Root Subject Node';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={drawerTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '48px' }}>
        {/* Parent Node Header Card */}
        {parentNode && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#EAF3F9',
              border: '1px solid rgba(8, 75, 122, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Parent Node
              </span>
              <Badge label={parentNode.nodeType} variant="info" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{parentNode.nameEn}</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
              {parentNode.nameKn}
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {formError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '12px',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION A: BASIC DETAILS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '18px 20px',
              borderRadius: '12px',
              border: '1px solid #DCE6EE',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
              Section A: Basic Node Identifiers & Scope
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <FormField
                label="Node Code"
                required
                error={codeError}
                helperText="Spaces automatically convert to underscores (_)"
              >
                <Input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="e.g. HIST_KAR_MODERN"
                  style={{ fontFamily: 'monospace', height: '44px' }}
                  error={Boolean(codeError)}
                />
              </FormField>

              <FormField label="Node Type" required>
                <Select
                  options={nodeTypeOptions}
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value as ExamSyllabusNodeType)}
                  style={{ height: '44px' }}
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <FormField label="Scope Type" required>
                <Select
                  options={scopeTypeOptions}
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as ExamSyllabusScopeType)}
                  style={{ height: '44px' }}
                />
              </FormField>

              {scopeType === 'STAGE' && (
                <FormField label="Target Exam Stage" required>
                  <Select
                    options={stageOptions}
                    value={examStageId}
                    onChange={(e) => setExamStageId(e.target.value)}
                    style={{ height: '44px' }}
                  />
                </FormField>
              )}

              {scopeType === 'PAPER' && (
                <FormField label="Target Exam Paper" required>
                  <Select
                    options={paperOptions}
                    value={examPaperId}
                    onChange={(e) => setExamPaperId(e.target.value)}
                    style={{ height: '44px' }}
                  />
                </FormField>
              )}
            </div>
          </div>

          {/* SECTION B: ENGLISH CONTENT */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '18px 20px',
              borderRadius: '12px',
              border: '1px solid #DCE6EE',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
              Section B: English Content
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <FormField label="English Name" required error={nameEnError}>
                <Input
                  type="text"
                  value={nameEn}
                  onChange={(e) => {
                    setNameEn(e.target.value);
                    if (e.target.value.trim()) setNameEnError(undefined);
                  }}
                  placeholder="e.g. Modern History of Karnataka"
                  style={{ height: '44px' }}
                  error={Boolean(nameEnError)}
                />
              </FormField>

              <FormField label="English Short Name (Optional)">
                <Input
                  type="text"
                  value={shortNameEn}
                  onChange={(e) => setShortNameEn(e.target.value)}
                  placeholder="e.g. Kar History"
                  style={{ height: '44px' }}
                />
              </FormField>
            </div>

            <FormField label="English Description (Optional)">
              <Textarea
                rows={3}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Enter detailed English syllabus description..."
                style={{ minHeight: '100px' }}
              />
            </FormField>

            <FormField label="English Official Text (Optional)">
              <Textarea
                rows={2}
                value={officialTextEn}
                onChange={(e) => setOfficialTextEn(e.target.value)}
                placeholder="Enter official gazette or notification text..."
                style={{ minHeight: '80px' }}
              />
            </FormField>
          </div>

          {/* SECTION C: KANNADA CONTENT */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '18px 20px',
              borderRadius: '12px',
              border: '1px solid #DCE6EE',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
              Section C: Kannada Content (ಕನ್ನಡ ವಿಷಯ)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <FormField label="Kannada Name" required error={nameKnError}>
                <Input
                  type="text"
                  value={nameKn}
                  onChange={(e) => {
                    setNameKn(e.target.value);
                    if (e.target.value.trim()) setNameKnError(undefined);
                  }}
                  placeholder="ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ"
                  style={{ height: '44px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                  error={Boolean(nameKnError)}
                />
              </FormField>

              <FormField label="Kannada Short Name (Optional)">
                <Input
                  type="text"
                  value={shortNameKn}
                  onChange={(e) => setShortNameKn(e.target.value)}
                  placeholder="ಉದಾ. ಕರ್ನಾ ಇತಿಹಾಸ"
                  style={{ height: '44px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                />
              </FormField>
            </div>

            <FormField label="Kannada Description (Optional)">
              <Textarea
                rows={3}
                value={descriptionKn}
                onChange={(e) => setDescriptionKn(e.target.value)}
                placeholder="ವಿವರವಾದ ಕನ್ನಡ ಪಠ್ಯಕ್ರಮ ವಿವರಣೆಯನ್ನು ನಮೂದಿಸಿ..."
                style={{ minHeight: '100px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </FormField>

            <FormField label="Kannada Official Text (Optional)">
              <Textarea
                rows={2}
                value={officialTextKn}
                onChange={(e) => setOfficialTextKn(e.target.value)}
                placeholder="ಅಧಿಕೃತ ಗೆಜೆಟ್ ಅಥವಾ ಅಧಿಸೂಚನೆ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ..."
                style={{ minHeight: '80px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </FormField>
          </div>

          {/* SECTION D: SOURCE & ORDERING */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '18px 20px',
              borderRadius: '12px',
              border: '1px solid #DCE6EE',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#084B7A', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
              Section D: Source Reference & Ordering
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <FormField label="Source Reference (Optional)">
                <Input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. KPSC 2026 Notification Section 4.2"
                  style={{ height: '44px' }}
                />
              </FormField>

              <FormField label="Display Order">
                <Input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  style={{ height: '44px' }}
                />
              </FormField>
            </div>

            {/* Styled Switch for Active Status */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
              <Switch
                checked={isActive}
                onChange={(checked) => setIsActive(checked)}
                label="Active Node"
              />
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', paddingLeft: '50px' }}>
                Inactive nodes remain available to administrators but are excluded from public syllabus output.
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #DCE6EE' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update Node' : 'Create Node'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  );
};

export default SyllabusNodeFormModal;
