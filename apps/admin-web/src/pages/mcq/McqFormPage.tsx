import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Archive,
  XCircle,
  HelpCircle,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  CreateMcqQuestionPayload,
  McqDifficulty,
  CorrectOption,
  McqWorkflowStatus,
  McqSourceType,
  AcademicCategory,
  AcademicSubcategory,
  McqDuplicateWarning,
  McqQuestion,
} from '@study-karnataka/shared-types';
import {
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  Card,
  Badge,
  StatusBadge,
  FormField,
} from '@study-karnataka/ui';
import { mcqLibraryApi } from '../../api/mcq-library.api';
import { AcademicTaxonomyApi } from '../../api/academic-taxonomy.api';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { McqPreviewModal } from './McqPreviewModal';

export const McqFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<McqDuplicateWarning[]>([]);

  // Preview Modal
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Responsive Screen Width state for Desktop vs Mobile/Tablet Layout
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  // Mobile/Tablet Language Tab Switcher
  const [mobileLangTab, setMobileLangTab] = useState<'en' | 'kn'>('en');

  // Rich Content Editor toggles for Options
  const [richOptionsEn, setRichOptionsEn] = useState<boolean>(false);
  const [richOptionsKn, setRichOptionsKn] = useState<boolean>(false);

  // Collapsible Sections in Shared Card
  const [isExamSectionOpen, setIsExamSectionOpen] = useState<boolean>(false);
  const [isSourceSectionOpen, setIsSourceSectionOpen] = useState<boolean>(false);
  const [isCatSubOpen, setIsCatSubOpen] = useState<boolean>(true); // Default open in the new UI
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [taxonomySearchQuery, setTaxonomySearchQuery] = useState('');

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Single-select: selecting a category clears any previous selection and sets categoryId only
  const handleToggleCategory = (catId: string, currentlyChecked: boolean) => {
    if (currentlyChecked) {
      setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', topicId: '', knowledgeAreaId: '' }));
    } else {
      setFormData(prev => ({ ...prev, categoryId: catId, subcategoryId: '', topicId: '', knowledgeAreaId: '' }));
      setExpandedCategories(prev => ({ ...prev, [catId]: true }));
    }
  };

  // Single-select: selecting a subcategory replaces any previous category/sub selection
  const handleToggleSubcategory = (catId: string, subId: string, currentlyChecked: boolean) => {
    if (currentlyChecked) {
      setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', topicId: '', knowledgeAreaId: '' }));
    } else {
      setFormData(prev => ({ ...prev, categoryId: catId, subcategoryId: subId, topicId: '', knowledgeAreaId: '' }));
    }
  };

  // Taxonomy Master Data
  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, AcademicSubcategory[]>>({});

  // Form State initialized with realistic bilingual sample content for new creation
  const [codeDisplay, setCodeDisplay] = useState<string>('Auto-generating...');
  const [statusDisplay, setStatusDisplay] = useState<McqWorkflowStatus>('DRAFT');
  const [formData, setFormData] = useState<CreateMcqQuestionPayload>({
    questionTextEn: '',
    questionTextKn: '',
    optionA_En: '',
    optionA_Kn: '',
    optionB_En: '',
    optionB_Kn: '',
    optionC_En: '',
    optionC_Kn: '',
    optionD_En: '',
    optionD_Kn: '',
    correctOption: 'A',
    explanationEn: '',
    explanationKn: '',
    difficulty: 'MEDIUM',
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    status: 'DRAFT',
    categoryId: '',
    subcategoryId: '',
    topicId: '',
    knowledgeAreaId: '',
    sourceType: 'ORIGINAL',
    sourceName: '',
    sourceUrl: '',
    isPyq: false,
    pyqExamName: '',
    pyqYear: undefined,
    pyqPaperStage: '',
    pyqQuestionNumber: '',
    pyqNotes: '',
  });

  // Auto-enable rich options if any option content contains HTML formatting
  useEffect(() => {
    if (
      formData.optionA_En?.includes('<') ||
      formData.optionB_En?.includes('<') ||
      formData.optionC_En?.includes('<') ||
      formData.optionD_En?.includes('<')
    ) {
      setRichOptionsEn(true);
    }
    if (
      formData.optionA_Kn?.includes('<') ||
      formData.optionB_Kn?.includes('<') ||
      formData.optionC_Kn?.includes('<') ||
      formData.optionD_Kn?.includes('<')
    ) {
      setRichOptionsKn(true);
    }
  }, [formData.optionA_En, formData.optionB_En, formData.optionC_En, formData.optionD_En, formData.optionA_Kn, formData.optionB_Kn, formData.optionC_Kn, formData.optionD_Kn]);

  // Track window resize to toggle true desktop vs mobile/tablet tabs cleanly
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1200;

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load Categories & Subcategories
      const catData = await AcademicTaxonomyApi.getCategories({ moduleType: 'MCQ' });
      let cats: AcademicCategory[] = [];
      if (Array.isArray(catData)) cats = catData;
      setCategories(cats);

      const subMap: Record<string, AcademicSubcategory[]> = {};
      for (const c of cats) {
        try {
          const subs = await AcademicTaxonomyApi.getSubcategories(c.id);
          if (Array.isArray(subs)) subMap[c.id] = subs;
        } catch {
          subMap[c.id] = [];
        }
      }
      setSubcategoriesMap(subMap);

      if (isEditMode && id) {
        // Load Existing Question
        const res = await mcqLibraryApi.getQuestionById(id);
        if (res.data) {
          const q = res.data;
          setCodeDisplay(q.code);
          setStatusDisplay(q.status);
          setFormData({
            questionTextEn: q.questionTextEn || '',
            questionTextKn: q.questionTextKn || '',
            optionA_En: q.optionA_En || '',
            optionA_Kn: q.optionA_Kn || '',
            optionB_En: q.optionB_En || '',
            optionB_Kn: q.optionB_Kn || '',
            optionC_En: q.optionC_En || '',
            optionC_Kn: q.optionC_Kn || '',
            optionD_En: q.optionD_En || '',
            optionD_Kn: q.optionD_Kn || '',
            correctOption: q.correctOption || 'A',
            explanationEn: q.explanationEn || '',
            explanationKn: q.explanationKn || '',
            difficulty: q.difficulty || 'MEDIUM',
            positiveMarks: Number(q.positiveMarks) || 1.0,
            negativeMarks: Number(q.negativeMarks) || 0.25,
            status: q.status || 'DRAFT',
            categoryId: q.categoryId || '',
            subcategoryId: q.subcategoryId || '',
            topicId: q.topicId || '',
            knowledgeAreaId: q.knowledgeAreaId || '',
            examCycleId: q.examCycleId || '',
            syllabusNodeId: q.syllabusNodeId || '',
            sourceType: q.sourceType || 'ORIGINAL',
            sourceName: q.sourceName || '',
            sourceUrl: q.sourceUrl || '',
            isPyq: q.isPyq || false,
            pyqExamName: q.pyqExamName || '',
            pyqYear: q.pyqYear || undefined,
            pyqPaperStage: q.pyqPaperStage || '',
            pyqQuestionNumber: q.pyqQuestionNumber || '',
            pyqNotes: q.pyqNotes || '',
          });

          if (q.duplicateWarnings) {
            setDuplicateWarnings(q.duplicateWarnings);
          }
        }
      } else {
        // Create Mode — Fetch next sequential MCQ ID code preview
        try {
          const codeRes = await mcqLibraryApi.getNextCode();
          if (codeRes.data?.code) {
            setCodeDisplay(codeRes.data.code);
          }
        } catch {
          setCodeDisplay('MCQ_AUTO');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize MCQ form');
    } finally {
      setLoading(false);
    }
  };

  const handleMergedCategorySubcategoryChange = (combinedValue: string) => {
    if (!combinedValue) {
      setFormData((p) => ({ ...p, categoryId: '', subcategoryId: '', topicId: '', knowledgeAreaId: '' }));
      return;
    }

    if (combinedValue.startsWith('sub:')) {
      const parts = combinedValue.split(':');
      const subId = parts[1];
      const catId = parts[2];
      setFormData((p) => ({ ...p, categoryId: catId, subcategoryId: subId, topicId: '', knowledgeAreaId: '' }));
    } else if (combinedValue.startsWith('cat:')) {
      const catId = combinedValue.replace('cat:', '');
      setFormData((p) => ({ ...p, categoryId: catId, subcategoryId: '', topicId: '', knowledgeAreaId: '' }));
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData, status: 'DRAFT' as McqWorkflowStatus };
      if (isEditMode && id) {
        await mcqLibraryApi.updateQuestion(id, payload);
      } else {
        await mcqLibraryApi.createQuestion(payload);
      }
      alert('Draft saved successfully!');
      navigate('/mcq-library');
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let qId = id;
      if (!isEditMode) {
        const createRes = await mcqLibraryApi.createQuestion({ ...formData, status: 'DRAFT' });
        if (!createRes.data) throw new Error('Failed to create question');
        qId = createRes.data.id;
      } else {
        await mcqLibraryApi.updateQuestion(id!, formData);
      }

      await mcqLibraryApi.submitReview(qId!);
      alert('Question submitted for editorial review!');
      navigate('/mcq-library');
    } catch (err: any) {
      setError(err.message || 'Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await mcqLibraryApi.updateQuestion(id, formData);
      await mcqLibraryApi.approveQuestion(id);
      alert('MCQ Question Approved and test-eligible!');
      navigate('/mcq-library');
    } catch (err: any) {
      setError(err.message || 'Failed to approve question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await mcqLibraryApi.requestChanges(id);
      alert('Changes requested from author.');
      navigate('/mcq-library');
    } catch (err: any) {
      setError(err.message || 'Failed to request changes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to archive this MCQ?')) return;
    setSubmitting(true);
    try {
      await mcqLibraryApi.archiveQuestion(id);
      navigate('/mcq-library');
    } catch (err: any) {
      setError(err.message || 'Failed to archive question');
    } finally {
      setSubmitting(false);
    }
  };

  // Language Readiness Calculations (strictly language completeness)
  const isEnStemValid = Boolean(formData.questionTextEn?.trim());
  const isKnStemValid = Boolean(formData.questionTextKn?.trim());
  const isEnOptsValid = Boolean(
    formData.optionA_En?.trim() &&
    formData.optionB_En?.trim() &&
    formData.optionC_En?.trim() &&
    formData.optionD_En?.trim()
  );
  const isKnOptsValid = Boolean(
    formData.optionA_Kn?.trim() &&
    formData.optionB_Kn?.trim() &&
    formData.optionC_Kn?.trim() &&
    formData.optionD_Kn?.trim()
  );
  const isEnExplanationValid = Boolean(formData.explanationEn?.trim());
  const isKnExplanationValid = Boolean(formData.explanationKn?.trim());

  const isEnComplete = isEnStemValid && isEnOptsValid && isEnExplanationValid;
  const isKnComplete = isKnStemValid && isKnOptsValid && isKnExplanationValid;
  const isBilingualReady = isEnComplete && isKnComplete;

  // Approval Eligibility Check
  const missingApprovalFields: string[] = [];
  if (!isBilingualReady) missingApprovalFields.push('BILINGUAL_CONTENT');
  if (!formData.correctOption) missingApprovalFields.push('CORRECT_ANSWER');
  if (!formData.categoryId) missingApprovalFields.push('CATEGORY');
  if (!formData.subcategoryId) missingApprovalFields.push('SUBCATEGORY');
  if (!formData.difficulty) missingApprovalFields.push('DIFFICULTY');

  const isApprovalEligible = missingApprovalFields.length === 0;

  // Merged Category Options
  const mergedCatSubOptions = [
    { label: '-- Select Category & Subcategory --', value: '' },
    ...categories.flatMap((cat) => [
      { label: `📁 ${cat.nameEn} (All Category)`, value: `cat:${cat.id}` },
      ...(subcategoriesMap[cat.id] || []).map((sub) => ({
        label: `   └ ${cat.nameEn} › ${sub.nameEn}`,
        value: `sub:${sub.id}:${cat.id}`,
      })),
    ]),
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Loading MCQ Authoring Form...
      </div>
    );
  }

  // Construct Mock Question object for Preview Modal
  const previewQuestionObj: McqQuestion = {
    id: id || 'preview-id',
    code: codeDisplay,
    seqNumber: 1,
    questionTextEn: formData.questionTextEn || '',
    questionTextKn: formData.questionTextKn || '',
    optionA_En: formData.optionA_En || '',
    optionA_Kn: formData.optionA_Kn || '',
    optionB_En: formData.optionB_En || '',
    optionB_Kn: formData.optionB_Kn || '',
    optionC_En: formData.optionC_En || '',
    optionC_Kn: formData.optionC_Kn || '',
    optionD_En: formData.optionD_En || '',
    optionD_Kn: formData.optionD_Kn || '',
    correctOption: formData.correctOption || 'A',
    explanationEn: formData.explanationEn || '',
    explanationKn: formData.explanationKn || '',
    difficulty: formData.difficulty || 'MEDIUM',
    positiveMarks: formData.positiveMarks || 1.0,
    negativeMarks: formData.negativeMarks || 0.25,
    status: statusDisplay,
    readiness: isBilingualReady ? 'BILINGUAL_READY' : isEnComplete ? 'KANNADA_INCOMPLETE' : isKnComplete ? 'ENGLISH_INCOMPLETE' : 'INCOMPLETE',
    approvalEligibility: { eligible: isApprovalEligible, missingFields: missingApprovalFields },
    categoryId: formData.categoryId || null,
    subcategoryId: formData.subcategoryId || null,
    topicId: formData.topicId || null,
    knowledgeAreaId: formData.knowledgeAreaId || null,
    examCycleId: formData.examCycleId || null,
    syllabusNodeId: formData.syllabusNodeId || null,
    sourceType: formData.sourceType || 'ORIGINAL',
    sourceName: formData.sourceName || null,
    sourceUrl: formData.sourceUrl || null,
    isPyq: formData.isPyq || false,
    pyqExamName: formData.pyqExamName || null,
    pyqYear: formData.pyqYear || null,
    pyqPaperStage: formData.pyqPaperStage || null,
    pyqQuestionNumber: formData.pyqQuestionNumber || null,
    pyqNotes: formData.pyqNotes || null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as McqQuestion;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: '40px' }}>
      
      {/* -------------------------------------------------------------------------- */}
      {/* ZONE A: HEADER ZONE & STICKY ACTION BAR                                    */}
      {/* -------------------------------------------------------------------------- */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '12px',
          border: '1px solid #DCE6EE',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left Header Title & Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <IconButton
            icon={<ArrowLeft size={18} />}
            ariaLabel="Back to MCQ Library"
            variant="ghost"
            onClick={() => navigate('/mcq-library')}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#084B7A',
                  backgroundColor: '#EAF3F9',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #DCE6EE',
                }}
              >
                {codeDisplay}
              </span>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                {isEditMode ? 'Edit Canonical MCQ' : 'New Canonical MCQ'}
              </h1>
              <StatusBadge status={statusDisplay} />
            </div>

            {/* Readiness Summary Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <Badge
                label={isEnComplete ? 'English: Complete ✓' : 'English: Incomplete ✗'}
                variant={isEnComplete ? 'success' : 'warning'}
              />
              <Badge
                label={isKnComplete ? 'Kannada: Complete ✓' : 'Kannada: Incomplete ✗'}
                variant={isKnComplete ? 'success' : 'warning'}
              />
              <Badge
                label={
                  isApprovalEligible
                    ? 'Approval Ready ✓'
                    : `Needs ${missingApprovalFields.length} Required Field${missingApprovalFields.length > 1 ? 's' : ''}`
                }
                variant={isApprovalEligible ? 'success' : 'neutral'}
              />
            </div>
          </div>
        </div>

        {/* Right Sticky Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/mcq-library')}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            size="md"
            leftIcon={<Eye size={16} />}
            onClick={() => setShowPreview(true)}
          >
            Preview MCQ
          </Button>

          <Button
            variant="secondary"
            size="md"
            leftIcon={<Save size={16} />}
            onClick={handleSaveDraft}
            isLoading={submitting}
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Send size={16} />}
            onClick={handleSubmitForReview}
            isLoading={submitting}
            style={{ backgroundColor: '#084B7A', borderColor: '#084B7A' }}
          >
            Submit for Review
          </Button>

          {/* Workflow Reviewer Buttons */}
          {statusDisplay === 'REVIEW_PENDING' && (
            <>
              <Button
                variant="primary"
                size="md"
                onClick={handleApprove}
                isLoading={submitting}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                Approve Question
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleRequestChanges}
                isLoading={submitting}
              >
                Request Changes
              </Button>
            </>
          )}

          {isEditMode && (
            <IconButton
              icon={<Archive size={16} />}
              ariaLabel="Archive Question"
              variant="ghost"
              size="md"
              onClick={handleArchive}
            />
          )}
        </div>
      </div>

      {/* Error Notice Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '14px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <XCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
          <div>
            <strong>Error: </strong> {error}
          </div>
        </div>
      )}

      {/* Duplicate Warning Banner */}
      {duplicateWarnings.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            padding: '16px',
            borderRadius: '10px',
            color: '#92400E',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#D97706' }}>
            <AlertTriangle size={16} /> Possible Duplicate Question Detected:
          </div>
          {duplicateWarnings.map((w) => (
            <div
              key={w.matchedId}
              style={{
                backgroundColor: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                  {w.matchedCode}
                </span>
                <span style={{ color: '#334155' }}>{w.matchedStemEn}</span>
              </div>
              <span style={{ fontWeight: 700, color: '#D97706', marginLeft: '12px', flexShrink: 0 }}>
                {w.similarityScore}% Stem Match
              </span>
            </div>
          ))}
          <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: '12px' }}>
            * Note: Draft saving is permitted, but exact stem duplicates will block final approval.
          </div>
        </div>
      )}

      {/* Mobile / Tablet Tab Switcher (STRICTLY HIDDEN ON DESKTOP) */}
      {!isDesktop && (
        <div
          style={{
            display: 'flex',
            backgroundColor: '#E2E8F0',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setMobileLangTab('en')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mobileLangTab === 'en' ? '#FFFFFF' : 'transparent',
              color: mobileLangTab === 'en' ? '#084B7A' : '#64748B',
              boxShadow: mobileLangTab === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            English Content
          </button>
          <button
            type="button"
            onClick={() => setMobileLangTab('kn')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif",
              backgroundColor: mobileLangTab === 'kn' ? '#FFFFFF' : 'transparent',
              color: mobileLangTab === 'kn' ? '#084B7A' : '#64748B',
              boxShadow: mobileLangTab === 'kn' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            ಕನ್ನಡ ವಿಷಯ (Kannada)
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* ZONE B: TWO-COLUMN BILINGUAL EDITOR ZONE (TRUE 50/50 DESKTOP GRID)          */}
      {/* -------------------------------------------------------------------------- */}
      <div
        className="mcq-bilingual-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
          gap: '24px',
          alignItems: 'start',
          width: '100%',
        }}
      >
        {/* LEFT COLUMN: ENGLISH CONTENT */}
        {(isDesktop || mobileLangTab === 'en') && (
          <div
            className="mcq-column-en"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}
          >
            <Card
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DCE6EE',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '14px',
                  marginBottom: '20px',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#084B7A' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    English Content
                  </h2>
                </div>
                <Badge label="EN" variant="info" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Question Text (English) — Tiptap Rich Content Editor */}
                <FormField
                  label="English Content Editor (Question Stem)"
                  required
                  helperText="Format question stem with rich text, headings, study blocks, lists, bold, and tables in English"
                >
                  <TiptapEditor
                    content={formData.questionTextEn || ''}
                    onChange={(_, plainText, html) =>
                      setFormData((p) => ({ ...p, questionTextEn: html || plainText }))
                    }
                    placeholder="Enter main question stem in English..."
                    language="en"
                    minHeight="160px"
                  />
                </FormField>

                {/* Options A-D (English) — Supports Simple Textarea or Full Tiptap Content Editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                      Options (English)
                    </div>
                    <button
                      type="button"
                      onClick={() => setRichOptionsEn((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: richOptionsEn ? '#084B7A' : '#475569',
                        backgroundColor: richOptionsEn ? '#EFF6FF' : '#F1F5F9',
                        border: `1px solid ${richOptionsEn ? '#93C5FD' : '#CBD5E1'}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={13} color={richOptionsEn ? '#084B7A' : '#64748B'} />
                      {richOptionsEn ? 'Switch to Simple Text' : 'Enable Content Editor for Options'}
                    </button>
                  </div>

                  {[
                    { key: 'A', field: 'optionA_En' },
                    { key: 'B', field: 'optionB_En' },
                    { key: 'C', field: 'optionC_En' },
                    { key: 'D', field: 'optionD_En' },
                  ].map((opt) => (
                    <FormField key={opt.key} label={`Option ${opt.key} (English)`} required>
                      {richOptionsEn ? (
                        <TiptapEditor
                          content={(formData as any)[opt.field] || ''}
                          onChange={(_, plainText, html) =>
                            setFormData((p) => ({ ...p, [opt.field]: html || plainText }))
                          }
                          placeholder={`Enter Option ${opt.key} with rich formatting in English...`}
                          language="en"
                          minHeight="70px"
                        />
                      ) : (
                        <Textarea
                          rows={2}
                          value={(formData as any)[opt.field] || ''}
                          onChange={(e) => setFormData((p) => ({ ...p, [opt.field]: e.target.value }))}
                          placeholder={`Enter Option ${opt.key} in English...`}
                          style={{ minHeight: '64px', fontSize: '14px', lineHeight: '1.5' }}
                        />
                      )}
                    </FormField>
                  ))}
                </div>

                {/* Answer Explanation (English) — Tiptap Rich Content Editor */}
                <FormField
                  label="English Content Editor (Answer Explanation)"
                  helperText="Detailed step-by-step reasoning, bullet points, study blocks, and reference notes in English"
                >
                  <TiptapEditor
                    content={formData.explanationEn || ''}
                    onChange={(_, plainText, html) =>
                      setFormData((p) => ({ ...p, explanationEn: html || plainText }))
                    }
                    placeholder="Enter detailed answer explanation in English..."
                    language="en"
                    minHeight="160px"
                  />
                </FormField>
              </div>
            </Card>
          </div>
        )}

        {/* RIGHT COLUMN: KANNADA CONTENT */}
        {(isDesktop || mobileLangTab === 'kn') && (
          <div
            className="mcq-column-kn"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}
          >
            <Card
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DCE6EE',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '14px',
                  marginBottom: '20px',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }} />
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#111827',
                      margin: 0,
                      fontFamily: "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif",
                    }}
                  >
                    ಕನ್ನಡ ವಿಷಯ
                  </h2>
                </div>
                <Badge label="Kannada" variant="info" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Question Text (Kannada) — Tiptap Rich Content Editor */}
                <FormField
                  label="ಕನ್ನಡ ವಿಷಯ ಸಂಪಾದಕ (ಪ್ರಶ್ನೆ ವಿವರಣೆ - Content Editor)"
                  required
                  helperText="ಕನ್ನಡದ ಮುಖ್ಯ ಪ್ರಶ್ನೆ ಪಠ್ಯ, ಅಧ್ಯಯನ ಬ್ಲಾಕ್‌ಗಳು ಹಾಗೂ ಕೋಷ್ಟಕಗಳನ್ನು ಸಂಪಾದಿಸಿ"
                >
                  <TiptapEditor
                    content={formData.questionTextKn || ''}
                    onChange={(_, plainText, html) =>
                      setFormData((p) => ({ ...p, questionTextKn: html || plainText }))
                    }
                    placeholder="ಕನ್ನಡದ ಪ್ರಮುಖ ಪ್ರಶ್ನೆ ವಿವರಣೆಯನ್ನು ಬರೆಯಿರಿ..."
                    language="kn"
                    minHeight="160px"
                  />
                </FormField>

                {/* Options A-D (Kannada) — Supports Simple Textarea or Full Tiptap Content Editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px dashed #E2E8F0',
                      paddingBottom: '6px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#334155',
                        fontFamily: "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif",
                      }}
                    >
                      ಆಯ್ಕೆಗಳು (ಕನ್ನಡ)
                    </div>
                    <button
                      type="button"
                      onClick={() => setRichOptionsKn((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: richOptionsKn ? '#047857' : '#475569',
                        backgroundColor: richOptionsKn ? '#ECFDF5' : '#F1F5F9',
                        border: `1px solid ${richOptionsKn ? '#A7F3D0' : '#CBD5E1'}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={13} color={richOptionsKn ? '#047857' : '#64748B'} />
                      {richOptionsKn ? 'ಸರಳ ಪಠ್ಯಕ್ಕೆ ಬದಲಿಸಿ' : 'ಆಯ್ಕೆಗಳಿಗೆ ರಿಚ್ ಎಡಿಟರ್ ಬಳಸಿ (Content Editor)'}
                    </button>
                  </div>

                  {[
                    { key: 'A', field: 'optionA_Kn' },
                    { key: 'B', field: 'optionB_Kn' },
                    { key: 'C', field: 'optionC_Kn' },
                    { key: 'D', field: 'optionD_Kn' },
                  ].map((opt) => (
                    <FormField key={opt.key} label={`ಆಯ್ಕೆ ${opt.key} (ಕನ್ನಡ)`} required>
                      {richOptionsKn ? (
                        <TiptapEditor
                          content={(formData as any)[opt.field] || ''}
                          onChange={(_, plainText, html) =>
                            setFormData((p) => ({ ...p, [opt.field]: html || plainText }))
                          }
                          placeholder={`ಆಯ್ಕೆ ${opt.key} ಯ ಕನ್ನಡ ಪಠ್ಯ...`}
                          language="kn"
                          minHeight="70px"
                        />
                      ) : (
                        <Textarea
                          rows={2}
                          value={(formData as any)[opt.field] || ''}
                          onChange={(e) => setFormData((p) => ({ ...p, [opt.field]: e.target.value }))}
                          placeholder={`ಆಯ್ಕೆ ${opt.key} ಯ ಕನ್ನಡ ಪಠ್ಯ...`}
                          style={{
                            minHeight: '64px',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            fontFamily: "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif",
                          }}
                        />
                      )}
                    </FormField>
                  ))}
                </div>

                {/* Answer Explanation (Kannada) — Tiptap Rich Content Editor */}
                <FormField
                  label="ಕನ್ನಡ ಉತ್ತರದ ವಿವರಣೆ (Answer Explanation Editor)"
                  helperText="ಕನ್ನಡದ ಸಮಗ್ರ ಉತ್ತರದ ವಿವರಣೆ, ಉಲ್ಲೇಖ ಹಾಗೂ ಅಧ್ಯಯನ ಬ್ಲಾಕ್‌ಗಳು"
                >
                  <TiptapEditor
                    content={formData.explanationKn || ''}
                    onChange={(_, plainText, html) =>
                      setFormData((p) => ({ ...p, explanationKn: html || plainText }))
                    }
                    placeholder="ಉತ್ತರದ ಕನ್ನಡ ವಿವರಣೆ ಬರೆಯಿರಿ..."
                    language="kn"
                    minHeight="160px"
                  />
                </FormField>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* ZONE C: SHARED FIELDS SECTION ("Shared Answer & Classification")           */}
      {/* -------------------------------------------------------------------------- */}
      <Card
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #DCE6EE',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Shared Answer & Classification
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Common scoring parameters, correct answer choice, academic taxonomy metadata, and source properties.
          </p>
        </div>

        {/* 1. Answer Choice & Scoring Scheme Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            backgroundColor: '#F8FAFC',
            padding: '20px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Correct Answer Choice */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shared Correct Answer *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {(['A', 'B', 'C', 'D'] as CorrectOption[]).map((opt) => {
                const isSelected = formData.correctOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, correctOption: opt }))}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #059669' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: isSelected ? '#047857' : '#334155',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(5,150,105,0.15)' : 'none',
                    }}
                  >
                    Option {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Difficulty *
            </label>
            <Select
              value={formData.difficulty}
              onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value as McqDifficulty }))}
              options={[
                { label: 'Easy', value: 'EASY' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'Hard', value: 'HARD' },
              ]}
            />
          </div>

          {/* Marks Scheme */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scoring Scheme (Marks)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '2px' }}>Positive (+)</span>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.positiveMarks}
                  onChange={(e) => setFormData((p) => ({ ...p, positiveMarks: parseFloat(e.target.value) || 1.0 }))}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '2px' }}>Negative (-)</span>
                <Input
                  type="number"
                  step="0.05"
                  value={formData.negativeMarks}
                  onChange={(e) => setFormData((p) => ({ ...p, negativeMarks: parseFloat(e.target.value) || 0.25 }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Academic Taxonomy Classification Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Academic Taxonomy Classification
              </h3>
              {(formData.categoryId || formData.subcategoryId) && (
                <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  1 Mapped
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCatSubOpen(!isCatSubOpen)}
            >
              {isCatSubOpen ? 'Collapse' : (formData.categoryId ? 'Edit Mapping' : '+ Add Mapping')}
            </Button>
          </div>

          {isCatSubOpen && (
            <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
              {/* Search bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={taxonomySearchQuery}
                    onChange={(e) => setTaxonomySearchQuery(e.target.value)}
                    placeholder="Search categories or subcategories..."
                    style={{ width: '100%', padding: '8px 10px 8px 34px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              {/* Tree */}
              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', backgroundColor: '#FFFFFF' }}>
                {categories.map((cat) => {
                  const q = taxonomySearchQuery.trim().toLowerCase();
                  const subList = subcategoriesMap[cat.id] || [];

                  const catMatch = !q || cat.nameEn.toLowerCase().includes(q) || (cat.nameKn || '').toLowerCase().includes(q);
                  const filteredSubList = !q
                    ? subList
                    : catMatch
                      ? subList
                      : subList.filter(sub => sub.nameEn.toLowerCase().includes(q) || (sub.nameKn || '').toLowerCase().includes(q));
                  const hasSubMatch = filteredSubList.length > 0;

                  if (q && !catMatch && !hasSubMatch) return null;

                  const hasSubs = subList.length > 0;
                  // A sub is selected under this category
                  const hasSubSelected = formData.categoryId === cat.id && Boolean(formData.subcategoryId);
                  // The category itself (no sub) is selected
                  const isCatOnlySelected = formData.categoryId === cat.id && !formData.subcategoryId;

                  // Indeterminate: category has subs, a sub is selected but not a full-select (single-select so always indeterminate when sub selected)
                  const isMainChecked = hasSubs ? false : isCatOnlySelected;
                  const isMainIndeterminate = hasSubs && hasSubSelected;
                  const isRowHighlighted = isCatOnlySelected || hasSubSelected;

                  const isExpanded = q ? true : expandedCategories[cat.id];

                  return (
                    <div key={cat.id} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isRowHighlighted ? '#F0FDF4' : 'transparent', borderRadius: '4px', paddingLeft: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); toggleCategoryExpand(cat.id); }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                        </button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: '4px 8px 4px 4px', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isMainChecked}
                            ref={(el) => { if (el) el.indeterminate = isMainIndeterminate; }}
                            onChange={() => handleToggleCategory(cat.id, isCatOnlySelected)}
                            style={{ cursor: 'pointer', accentColor: '#084B7A' }}
                          />
                          <span>📁 {cat.nameEn}{cat.nameKn ? ` (${cat.nameKn})` : ''}</span>
                        </label>
                      </div>

                      {filteredSubList.length > 0 && isExpanded && (
                        <div style={{ marginLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          {filteredSubList.map(sub => {
                            const isSubSelected = formData.categoryId === cat.id && formData.subcategoryId === sub.id;
                            return (
                              <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', backgroundColor: isSubSelected ? '#F0FDF4' : 'transparent' }}>
                                <input
                                  type="checkbox"
                                  checked={isSubSelected}
                                  onChange={() => handleToggleSubcategory(cat.id, sub.id, isSubSelected)}
                                  style={{ cursor: 'pointer', accentColor: '#084B7A' }}
                                />
                                <span>└─ {sub.nameEn}{sub.nameKn ? ` (${sub.nameKn})` : ''}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {categories.length === 0 && (
                  <div style={{ padding: '8px', fontSize: '13px', color: '#64748B' }}>Loading categories...</div>
                )}
              </div>

              {/* Clear button */}
              {(formData.categoryId || formData.subcategoryId) && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '', topicId: '', knowledgeAreaId: '' }))}
                  >
                    Clear Mapping
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Source & PYQ Information Section */}
        <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setIsSourceSectionOpen((p) => !p)}
            style={{
              width: '100%',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} style={{ color: '#084B7A' }} /> Source & PYQ Metadata (Optional)
            </span>
            {isSourceSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isSourceSectionOpen && (
            <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <FormField label="Source Type">
                  <Select
                    value={formData.sourceType || 'ORIGINAL'}
                    onChange={(e) => setFormData((p) => ({ ...p, sourceType: e.target.value as McqSourceType }))}
                    options={[
                      { label: 'Original Creation', value: 'ORIGINAL' },
                      { label: 'Previous Year Question (PYQ)', value: 'PREVIOUS_YEAR_QUESTION' },
                      { label: 'Official Government Source', value: 'OFFICIAL_SOURCE' },
                      { label: 'Standard Reference Book', value: 'REFERENCE' },
                    ]}
                  />
                </FormField>

                <FormField label="Source Name">
                  <Input
                    type="text"
                    value={formData.sourceName || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, sourceName: e.target.value }))}
                    placeholder="e.g. Laxmikanth Indian Polity 6th Ed"
                  />
                </FormField>

                <FormField label="Source URL">
                  <Input
                    type="url"
                    value={formData.sourceUrl || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, sourceUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </FormField>
              </div>

              {/* PYQ Toggle & Metadata */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPyq}
                    onChange={(e) => setFormData((p) => ({ ...p, isPyq: e.target.checked }))}
                    style={{ accentColor: '#084B7A', width: '16px', height: '16px' }}
                  />
                  Is Previous Year Question (PYQ)
                </label>

                {formData.isPyq && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '14px',
                      backgroundColor: '#F1F5F9',
                      padding: '16px',
                      borderRadius: '8px',
                    }}
                  >
                    <FormField label="PYQ Exam Name">
                      <Input
                        type="text"
                        value={formData.pyqExamName || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, pyqExamName: e.target.value }))}
                        placeholder="e.g. KAS Prelims"
                      />
                    </FormField>

                    <FormField label="PYQ Year">
                      <Input
                        type="number"
                        value={formData.pyqYear || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, pyqYear: parseInt(e.target.value, 10) || undefined }))}
                        placeholder="2020"
                      />
                    </FormField>

                    <FormField label="Paper / Stage">
                      <Input
                        type="text"
                        value={formData.pyqPaperStage || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, pyqPaperStage: e.target.value }))}
                        placeholder="General Studies Paper 1"
                      />
                    </FormField>

                    <FormField label="Question No.">
                      <Input
                        type="text"
                        value={formData.pyqQuestionNumber || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, pyqQuestionNumber: e.target.value }))}
                        placeholder="Q. 42"
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Optional Exam & Syllabus Tree Mapping */}
        <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setIsExamSectionOpen((p) => !p)}
            style={{
              width: '100%',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: '#084B7A' }} /> Exam Cycle & Syllabus Tree Mapping (Optional)
            </span>
            {isExamSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isExamSectionOpen && (
            <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                Optionally bind this question to a specific Exam Cycle instance or Syllabus Tree node.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <FormField label="Exam Cycle ID">
                  <Input
                    type="text"
                    value={formData.examCycleId || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, examCycleId: e.target.value }))}
                    placeholder="e.g. KAS_2026_GP"
                  />
                </FormField>

                <FormField label="Syllabus Node ID">
                  <Input
                    type="text"
                    value={formData.syllabusNodeId || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, syllabusNodeId: e.target.value }))}
                    placeholder="e.g. SYLLABUS_NODE_POLITY"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <McqPreviewModal
          question={previewQuestionObj}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
