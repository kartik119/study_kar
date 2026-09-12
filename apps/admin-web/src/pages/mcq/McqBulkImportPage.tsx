import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  RefreshCw,
  Info,
  Database,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
  FileCheck,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { mcqLibraryApi } from '../../api/mcq-library.api';
import './McqBulkImportPage.css';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const McqBulkImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'ADD_NEW' | 'UPDATE_EXISTING'>('ADD_NEW');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis result from server
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>('');
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [totalDetectedRows, setTotalDetectedRows] = useState<number>(0);

  // Validation result from server
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'VALID' | 'ERROR' | 'WARNING'>('ALL');
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // Taxonomy Overrides & Master Data
  const [taxonomyOverrides, setTaxonomyOverrides] = useState<{
    categories: Record<string, string>;
    subcategories: Record<string, string>;
    topics: Record<string, string>;
    knowledgeAreas: Record<string, string>;
  }>({
    categories: {},
    subcategories: {},
    topics: {},
    knowledgeAreas: {},
  });
  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  const [masterSubcategories, setMasterSubcategories] = useState<any[]>([]);

  // Explicit Master Creation Modal State
  const [createModalState, setCreateModalState] = useState<{
    isOpen: boolean;
    type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC';
    nameEn: string;
    nameKn: string;
    proposedCode: string;
    parentId?: string;
    parentName?: string;
    targetOverrideKey: string;
  } | null>(null);
  const [isCreatingTaxonomy, setIsCreatingTaxonomy] = useState<boolean>(false);

  // Execution result
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);

  // Download states
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState<boolean>(false);

  // Load history & taxonomy master on mount
  useEffect(() => {
    loadHistory();
    loadTaxonomyMaster();
  }, []);

  const loadTaxonomyMaster = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/v1/admin/academic-taxonomy/categories?moduleType=MCQ', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json.data) {
        setMasterCategories(json.data);
        const allSubs = json.data.flatMap((c: any) => c.subcategories || []);
        setMasterSubcategories(allSubs);
      }
    } catch (err) {
      console.error('Failed to load taxonomy master data:', err);
    }
  };

  const handleConfirmCreateTaxonomy = async () => {
    if (!createModalState) return;
    setIsCreatingTaxonomy(true);
    setErrorMessage(null);

    try {
      const res = await mcqLibraryApi.createTaxonomyMaster({
        type: createModalState.type,
        nameEn: createModalState.nameEn,
        nameKn: createModalState.nameKn,
        parentId: createModalState.parentId,
        customCode: createModalState.proposedCode,
      });

      await loadTaxonomyMaster();

      const createdId = res.data?.id || '';

      let updatedOverrides = { ...taxonomyOverrides };
      if (createModalState.type === 'CATEGORY') {
        updatedOverrides.categories = {
          ...updatedOverrides.categories,
          [createModalState.targetOverrideKey]: createdId,
        };
      } else if (createModalState.type === 'SUBCATEGORY') {
        updatedOverrides.subcategories = {
          ...updatedOverrides.subcategories,
          [createModalState.targetOverrideKey]: createdId,
        };
      } else {
        updatedOverrides.topics = {
          ...updatedOverrides.topics,
          [createModalState.targetOverrideKey]: createdId,
        };
      }

      setTaxonomyOverrides(updatedOverrides);
      setCreateModalState(null);
      await handleRunValidation(updatedOverrides);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create taxonomy master record');
    } finally {
      setIsCreatingTaxonomy(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await mcqLibraryApi.getBulkImportHistory();
      if (res.data) setImportHistory(res.data);
    } catch (err: any) {
      console.error('Failed to load import history:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this import session log?')) return;
    try {
      await mcqLibraryApi.deleteImportSession(sessionId);
      await loadHistory();
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      alert(err.message || 'Failed to delete session');
    }
  };

  const triggerFileDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Download Templates via Authenticated API
  const handleDownloadExcelTemplate = async () => {
    if (isDownloadingExcel) return;
    setIsDownloadingExcel(true);
    setErrorMessage(null);
    try {
      const { blob, filename } = await mcqLibraryApi.downloadExcelTemplate();
      triggerFileDownload(blob, filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to download the Excel template. Please try again.');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handleDownloadCsvTemplate = async () => {
    if (isDownloadingCsv) return;
    setIsDownloadingCsv(true);
    setErrorMessage(null);
    try {
      const { blob, filename } = await mcqLibraryApi.downloadCsvTemplate();
      triggerFileDownload(blob, filename);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to download the CSV template. Please try again.');
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // File Drop / Select Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    const isXlsx = selectedFile.name.toLowerCase().endsWith('.xlsx');
    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');

    if (!isXlsx && !isCsv) {
      setErrorMessage('Please upload a valid Excel (.xlsx) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await mcqLibraryApi.analyzeBulkImportFile(selectedFile);
      if (res.data) {
        setSessionId(res.data.sessionId);
        setTotalDetectedRows(res.data.totalRowsDetected);
        setUploadedHeaders(res.data.headers || []);
        setWorksheets(res.data.worksheets || []);
        setSelectedWorksheet(res.data.selectedWorksheet || '');
        setColumnMappings(res.data.autoColumnMappings || {});
        setCurrentStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze uploaded file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run Validation (Steps 3/4 -> 5/6)
  const handleRunValidation = async (overridesParam?: any) => {
    if (!sessionId) return;
    setIsLoading(true);
    setErrorMessage(null);

    const activeOverrides = overridesParam || taxonomyOverrides;

    try {
      const res = await mcqLibraryApi.validateBulkImport({
        sessionId,
        importMode,
        columnMappings,
        selectedWorksheet,
        taxonomyOverrides: activeOverrides,
      });

      if (res.data) {
        setValidationResult(res.data);
        setCurrentStep(5);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Import (Step 6 -> 7 -> 8)
  const handleExecuteImport = async () => {
    if (!sessionId || !validationResult?.isImportAllowed) return;
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentStep(7);

    try {
      const res = await mcqLibraryApi.executeBulkImport({
        sessionId,
        importMode,
        columnMappings,
        selectedWorksheet,
        taxonomyOverrides,
      });

      if (res.data) {
        setExecutionResult(res.data);
        setCurrentStep(8);
        loadHistory();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed.');
      setCurrentStep(6);
    } finally {
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setSessionId(null);
    setValidationResult(null);
    setExecutionResult(null);
    setErrorMessage(null);
  };

  const canonicalFields = [
    { key: 'question_en', label: 'English Stem', required: true, desc: 'Question in English' },
    { key: 'question_kn', label: 'Kannada Stem', required: true, desc: 'Question in Kannada' },
    { key: 'option_a_en', label: 'Option A (EN)', required: true, desc: 'English Option A' },
    { key: 'option_a_kn', label: 'Option A (KN)', required: true, desc: 'Kannada Option A' },
    { key: 'option_b_en', label: 'Option B (EN)', required: true, desc: 'English Option B' },
    { key: 'option_b_kn', label: 'Option B (KN)', required: true, desc: 'Kannada Option B' },
    { key: 'option_c_en', label: 'Option C (EN)', required: true, desc: 'English Option C' },
    { key: 'option_c_kn', label: 'Option C (KN)', required: true, desc: 'Kannada Option C' },
    { key: 'option_d_en', label: 'Option D (EN)', required: true, desc: 'English Option D' },
    { key: 'option_d_kn', label: 'Option D (KN)', required: true, desc: 'Kannada Option D' },
    { key: 'correct_answer', label: 'Correct Answer', required: true, desc: 'A, B, C, or D' },
    { key: 'explanation_en', label: 'Explanation (EN)', required: true, desc: 'Bilingual Explanation EN' },
    { key: 'explanation_kn', label: 'Explanation (KN)', required: true, desc: 'Bilingual Explanation KN' },
    { key: 'difficulty', label: 'Difficulty', required: true, desc: 'EASY, MEDIUM, or HARD' },
    { key: 'positive_marks', label: 'Positive Marks', required: true, desc: 'Default: 1.0' },
    { key: 'negative_marks', label: 'Negative Marks', required: true, desc: 'Default: 0.25' },
    { key: 'category_code', label: 'Category Code', required: true, desc: 'e.g. POLITY' },
    { key: 'subcategory_code', label: 'Subcategory Code', required: true, desc: 'e.g. FUNDAMENTAL_RIGHTS' },
    { key: 'topic_code', label: 'Topic Code', required: false, desc: 'Optional Master Code' },
    { key: 'knowledge_area_code', label: 'Knowledge Area Code', required: false, desc: 'Optional Master Code' },
    {
      key: 'mcq_id',
      label: 'MCQ ID / Code',
      required: importMode === 'UPDATE_EXISTING',
      desc: importMode === 'UPDATE_EXISTING' ? 'Compulsory for Update mode (e.g. MCQ_000124)' : 'Optional in Add New mode',
    },
    { key: 'source_type', label: 'Source Type', required: false, desc: 'ORIGINAL, PREVIOUS_YEAR_QUESTION, etc.' },
    { key: 'source_name', label: 'Source Name', required: false, desc: 'Book / Reference name' },
    { key: 'source_url', label: 'Source URL', required: false, desc: 'Optional web link' },
    { key: 'is_pyq', label: 'Is PYQ', required: false, desc: 'true or false' },
    { key: 'pyq_exam_name', label: 'PYQ Exam Name', required: false, desc: 'e.g. KAS Prelims' },
    { key: 'pyq_year', label: 'PYQ Exam Year', required: false, desc: 'e.g. 2020' },
    { key: 'pyq_paper', label: 'PYQ Paper', required: false, desc: 'e.g. GS Paper 1' },
    { key: 'pyq_question_number', label: 'PYQ Question No.', required: false, desc: 'e.g. Q. 14' },
    { key: 'pyq_notes', label: 'PYQ Notes', required: false, desc: 'Optional metadata' },
  ];

  const requiredCanonicalFields = canonicalFields.filter((f) => f.required);
  const mappedRequiredCount = requiredCanonicalFields.filter((f) => Boolean(columnMappings[f.key])).length;
  const isAllRequiredMapped = mappedRequiredCount === requiredCanonicalFields.length;

  const optionalCanonicalFields = canonicalFields.filter((f) => !f.required);
  const mappedOptionalCount = optionalCanonicalFields.filter((f) => Boolean(columnMappings[f.key])).length;

  const mappedHeaderValues = Object.values(columnMappings).filter(Boolean);
  const hasDuplicateAssignments = new Set(mappedHeaderValues).size !== mappedHeaderValues.length;

  const isOfficialTemplateDetected = isAllRequiredMapped && uploadedHeaders.length >= 18;

  const filteredRows = validationResult?.rows?.filter((r: any) => {
    if (activeFilterTab === 'VALID') return r.status === 'VALID';
    if (activeFilterTab === 'ERROR') return r.status === 'ERROR';
    if (activeFilterTab === 'WARNING') return r.status === 'WARNING';
    return true;
  }) || [];

  return (
    <div className="mcq-bulk-import-container">
      {/* 1. Header Zone */}
      <div className="import-header-card">
        <div className="header-left">
          <div className="breadcrumb-nav">
            <Link to="/mcq-library" className="breadcrumb-link">MCQ Library & Tests</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">Bulk Import Engine</span>
          </div>
          <h1 className="import-page-title">
            <UploadCloud className="title-icon" size={28} />
            MCQ Bulk Import Engine (CSV / XLSX)
          </h1>
          <p className="import-page-subtitle">
            Upload canonical bilingual questions in bulk using multi-sheet Excel or CSV templates.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary-template"
            onClick={handleDownloadExcelTemplate}
            disabled={isDownloadingExcel}
          >
            {isDownloadingExcel ? <RefreshCw className="spin" size={16} /> : <FileSpreadsheet size={16} />}
            {isDownloadingExcel ? 'Downloading...' : 'Download Excel Template (.xlsx)'}
          </button>
          <button
            className="btn-secondary-template"
            onClick={handleDownloadCsvTemplate}
            disabled={isDownloadingCsv}
          >
            {isDownloadingCsv ? <RefreshCw className="spin" size={16} /> : <FileText size={16} />}
            {isDownloadingCsv ? 'Downloading...' : 'Download CSV Template (.csv)'}
          </button>
        </div>
      </div>

      {/* 2. Wizard Stepper Bar */}
      <div className="wizard-stepper">
        {[
          { step: 1, label: 'Upload File' },
          { step: 2, label: 'Import Mode' },
          { step: 3, label: 'Map Columns' },
          { step: 4, label: 'Resolve Master Data' },
          { step: 5, label: 'Validate Rows' },
          { step: 6, label: 'Preview Import' },
          { step: 7, label: 'Atomic Import' },
          { step: 8, label: 'Import Report' },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <div key={s.step} className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
              <div className="step-badge">
                {isDone ? <Check size={14} /> : s.step}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="import-error-banner">
          <ShieldAlert size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Upload File */}
      {currentStep === 1 && (
        <div className="step-card">
          <div className="step-card-header">
            <h2>Step 1: Upload Excel or CSV File</h2>
            <p>Maximum 1,000 canonical bilingual MCQs per spreadsheet file.</p>
          </div>

          <div
            className="file-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .csv"
              style={{ display: 'none' }}
            />
            <div className="dropzone-icon-wrap">
              <UploadCloud size={48} className="dropzone-icon" />
            </div>
            <h3>Drag and drop your MCQ spreadsheet here, or click to browse</h3>
            <p className="dropzone-hint">Supports Excel (.xlsx with multi-sheets) & CSV (.csv)</p>
            <div className="rule-badge">
              <Info size={14} /> Strict Gate: 100% of rows must be valid before import button enables.
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Choose Import Mode */}
      {currentStep === 2 && (
        <div className="step-card">
          <div className="step-card-header">
            <h2>Step 2: Select Import Mode</h2>
            <p>File loaded: <strong>{file?.name}</strong> ({totalDetectedRows} rows detected)</p>
          </div>

          <div className="mode-selection-grid">
            <div
              className={`mode-card ${importMode === 'ADD_NEW' ? 'selected' : ''}`}
              onClick={() => setImportMode('ADD_NEW')}
            >
              <div className="mode-radio">
                <div className={`radio-circle ${importMode === 'ADD_NEW' ? 'checked' : ''}`} />
              </div>
              <div className="mode-content">
                <h3>Add New MCQs Mode</h3>
                <p>
                  Creates brand new canonical bilingual MCQs. Auto-generates sequential MCQ codes (e.g. MCQ_000124).
                  All imported questions land in <strong>DRAFT</strong> status, marked as <strong>BILINGUAL_READY</strong> and <strong>Approval Eligible</strong>.
                </p>
                <span className="mode-badge-green">Recommended for initial bulk creation</span>
              </div>
            </div>

            <div
              className={`mode-card ${importMode === 'UPDATE_EXISTING' ? 'selected' : ''}`}
              onClick={() => setImportMode('UPDATE_EXISTING')}
            >
              <div className="mode-radio">
                <div className={`radio-circle ${importMode === 'UPDATE_EXISTING' ? 'checked' : ''}`} />
              </div>
              <div className="mode-content">
                <h3>Update Existing MCQs Mode</h3>
                <p>
                  Updates pre-existing questions matching the specified <code>mcq_id</code> column.
                  Only questions in <strong>DRAFT</strong> or <strong>CHANGES_REQUESTED</strong> status can be updated.
                  Questions in APPROVED, REVIEW_PENDING, or ARCHIVED status are strictly blocked.
                </p>
                <span className="mode-badge-amber">Requires valid mcq_id column</span>
              </div>
            </div>
          </div>

          <div className="step-footer-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn-primary" onClick={() => setCurrentStep(3)}>
              Continue to Column Mapping <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: Column Mapping & Master Data Resolution */}
      {(currentStep === 3 || currentStep === 4) && (
        <div className="step-card">
          <div className="step-card-header">
            <h2>{currentStep === 3 ? 'Step 3: Column Mapping' : 'Step 4: Master Data Hierarchy Check'}</h2>
            <p>Verify that uploaded file columns correspond correctly to canonical Study Karnataka fields.</p>
          </div>

          {currentStep === 3 && (
            <div className="mapping-table-wrap">
              {/* Official Template Detection Banner */}
              {isOfficialTemplateDetected && (
                <div
                  className="official-template-banner"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                  }}
                >
                  <Sparkles size={22} color="#16A34A" />
                  <div>
                    <strong style={{ fontWeight: 700 }}>Official Study Karnataka Template Detected</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#15803D' }}>
                      All required canonical columns were matched and mapped automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Mapping Progress Indicator Bar */}
              <div
                className="mapping-progress-bar"
                style={{
                  display: 'flex',
                  gap: '32px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <div style={{ color: isAllRequiredMapped ? '#16A34A' : '#D97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Required Fields Mapped:</span>
                  <span className="stat-value">{mappedRequiredCount} / {requiredCanonicalFields.length}</span>
                  {isAllRequiredMapped && <CheckCircle2 size={16} color="#16A34A" />}
                </div>
                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Optional Fields Mapped:</span>
                  <span className="stat-value">{mappedOptionalCount} / {optionalCanonicalFields.length}</span>
                </div>
              </div>

              {/* Duplicate Mapping Error Alert */}
              {hasDuplicateAssignments && (
                <div className="import-error-banner" style={{ marginBottom: '20px' }}>
                  <ShieldAlert size={18} />
                  <span>Duplicate column assignment detected. Each uploaded column can only be mapped to one canonical target field.</span>
                </div>
              )}

              {/* Missing Required Mapping Alert */}
              {!isAllRequiredMapped && (
                <div className="import-error-banner" style={{ marginBottom: '20px', backgroundColor: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
                  <AlertTriangle size={18} color="#D97706" />
                  <span>
                    Missing compulsory mappings ({requiredCanonicalFields.length - mappedRequiredCount}):{' '}
                    <strong>
                      {requiredCanonicalFields.filter((f) => !columnMappings[f.key]).map((f) => f.key).join(', ')}
                    </strong>
                  </span>
                </div>
              )}

              {worksheets.length > 1 && (
                <div className="worksheet-select-bar mb-4" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, marginRight: '8px' }}>Select Excel Worksheet:</label>
                  <select
                    className="mapping-select"
                    style={{ width: 'auto', display: 'inline-block' }}
                    value={selectedWorksheet}
                    onChange={(e) => setSelectedWorksheet(e.target.value)}
                  >
                    {worksheets.map((ws) => (
                      <option key={ws} value={ws}>
                        {ws}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>Canonical Target Field</th>
                    <th>Required</th>
                    <th>Uploaded Column Header</th>
                    <th>Field Description</th>
                  </tr>
                </thead>
                <tbody>
                  {canonicalFields.map((field) => {
                    const isMapped = Boolean(columnMappings[field.key]);
                    return (
                      <tr key={field.key} style={{ backgroundColor: isMapped ? '#FAF5FF' : 'transparent' }}>
                        <td className="field-name">
                          <code>{field.key}</code>
                          <span className="field-label-text">{field.label}</span>
                        </td>
                        <td>
                          {field.required ? (
                            <span className="badge-req">Compulsory</span>
                          ) : (
                            <span className="badge-opt">Optional</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <select
                              className="mapping-select"
                              style={{
                                borderColor: isMapped ? '#16A34A' : '#CBD5E1',
                                backgroundColor: isMapped ? '#F0FDF4' : '#FFFFFF',
                              }}
                              value={columnMappings[field.key] || ''}
                              onChange={(e) =>
                                setColumnMappings({ ...columnMappings, [field.key]: e.target.value })
                              }
                            >
                              <option value="">-- Do Not Import / Select Column --</option>
                              {uploadedHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                            {isMapped && (
                              <span
                                style={{
                                  color: '#16A34A',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Check size={14} /> Auto-mapped
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="field-desc">{field.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {currentStep === 4 && (
            <div className="taxonomy-preview-panel">
              <div className="info-box-blue" style={{ marginBottom: '20px' }}>
                <Database size={20} />
                <div>
                  <h4>Automated Master Taxonomy Resolution</h4>
                  <p>
                    Category and Subcategory codes/names are resolved against the live Academic Taxonomy database.
                    Name-assisted matching maps uploaded human-readable names automatically. You can also batch-map unresolved taxonomy below.
                  </p>
                </div>
              </div>

              <div className="summary-cards-grid" style={{ marginBottom: '24px' }}>
                <div className="summary-card">
                  <span className="card-label">Uploaded File</span>
                  <span className="card-value">{file?.name}</span>
                </div>
                <div className="summary-card">
                  <span className="card-label">Selected Import Mode</span>
                  <span className="card-value-highlight">{importMode}</span>
                </div>
                <div className="summary-card">
                  <span className="card-label">Mapped Column Fields</span>
                  <span className="card-value">
                    {Object.keys(columnMappings).filter((k) => Boolean(columnMappings[k])).length} / {canonicalFields.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="step-footer-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(currentStep === 4 ? 3 : 2)}>
              <ArrowLeft size={16} /> Back
            </button>
            {currentStep === 3 ? (
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(4)}
                disabled={!isAllRequiredMapped || hasDuplicateAssignments}
              >
                Next: Resolve Master Data <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn-primary" onClick={() => handleRunValidation()} disabled={isLoading}>
                {isLoading ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
                Run Strict Validation Gate
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 5 & 6: Validation Results & Preview */}
      {(currentStep === 5 || currentStep === 6) && validationResult && (
        <div className="step-card">
          <div className="step-card-header">
            <h2>Step 5 & 6: Validation Results & Data Preview</h2>
            <p>Review validation results, metadata normalization, and taxonomy resolution before committing database transaction.</p>
          </div>

          {/* Validation Summary Bar */}
          <div className="val-summary-banner">
            <div className="val-metric">
              <span className="metric-val">{validationResult.totalRows}</span>
              <span className="metric-lbl">Total Rows</span>
            </div>
            <div className="val-metric valid">
              <CheckCircle2 size={20} />
              <span className="metric-val">{validationResult.validRows}</span>
              <span className="metric-lbl">Valid Rows (Ready ✓)</span>
            </div>
            <div className="val-metric warning">
              <AlertTriangle size={20} />
              <span className="metric-val">{validationResult.warningRows}</span>
              <span className="metric-lbl">Warnings</span>
            </div>
            <div className="val-metric error">
              <XCircle size={20} />
              <span className="metric-val">{validationResult.errorRows}</span>
              <span className="metric-lbl">Blocking Errors</span>
            </div>
          </div>

          {/* Metadata & Normalization Summary Cards */}
          {validationResult.difficultySummary && (
            <div className="metadata-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Normalized Difficulty Distribution</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
                  EASY: {validationResult.difficultySummary.easy} | MEDIUM: {validationResult.difficultySummary.medium} | HARD: {validationResult.difficultySummary.hard}
                </div>
                {validationResult.difficultySummary.normalizedModerateCount > 0 && (
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
                    ✓ {validationResult.difficultySummary.normalizedModerateCount} 'MODERATE' values normalized to 'MEDIUM'
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Normalized Source Types</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1D4ED8', marginTop: '4px' }}>
                  OFFICIAL: {validationResult.sourceSummary?.officialSource || 0} | ORIGINAL: {validationResult.sourceSummary?.original || 0} | REF: {validationResult.sourceSummary?.reference || 0}
                </div>
                {validationResult.sourceSummary?.normalizedAliasesCount ? (
                  <div style={{ fontSize: '12px', color: '#1E40AF', marginTop: '4px', fontWeight: 600 }}>
                    ✓ {validationResult.sourceSummary.normalizedAliasesCount} source aliases normalized (e.g. GOVT_KARNATAKA $\rightarrow$ OFFICIAL_SOURCE)
                  </div>
                ) : null}
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Academic Taxonomy Resolution</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  Category & Subcategory: {validationResult.errorRows === 0 ? '100% Resolved ✓' : 'Action Required'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Category & Subcategory resolution is compulsory
                </div>
              </div>
            </div>
          )}

          {/* ACADEMIC TAXONOMY BATCH RESOLUTION CARD */}
          {validationResult.taxonomySummary && validationResult.taxonomySummary.length > 0 && (
            <div className="taxonomy-resolution-card" style={{ marginBottom: '24px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={20} color="#2563EB" />
                    ACADEMIC TAXONOMY RESOLUTION
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                    Top-level categories & subcategories detected across all rows. Batch map unresolved codes/names below to apply across all matching rows.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => handleRunValidation(taxonomyOverrides)}
                  disabled={isLoading}
                  style={{ fontSize: '13px', padding: '8px 14px' }}
                >
                  {isLoading ? <RefreshCw className="spin" size={14} /> : <CheckCircle2 size={14} />}
                  Re-Validate Mappings
                </button>
              </div>

              {/* Categories Batch Resolution Table */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Top-Level Categories Detected:</h4>
                <table className="mapping-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Uploaded Category (Code / Name)</th>
                      <th>Rows</th>
                      <th>Resolution Status</th>
                      <th>Resolved Master Category</th>
                      <th>Batch Mapping Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.taxonomySummary.filter((t: any) => t.type === 'CATEGORY').map((item: any) => {
                      const isResolved = item.status === 'RESOLVED';
                      const overrideKey = item.uploadedCode || item.uploadedName;
                      const overrideVal = taxonomyOverrides.categories[overrideKey] || '';
                      return (
                        <tr key={item.uploadedKey}>
                          <td>
                            <strong>{item.uploadedName || item.uploadedCode}</strong>
                            {item.uploadedCode && item.uploadedName && <code style={{ marginLeft: '8px', fontSize: '12px' }}>({item.uploadedCode})</code>}
                          </td>
                          <td><strong>{item.rowCount}</strong> rows</td>
                          <td>
                            <span className={`status-pill ${isResolved ? 'pill-valid' : 'pill-error'}`}>
                              {isResolved ? `✓ ${item.resolutionMethod || 'Resolved'}` : 'Action Required'}
                            </span>
                          </td>
                          <td>
                            {item.resolvedNameEn ? (
                              <span style={{ color: '#16A34A', fontWeight: 600 }}>{item.resolvedNameEn}</span>
                            ) : (
                              <span style={{ color: '#DC2626', fontWeight: 600 }}>Not Found in Master Data</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select
                                className="mapping-select"
                                style={{ flex: 1, fontSize: '12px' }}
                                value={overrideVal || item.resolvedId || ''}
                                onChange={(e) => {
                                  const newCatOverrides = { ...taxonomyOverrides.categories, [overrideKey]: e.target.value };
                                  const updated = { ...taxonomyOverrides, categories: newCatOverrides };
                                  setTaxonomyOverrides(updated);
                                  handleRunValidation(updated);
                                }}
                              >
                                <option value="">-- Map to Existing Master Category --</option>
                                {masterCategories.map((mc: any) => (
                                  <option key={mc.id} value={mc.id}>
                                    {mc.code} — {mc.nameEn}
                                  </option>
                                ))}
                              </select>
                              {!isResolved && (
                                <button
                                  className="btn-secondary"
                                  style={{ fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                                  onClick={() => {
                                    const name = item.uploadedName || item.uploadedCode;
                                    const propCode = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 16);
                                    setCreateModalState({
                                      isOpen: true,
                                      type: 'CATEGORY',
                                      nameEn: name,
                                      nameKn: name,
                                      proposedCode: propCode,
                                      targetOverrideKey: overrideKey,
                                    });
                                  }}
                                >
                                  + Create Category
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Subcategories Batch Resolution Table */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Subcategories Detected:</h4>
                <table className="mapping-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Uploaded Subcategory Name</th>
                      <th>Parent Category</th>
                      <th>Rows</th>
                      <th>Status</th>
                      <th>Batch Mapping Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.taxonomySummary.filter((t: any) => t.type === 'SUBCATEGORY').map((item: any) => {
                      const isResolved = item.status === 'RESOLVED';
                      const overrideKey = item.uploadedCode || item.uploadedName;
                      const overrideVal = taxonomyOverrides.subcategories[overrideKey] || '';
                      return (
                        <tr key={item.uploadedKey}>
                          <td><strong>{item.uploadedName || item.uploadedCode}</strong></td>
                          <td><code>{item.parentKey || '-'}</code></td>
                          <td><strong>{item.rowCount}</strong> rows</td>
                          <td>
                            <span className={`status-pill ${isResolved ? 'pill-valid' : 'pill-error'}`}>
                              {isResolved ? `✓ ${item.resolutionMethod || 'Resolved'}` : 'Action Required'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select
                                className="mapping-select"
                                style={{ flex: 1, fontSize: '12px' }}
                                value={overrideVal || item.resolvedId || ''}
                                onChange={(e) => {
                                  const newSubOverrides = { ...taxonomyOverrides.subcategories, [overrideKey]: e.target.value };
                                  const updated = { ...taxonomyOverrides, subcategories: newSubOverrides };
                                  setTaxonomyOverrides(updated);
                                  handleRunValidation(updated);
                                }}
                              >
                                <option value="">-- Map to Existing Master Subcategory --</option>
                                {masterSubcategories.map((ms: any) => (
                                  <option key={ms.id} value={ms.id}>
                                    {ms.code} — {ms.nameEn}
                                  </option>
                                ))}
                              </select>
                              {!isResolved && (
                                <button
                                  className="btn-secondary"
                                  style={{ fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                                  onClick={() => {
                                    const parentCatItem = validationResult.taxonomySummary.find((t: any) => t.type === 'CATEGORY' && (t.uploadedCode === item.parentKey || t.uploadedName === item.parentKey));
                                    const pId = parentCatItem?.resolvedId || masterCategories[0]?.id;
                                    const pCode = parentCatItem?.uploadedCode || 'P2_S';
                                    const name = item.uploadedName || item.uploadedCode;

                                    const words = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter((w: string) => !['AND','OR','THE','OF','IN','FOR'].includes(w)).slice(0, 3).map((w: string) => w.substring(0, 6));
                                    const propCode = `${pCode.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${words.join('_')}`;

                                    setCreateModalState({
                                      isOpen: true,
                                      type: 'SUBCATEGORY',
                                      nameEn: name,
                                      nameKn: name,
                                      proposedCode: propCode,
                                      parentId: pId,
                                      parentName: parentCatItem?.resolvedNameEn || item.parentKey,
                                      targetOverrideKey: overrideKey,
                                    });
                                  }}
                                >
                                  + Create Subcategory
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Gate Banner */}
          {!validationResult.isImportAllowed ? (
            <div className="import-gate-blocked">
              <ShieldAlert size={24} />
              <div>
                <h4>Import Blocked — Unresolved Compulsory Taxonomy or Errors</h4>
                <p>
                  Category and Subcategory mappings must be 100% resolved before import can proceed. Use the Academic Taxonomy Resolution panel above to map unresolved categories in one click.
                </p>
              </div>
            </div>
          ) : (
            <div className="import-gate-allowed">
              <FileCheck size={24} />
              <div>
                <h4>Import Gate Passed (100% Ready ✓)</h4>
                <p>All compulsory bilingual fields, difficulty levels, source types, and taxonomy hierarchy mappings are validated. You can execute import now.</p>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="filter-tabs">
            <button
              className={`filter-tab ${activeFilterTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('ALL')}
            >
              All Rows ({validationResult.totalRows})
            </button>
            <button
              className={`filter-tab ${activeFilterTab === 'VALID' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('VALID')}
            >
              Valid ({validationResult.validRows})
            </button>
            <button
              className={`filter-tab ${activeFilterTab === 'ERROR' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('ERROR')}
            >
              Errors ({validationResult.errorRows})
            </button>
            <button
              className={`filter-tab ${activeFilterTab === 'WARNING' ? 'active' : ''}`}
              onClick={() => setActiveFilterTab('WARNING')}
            >
              Warnings ({validationResult.warningRows})
            </button>
          </div>

          {/* Row Data Table */}
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>Status</th>
                  <th>MCQ ID / Code</th>
                  <th>Question Stem (EN)</th>
                  <th>Question Stem (KN)</th>
                  <th>Category / Subcategory</th>
                  <th>Difficulty</th>
                  <th>Correct</th>
                  <th>Issues</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r: any) => (
                  <tr key={r.rowNumber} className={`row-status-${r.status.toLowerCase()}`}>
                    <td className="col-row-num">#{r.rowNumber}</td>
                    <td>
                      <span className={`status-pill pill-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="col-code">
                      <code>{r.mcqId || 'AUTO_GEN'}</code>
                    </td>
                    <td className="col-stem">{r.questionPreviewEn}</td>
                    <td className="col-stem kn-text">{r.questionPreviewKn}</td>
                    <td className="col-tax">
                      <div>{r.categoryCode || '-'}</div>
                      <small className="text-sub">{r.subcategoryCode || '-'}</small>
                    </td>
                    <td>
                      <span className={`diff-tag diff-${(r.difficulty || 'easy').toLowerCase()}`}>
                        {r.difficulty}
                      </span>
                    </td>
                    <td className="col-ans">{r.correctAnswer}</td>
                    <td>
                      {r.issues && r.issues.length > 0 ? (
                        <span className="issue-count-tag">{r.issues.length} issue(s)</span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-icon-view" onClick={() => setSelectedRowDetail(r)}>
                        <Eye size={16} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="step-footer-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(4)}>
              <ArrowLeft size={16} /> Back to Mapping
            </button>
            <button
              className="btn-execute-import"
              onClick={handleExecuteImport}
              disabled={!validationResult.isImportAllowed || isLoading}
            >
              {isLoading ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
              Execute Atomic Import ({validationResult.validRows} MCQs)
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Importing Progress Overlay */}
      {currentStep === 7 && (
        <div className="step-card importing-card">
          <RefreshCw className="spin large-spin" size={56} />
          <h2>Importing Canonical Bilingual MCQs...</h2>
          <p>Executing atomic database transaction ($transaction) to import validated questions cleanly.</p>
        </div>
      )}

      {/* STEP 8: Import Report */}
      {currentStep === 8 && executionResult && (
        <div className="step-card">
          <div className="import-success-banner">
            <CheckCircle2 size={48} className="success-icon" />
            <div>
              <h2>MCQ Bulk Import Completed Successfully!</h2>
              <p>
                Successfully imported <strong>{executionResult.importedRows}</strong> canonical bilingual MCQs into the database.
              </p>

              {executionResult.generatedCodeRange && (
                <div className="code-range-box">
                  <Layers size={18} />
                  <span>Generated MCQ Code Range: <strong>{executionResult.generatedCodeRange}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="import-summary-metrics">
            <div className="metric-box">
              <span className="val">{executionResult.importedRows}</span>
              <span className="lbl">Total MCQs Created</span>
            </div>
            <div className="metric-box">
              <span className="val">{executionResult.importMode}</span>
              <span className="lbl">Import Mode</span>
            </div>
            <div className="metric-box">
              <span className="val">{executionResult.status}</span>
              <span className="lbl">Status</span>
            </div>
          </div>

          <div className="report-actions">
            <button className="btn-primary" onClick={() => navigate('/mcq-library')}>
              Go to Question Library <ArrowRight size={16} />
            </button>
            <button className="btn-secondary" onClick={resetWizard}>
              <RotateCcw size={16} /> Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Row Details Modal / Drawer */}
      {selectedRowDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedRowDetail(null)}>
          <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Row #{selectedRowDetail.rowNumber} Validation Details</h3>
              <button className="btn-close" onClick={() => setSelectedRowDetail(null)}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <h4>Question Stems (Bilingual)</h4>
                <div className="bilingual-preview-box">
                  <div className="lang-box">
                    <span className="lang-tag">English</span>
                    <p>{selectedRowDetail.questionPreviewEn}</p>
                  </div>
                  <div className="lang-box kn">
                    <span className="lang-tag">Kannada</span>
                    <p>{selectedRowDetail.questionPreviewKn}</p>
                  </div>
                </div>
              </div>

              {selectedRowDetail.issues && selectedRowDetail.issues.length > 0 && (
                <div className="drawer-section">
                  <h4>Validation Issues Trace ({selectedRowDetail.issues.length})</h4>
                  <div className="issues-list">
                    {selectedRowDetail.issues.map((iss: any, idx: number) => (
                      <div key={idx} className={`issue-card ${iss.isBlocking ? 'blocking' : 'warning'}`}>
                        <div className="issue-title">
                          {iss.isBlocking ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                          <span>Field: <code>{iss.field}</code> ({iss.errorCode})</span>
                        </div>
                        <p className="issue-msg">{iss.errorMessage}</p>
                        {iss.uploadedValue && (
                          <div className="uploaded-val-note">
                            Uploaded value: <code>{iss.uploadedValue}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRowDetail.diffPreview && selectedRowDetail.diffPreview.length > 0 && (
                <div className="drawer-section">
                  <h4>Diff Preview (Update Existing Mode)</h4>
                  <table className="diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Current Value (Database)</th>
                        <th>Incoming Value (Spreadsheet)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRowDetail.diffPreview.map((d: any, i: number) => (
                        <tr key={i}>
                          <td><code>{d.field}</code></td>
                          <td className="diff-current">{String(d.currentValue ?? '-')}</td>
                          <td className="diff-incoming">{String(d.incomingValue ?? '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explicit Master Creation Modal */}
      {createModalState && createModalState.isOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalState(null)}>
          <div className="modal-drawer" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Create Missing {createModalState.type === 'CATEGORY' ? 'Category' : createModalState.type === 'SUBCATEGORY' ? 'Subcategory' : 'Topic'}</h3>
              <button className="btn-close" onClick={() => setCreateModalState(null)}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                Review and save valid metadata to explicitly insert this new record into the master Academic Taxonomy database.
              </p>

              {createModalState.type === 'SUBCATEGORY' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Parent Category</label>
                  <select
                    className="mapping-select"
                    style={{ width: '100%', fontSize: '13px' }}
                    value={createModalState.parentId || ''}
                    onChange={(e) => setCreateModalState({ ...createModalState, parentId: e.target.value })}
                  >
                    {masterCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.nameEn}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>English Name</label>
                <input
                  type="text"
                  className="mapping-select"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={createModalState.nameEn}
                  onChange={(e) => setCreateModalState({ ...createModalState, nameEn: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Kannada Name (Optional)</label>
                <input
                  type="text"
                  className="mapping-select"
                  style={{ width: '100%', fontSize: '13px' }}
                  value={createModalState.nameKn}
                  onChange={(e) => setCreateModalState({ ...createModalState, nameKn: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Proposed Unique Canonical Code
                </label>
                <input
                  type="text"
                  className="mapping-select"
                  style={{ width: '100%', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}
                  value={createModalState.proposedCode}
                  onChange={(e) => setCreateModalState({ ...createModalState, proposedCode: e.target.value.toUpperCase() })}
                />
                <small style={{ fontSize: '11px', color: '#64748B' }}>Auto-generated unique code. Canonical code is immutable after creation.</small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setCreateModalState(null)}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmCreateTaxonomy}
                  disabled={isCreatingTaxonomy || !createModalState.nameEn.trim() || !createModalState.proposedCode.trim()}
                >
                  {isCreatingTaxonomy ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Confirm & Create Master Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Import Sessions Log Table */}
      <div className="step-card history-card">
        <div className="step-card-header">
          <h2>Past MCQ Bulk Import Sessions Log</h2>
          <p>Audit history of all previous bulk import operations performed on the platform.</p>
        </div>

        <div className="preview-table-wrap">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>File Name</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Total Rows</th>
                <th>Valid / Error</th>
                <th>Admin</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {importHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No past import sessions recorded yet.
                  </td>
                </tr>
              ) : (
                importHistory.map((h: any) => (
                  <tr key={h.id}>
                    <td><code>{h.id.substring(0, 8)}...</code></td>
                    <td><strong>{h.originalFileName}</strong></td>
                    <td><span className="mode-badge-small">{h.importMode}</span></td>
                    <td>
                      <span className={`status-pill pill-${h.status.toLowerCase()}`}>
                        {h.status}
                      </span>
                    </td>
                    <td>{h.totalRows}</td>
                    <td>
                      <span className="text-green-600 font-semibold">{h.validRows}</span> /{' '}
                      <span className="text-red-600 font-semibold">{h.errorRows}</span>
                    </td>
                    <td>{h.startedByAdmin?.fullName || 'System'}</td>
                    <td>{new Date(h.createdAt).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(h.id)}
                        title="Delete Session Log"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
