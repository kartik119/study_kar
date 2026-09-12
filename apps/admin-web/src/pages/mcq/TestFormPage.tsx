import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { testApi, mcqLibraryApi } from '../../api/mcq-library.api';
import './TestFormPage.css';

export const TestFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'new');

  const [activeStep, setActiveStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Master Data
  const [categories, setCategories] = useState<any[]>([]);

  // Test State
  const [testData, setTestData] = useState<any>({
    code: '',
    titleEn: '',
    titleKn: '',
    descriptionEn: '',
    descriptionKn: '',
    instructionsEn: '',
    instructionsKn: '',
    examCycleId: '',
    examStageId: '',
    examPaperId: '',
    totalQuestions: 10,
    durationMinutes: 60,
    passingPercentage: 40,
    accessClassification: 'FREE',
    scoringPolicy: 'TEST_DEFAULT',
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    selectionMode: 'MANUAL',
    pyqPreference: 'ANY',
    status: 'DRAFT',
    categoryDistributions: [],
    subcategoryDistributions: [],
    difficultyDistributions: [
      { difficulty: 'EASY', targetCount: 3 },
      { difficulty: 'MEDIUM', targetCount: 5 },
      { difficulty: 'HARD', targetCount: 2 },
    ],
    questions: [],
    selectedCount: 0,
    bilingualEligibleCount: 0,
    isBlueprintValid: true,
    blueprintErrors: [],
  });

  // Manual Picker State
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [eligibleQuestions, setEligibleQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('');
  const [pickerDifficulty, setPickerDifficulty] = useState<string>('');
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);

  // Availability Check Result State
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [checkingAvail, setCheckingAvail] = useState<boolean>(false);

  // Replace Question Modal State
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [replaceOldQuestionId, setReplaceOldQuestionId] = useState<string>('');
  const [replaceCategoryFilter, setReplaceCategoryFilter] = useState<string>('');
  const [replaceDifficultyFilter, setReplaceDifficultyFilter] = useState<string>('');
  const [replacePool, setReplacePool] = useState<any[]>([]);
  const [selectedNewQuestionId, setSelectedNewQuestionId] = useState<string>('');

  // Rejection Reason Modal
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // Initial Data Load
  useEffect(() => {
    const initData = async () => {
      try {
        const [catRes] = await Promise.all([
          mcqLibraryApi.getCategories(),
        ]);
        const catsList = catRes.data || [];
        setCategories(catsList);

        if (isEdit && id) {
          const testRes = await testApi.getTestById(id);
          const t = testRes.data;
          setTestData(t);
          setSelectedQuestionIds((t.questions || []).map((q: any) => q.questionId));

          if (t.categoryDistributions?.length === 0 && catsList.length > 0) {
            // default category distribution
            const firstCat = catsList[0];
            setTestData((prev: any) => ({
              ...prev,
              categoryDistributions: [{ categoryId: firstCat.id, targetCount: t.totalQuestions }],
            }));
          }
        } else {
          const codeRes = await testApi.getNextTestCode();
          setTestData((prev: any) => ({
            ...prev,
            code: codeRes.data?.code || '',
            categoryDistributions: [],
          }));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize page data');
      }
    };
    initData();
  }, [id, isEdit]);

  // Handle Save / Create Draft Test
  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isEdit && id) {
        const res = await testApi.updateTest(id, testData);
        setTestData(res.data);
        setSuccessMsg('Test details updated successfully.');
      } else {
        const res = await testApi.createTest(testData);
        setTestData(res.data);
        setSuccessMsg('New Draft Test created successfully!');
        navigate(`/mcq-library/tests/${res.data.id}/edit`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save test details');
    } finally {
      setSaving(false);
    }
  };

  // Run Availability Check
  const runAvailabilityCheck = async () => {
    setCheckingAvail(true);
    setError(null);
    try {
      const res = await testApi.checkAvailability({
        totalQuestions: testData.totalQuestions,
        pyqPreference: testData.pyqPreference,
        categoryDistributions: testData.categoryDistributions,
        subcategoryDistributions: testData.subcategoryDistributions,
        difficultyDistributions: testData.difficultyDistributions,
      });
      setAvailabilityResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Availability check failed');
    } finally {
      setCheckingAvail(false);
    }
  };

  // Run Auto-Generation
  const handleAutoGenerate = async () => {
    // 1. Always save the latest draft settings (blueprints, total questions, etc.) to the backend first.
    setSaving(true);
    setError(null);
    try {
      let savedId = id;
      if (!id || id === 'new') {
        const res = await testApi.createTest(testData);
        setTestData(res.data);
        savedId = res.data.id;
        // Don't navigate away here, just update the ID so we can generate.
        window.history.replaceState(null, '', `/mcq-library/tests/${savedId}/edit`);
      } else {
        const res = await testApi.updateTest(id, testData);
        setTestData(res.data);
      }

      // 2. Now call the auto-generate endpoint with the updated test.
      const genRes = await testApi.autoGenerate(savedId as string);
      setTestData(genRes.data);
      setSuccessMsg(`Automatic generation successful! ${genRes.data.questions.length} questions selected.`);
      setActiveStep(4);
    } catch (err: any) {
      setError(err.message || 'Auto generation failed. Please check your blueprints.');
    } finally {
      setSaving(false);
    }
  };

  // Open Manual Question Picker
  const openManualPicker = async () => {
    setShowPickerModal(true);
    setPickerLoading(true);
    try {
      const res = await testApi.getEligibleQuestions({
        search: pickerSearch,
        categoryId: pickerCategory || undefined,
        difficulty: pickerDifficulty || undefined,
        pageSize: 50,
      });
      setEligibleQuestions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search eligible questions');
    } finally {
      setPickerLoading(false);
    }
  };

  // Save Manual Selection
  const handleSaveManualSelection = async () => {
    setSaving(true);
    setError(null);
    try {
      let savedId = id;
      if (!id || id === 'new') {
        const res = await testApi.createTest(testData);
        setTestData(res.data);
        savedId = res.data.id;
        window.history.replaceState(null, '', `/mcq-library/tests/${savedId}/edit`);
      } else {
        const res = await testApi.updateTest(id, testData);
        setTestData(res.data);
      }

      const res2 = await testApi.saveManualSelection(savedId as string, selectedQuestionIds);
      setTestData(res2.data);
      setSuccessMsg(`Saved ${selectedQuestionIds.length} selected questions.`);
      setShowPickerModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save manual selection');
    } finally {
      setSaving(false);
    }
  };

  // Open Replace Question Modal
  const openReplaceModal = async (oldQId: string) => {
    const qObj = testData.questions.find((q: any) => q.questionId === oldQId);
    if (!qObj) return;

    setReplaceOldQuestionId(oldQId);
    const catId = qObj.selectedCategoryId || qObj.question?.categoryId || '';
    const diff = qObj.selectedDifficulty || qObj.question?.difficulty || '';
    setReplaceCategoryFilter(catId);
    setReplaceDifficultyFilter(diff);
    setShowReplaceModal(true);

    try {
      const res = await testApi.getEligibleQuestions({
        categoryId: catId,
        difficulty: diff,
        pageSize: 50,
      });
      // Filter out questions already in test
      const currentIds = new Set(testData.questions.map((q: any) => q.questionId));
      setReplacePool((res.data || []).filter((q: any) => !currentIds.has(q.id)));
    } catch (err: any) {
      setError(err.message || 'Failed to load replacement questions');
    }
  };

  // Execute Replace Question
  const handleExecuteReplace = async () => {
    if (!id || !selectedNewQuestionId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.replaceQuestion(id, replaceOldQuestionId, selectedNewQuestionId);
      setTestData(res.data);
      setSuccessMsg('Question replaced successfully!');
      setShowReplaceModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to replace question');
    } finally {
      setSaving(false);
    }
  };

  // Workflow Handlers
  const handleSubmitReview = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.submitForReview(id);
      setTestData(res.data);
      setSuccessMsg('Test submitted for review successfully!');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!id || !rejectionReasonInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.requestChanges(id, rejectionReasonInput);
      setTestData(res.data);
      setSuccessMsg('Changes requested successfully.');
      setShowRejectModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to request changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.approveTest(id);
      setTestData(res.data);
      setSuccessMsg('Test Approved successfully!');
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.publishTest(id);
      setTestData(res.data);
      setSuccessMsg('Test Published successfully! Immutable question snapshots frozen.');
    } catch (err: any) {
      setError(err.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await testApi.archiveTest(id);
      setTestData(res.data);
      setSuccessMsg('Test archived.');
    } catch (err: any) {
      setError(err.message || 'Archive failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="test-form-page" data-testid="test-form-page">
      <div className="test-form-header">
        <div>
          <button className="btn-secondary" style={{ marginBottom: '8px' }} onClick={() => navigate('/mcq-library/tests')}>
            ← Back to Tests Library
          </button>
          <h1>
            {isEdit ? `Edit Test — ${testData.code}` : 'Create New Bilingual Mock Test'}
            <span className={`status-badge ${testData.status}`} style={{ marginLeft: '12px' }}>
              {testData.status?.replace('_', ' ')}
            </span>
          </h1>
          <p>Configure bilingual titles, scoring, joint-constraint blueprint distribution, and publication snapshots.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={handleSaveDraft} disabled={saving} data-testid="save-draft-btn">
            {saving ? 'Saving...' : 'Save Draft Settings'}
          </button>
        </div>
      </div>

      {error && (
        <div className="shortage-banner" style={{ marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div className="success-banner" style={{ marginBottom: '20px' }}>
          {successMsg}
        </div>
      )}

      {/* 5-Step Stepper Header */}
      <div className="wizard-stepper" data-testid="wizard-stepper">
        {[
          { step: 1, label: '1. Basic Details' },
          { step: 2, label: '2. Scoring & Settings' },
          { step: 3, label: '3. Question Selection' },
          { step: 4, label: '4. Review & Validation' },
          { step: 5, label: '5. Workflow & Publish' },
        ].map((item) => (
          <div
            key={item.step}
            className={`step-item ${activeStep === item.step ? 'active' : ''} ${activeStep > item.step ? 'completed' : ''}`}
            onClick={() => setActiveStep(item.step)}
            data-testid={`step-tab-${item.step}`}
          >
            <div className="step-number">{item.step}</div>
            <div className="step-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* STEP 1: BASIC DETAILS */}
      {activeStep === 1 && (
        <div className="form-card" data-testid="step-1-card">
          <h2>Step 1: Basic Details</h2>
          <div className="form-grid">
            <div className="field-group">
              <label className="field-label">Test Code (Auto-Generated)</label>
              <input type="text" className="field-input" value={testData.code} readOnly style={{ background: '#F1F5F9' }} />
            </div>

            <div className="field-group">
              <label className="field-label">Access Classification</label>
              <select
                className="field-select"
                value={testData.accessClassification}
                onChange={(e) => setTestData({ ...testData, accessClassification: e.target.value })}
                data-testid="access-classification-select"
              >
                <option value="FREE">FREE</option>
                <option value="PAID">PAID</option>
                <option value="FREEMIUM">FREEMIUM</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Test Title (English) *</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. KAS Prelims General Studies Mock Test 01"
                value={testData.titleEn}
                onChange={(e) => setTestData({ ...testData, titleEn: e.target.value })}
                data-testid="title-en-input"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Test Title (Kannada) *</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. ಕೆಎಎಸ್ ಪ್ರಿಲಿಮ್ಸ್ ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಮಾದರಿ ಪರೀಕ್ಷೆ 01"
                value={testData.titleKn}
                onChange={(e) => setTestData({ ...testData, titleKn: e.target.value })}
                data-testid="title-kn-input"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Total Questions *</label>
              <input
                type="number"
                className="field-input"
                value={testData.totalQuestions}
                onChange={(e) => setTestData({ ...testData, totalQuestions: parseInt(e.target.value, 10) || 0 })}
                data-testid="total-questions-input"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Duration (Minutes) *</label>
              <input
                type="number"
                className="field-input"
                value={testData.durationMinutes}
                onChange={(e) => setTestData({ ...testData, durationMinutes: parseInt(e.target.value, 10) || 0 })}
                data-testid="duration-input"
              />
            </div>

            <div className="field-group form-grid-full">
              <label className="field-label">Description (English)</label>
              <textarea
                className="field-textarea"
                rows={2}
                value={testData.descriptionEn || ''}
                onChange={(e) => setTestData({ ...testData, descriptionEn: e.target.value })}
              />
            </div>

            <div className="field-group form-grid-full">
              <label className="field-label">Description (Kannada)</label>
              <textarea
                className="field-textarea"
                rows={2}
                value={testData.descriptionKn || ''}
                onChange={(e) => setTestData({ ...testData, descriptionKn: e.target.value })}
              />
            </div>
          </div>

          <div className="wizard-footer" style={{ marginTop: '24px' }}>
            <span />
            <button className="btn-primary" onClick={() => setActiveStep(2)}>
              Next: Scoring & Settings →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SCORING & SETTINGS */}
      {activeStep === 2 && (
        <div className="form-card" data-testid="step-2-card">
          <h2>Step 2: Scoring Policy & Settings</h2>
          <div className="form-grid">
            <div className="field-group form-grid-full">
              <label className="field-label">Scoring Policy Mode</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scoringPolicy"
                    value="TEST_DEFAULT"
                    checked={testData.scoringPolicy === 'TEST_DEFAULT'}
                    onChange={() => setTestData({ ...testData, scoringPolicy: 'TEST_DEFAULT' })}
                    data-testid="scoring-policy-test"
                  />
                  <strong>(●) Use Test Scoring Policy</strong> (Uniform marks applied across all questions)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scoringPolicy"
                    value="MCQ_DEFAULT"
                    checked={testData.scoringPolicy === 'MCQ_DEFAULT'}
                    onChange={() => setTestData({ ...testData, scoringPolicy: 'MCQ_DEFAULT' })}
                    data-testid="scoring-policy-mcq"
                  />
                  <strong>( ) Use MCQ Default Scoring</strong> (Each MCQ contributes its individual positive/negative marks)
                </label>
              </div>
            </div>

            {testData.scoringPolicy === 'TEST_DEFAULT' && (
              <>
                <div className="field-group">
                  <label className="field-label">Positive Marks per Question (+)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="field-input"
                    value={testData.positiveMarks}
                    onChange={(e) => setTestData({ ...testData, positiveMarks: parseFloat(e.target.value) || 0 })}
                    data-testid="positive-marks-input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Negative Marks Deduction (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="field-input"
                    value={testData.negativeMarks}
                    onChange={(e) => setTestData({ ...testData, negativeMarks: parseFloat(e.target.value) || 0 })}
                    data-testid="negative-marks-input"
                  />
                </div>
              </>
            )}

            <div className="field-group">
              <label className="field-label">Passing Percentage (%)</label>
              <input
                type="number"
                className="field-input"
                value={testData.passingPercentage}
                onChange={(e) => setTestData({ ...testData, passingPercentage: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">PYQ Preference Filter</label>
              <select
                className="field-select"
                value={testData.pyqPreference}
                onChange={(e) => setTestData({ ...testData, pyqPreference: e.target.value })}
                data-testid="pyq-preference-select"
              >
                <option value="ANY">ANY (Include both Original and PYQs)</option>
                <option value="EXCLUDE_PYQ">EXCLUDE PYQs (Original Questions Only)</option>
                <option value="PYQ_ONLY">PYQs ONLY (Previous Year Questions Only)</option>
              </select>
            </div>
          </div>

          <div className="wizard-footer" style={{ marginTop: '24px' }}>
            <button className="btn-secondary" onClick={() => setActiveStep(1)}>
              ← Back
            </button>
            <button className="btn-primary" onClick={() => setActiveStep(3)}>
              Next: Question Selection →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: QUESTION SELECTION */}
      {activeStep === 3 && (
        <div className="form-card" data-testid="step-3-card">
          <h2>Step 3: Question Selection Mode</h2>

          <div className="mode-cards-container">
            <div
              className={`mode-card ${testData.selectionMode === 'MANUAL' ? 'selected' : ''}`}
              onClick={() => setTestData({ ...testData, selectionMode: 'MANUAL' })}
              data-testid="manual-mode-card"
            >
              <h3>MANUAL SELECTION</h3>
              <p>Hand-pick approved canonical MCQs from the question library using category, difficulty, and PYQ filters.</p>
            </div>

            <div
              className={`mode-card ${testData.selectionMode === 'AUTOMATIC' ? 'selected' : ''}`}
              onClick={() => setTestData({ ...testData, selectionMode: 'AUTOMATIC' })}
              data-testid="auto-mode-card"
            >
              <h3>AUTOMATIC SELECTION</h3>
              <p>Configure Category, Subcategory, and Difficulty blueprints and let the joint constraint engine select questions.</p>
            </div>
          </div>

          {/* MANUAL MODE UI */}
          {testData.selectionMode === 'MANUAL' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <strong>Selected Questions:</strong> {selectedQuestionIds.length} / {testData.totalQuestions}
                </div>
                <button className="btn-primary" onClick={openManualPicker} data-testid="open-picker-btn">
                  🔍 Open Question Picker
                </button>
              </div>

              {selectedQuestionIds.length === 0 ? (
                <div style={{ padding: '24px', background: '#F8FAFC', textAlign: 'center', color: '#64748B', borderRadius: '8px' }}>
                  No questions selected yet. Click <strong>Open Question Picker</strong> to add eligible MCQs.
                </div>
              ) : (
                <table className="distribution-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question Code</th>
                      <th>Category</th>
                      <th>Difficulty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testData.questions.map((q: any, idx: number) => (
                      <tr key={q.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{q.question?.code || q.questionId}</strong>
                        </td>
                        <td>{q.question?.category?.nameEn || 'General'}</td>
                        <td>{q.question?.difficulty}</td>
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#DC2626' }}
                            onClick={() => {
                              const newIds = selectedQuestionIds.filter((qid) => qid !== q.questionId);
                              setSelectedQuestionIds(newIds);
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* AUTOMATIC BLUEPRINT UI */}
          {testData.selectionMode === 'AUTOMATIC' && (
            <div>
              <h3 style={{ fontSize: '15px', color: '#084B7A', marginBottom: '12px' }}>Category Allocation Blueprint</h3>
              <table className="distribution-table" data-testid="category-distribution-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Target Count</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const cd = testData.categoryDistributions.find((item: any) => item.categoryId === cat.id);
                    const currentTarget = cd ? cd.targetCount : 0;
                    return (
                      <tr key={cat.id}>
                        <td>
                          <strong>{cat.nameEn}</strong> ({cat.code})
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #DCE6EE' }}
                            value={currentTarget || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === '' ? 0 : parseInt(raw, 10);
                              const updated = testData.categoryDistributions.filter((item: any) => item.categoryId !== cat.id);
                              if (val > 0) updated.push({ categoryId: cat.id, targetCount: val });
                              setTestData({ ...testData, categoryDistributions: updated });
                            }}
                            data-testid={`cat-input-${cat.code}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <h3 style={{ fontSize: '15px', color: '#084B7A', marginTop: '24px', marginBottom: '12px' }}>
                Difficulty Allocation Blueprint
              </h3>
              <table className="distribution-table" data-testid="difficulty-distribution-table">
                <thead>
                  <tr>
                    <th>Difficulty Level</th>
                    <th>Target Count</th>
                  </tr>
                </thead>
                <tbody>
                  {['EASY', 'MEDIUM', 'HARD'].map((diff) => {
                    const dd = testData.difficultyDistributions.find((item: any) => item.difficulty === diff);
                    const currentTarget = dd ? dd.targetCount : 0;
                    return (
                      <tr key={diff}>
                        <td>
                          <strong>{diff}</strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #DCE6EE' }}
                            value={currentTarget || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const val = raw === '' ? 0 : parseInt(raw, 10);
                              const updated = testData.difficultyDistributions.filter((item: any) => item.difficulty !== diff);
                              if (val > 0) updated.push({ difficulty: diff, targetCount: val });
                              setTestData({ ...testData, difficultyDistributions: updated });
                            }}
                            data-testid={`diff-input-${diff}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={runAvailabilityCheck} disabled={checkingAvail} data-testid="check-availability-btn">
                  {checkingAvail ? 'Checking Availability...' : '⚡ Check Pool Availability'}
                </button>
                <button className="btn-primary" onClick={handleAutoGenerate} disabled={saving} data-testid="auto-generate-btn">
                  {saving ? 'Generating...' : '🚀 Generate Automatic Question Selection'}
                </button>
              </div>

              {availabilityResult && (
                <div style={{ marginTop: '16px' }} data-testid="availability-result">
                  {availabilityResult.isFeasible ? (
                    <div className="success-banner" data-testid="availability-success">
                      ✓ <strong>Pool Available:</strong> Eligible question pool ({availabilityResult.totalAvailableEligiblePool}) is sufficient to generate this test!
                    </div>
                  ) : (
                    <div className="shortage-banner" data-testid="shortage-error">
                      ⚠️ <strong>Shortage Warning:</strong> Unable to generate test with requested configuration.
                      <ul>
                        {availabilityResult.shortages.map((s: any, idx: number) => (
                          <li key={idx}>
                            {s.nameEn} ({s.dimension}): Required {s.required}, Available {s.available} (Shortage: {s.shortage})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="wizard-footer" style={{ marginTop: '24px' }}>
            <button className="btn-secondary" onClick={() => setActiveStep(2)}>
              ← Back
            </button>
            <button className="btn-primary" onClick={() => setActiveStep(4)}>
              Next: Review & Validation →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & VALIDATION */}
      {activeStep === 4 && (() => {
        const currentSelectedCount = testData.selectionMode === 'MANUAL' ? selectedQuestionIds.length : testData.questions.length;
        const isTitleValid = Boolean(testData.titleEn?.trim()?.length >= 3 && testData.titleKn?.trim()?.length >= 3);
        const isDurationValid = Boolean(testData.durationMinutes >= 1);
        const isExactCountMatch = currentSelectedCount === testData.totalQuestions;
        const catSum = (testData.categoryDistributions || []).reduce((acc: number, c: any) => acc + (c.targetCount || 0), 0);
        const diffSum = (testData.difficultyDistributions || []).reduce((acc: number, d: any) => acc + (d.targetCount || 0), 0);
        const isCatDistValid = testData.categoryDistributions.length === 0 || catSum === testData.totalQuestions;
        const isDiffDistValid = testData.difficultyDistributions.length === 0 || diffSum === testData.totalQuestions;
        const canCreate = isTitleValid && isDurationValid && isExactCountMatch && isCatDistValid && isDiffDistValid;

        return (
          <div className="form-card" data-testid="step-4-card">
            <h2>Step 4: Review Test Composition & Blueprint Validation</h2>

            {/* TEST CREATION READINESS CARD */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #084B7A',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
              data-testid="readiness-card"
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#084B7A', fontSize: '16px', fontWeight: 700 }}>
                TEST CREATION READINESS
              </h3>
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Basic Details</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isTitleValid ? '#16A34A' : '#DC2626' }}>
                      {isTitleValid ? '✓' : '✕'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Exam Hierarchy</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Scoring Configuration</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Question Count</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isExactCountMatch ? '#16A34A' : '#DC2626' }}>
                      {currentSelectedCount} / {testData.totalQuestions}{' '}
                      {isExactCountMatch
                        ? '✓'
                        : `✕ (${testData.totalQuestions - currentSelectedCount} additional questions required)`}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Category Blueprint</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isCatDistValid ? '#16A34A' : '#DC2626' }}>
                      {isCatDistValid ? '✓' : `✕ (Sum ${catSum} !== ${testData.totalQuestions})`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', fontWeight: 500 }}>Difficulty Blueprint</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: isDiffDistValid ? '#16A34A' : '#DC2626' }}>
                      {isDiffDistValid ? '✓' : `✕ (Sum ${diffSum} !== ${testData.totalQuestions})`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {!isEdit && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: '15px', fontWeight: 700 }}
                    onClick={handleSaveDraft}
                    disabled={!canCreate || saving}
                    data-testid="create-test-gate-btn"
                  >
                    {saving ? 'Creating Test...' : 'Create Test'}
                  </button>
                  {!canCreate && (
                    <div style={{ marginTop: '8px', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>
                      {!isExactCountMatch
                        ? `${testData.totalQuestions - currentSelectedCount} more question(s) required to create Test.`
                        : 'Resolve blocking requirements before creating this Test.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {testData.isBlueprintValid ? (
              <div className="success-banner" style={{ marginBottom: '20px' }}>
                ✓ <strong>Blueprint Valid:</strong> Test question composition matches configured total questions and blueprint rules.
              </div>
            ) : (
              <div className="shortage-banner" style={{ marginBottom: '20px' }}>
                ⚠️ <strong>Blueprint Errors Detected:</strong>
                <ul>
                  {testData.blueprintErrors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <h3>Selected Questions ({testData.questions.length} / {testData.totalQuestions})</h3>
            <table className="distribution-table" data-testid="review-questions-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>MCQ ID</th>
                  <th>Question Preview (English / Kannada)</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testData.questions.map((tq: any, idx: number) => (
                  <tr key={tq.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <span className="test-code-badge">{tq.question?.code || tq.questionId}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tq.question?.questionTextEn}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>{tq.question?.questionTextKn}</div>
                    </td>
                    <td>{tq.question?.category?.nameEn || 'General'}</td>
                    <td>{tq.selectedDifficulty || tq.question?.difficulty}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openReplaceModal(tq.questionId)}
                        data-testid={`replace-btn-${tq.questionId}`}
                      >
                        🔄 Replace Question
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setActiveStep(3)}>
                ← Back
              </button>
              <button className="btn-primary" onClick={() => setActiveStep(5)}>
                Next: Workflow & Publish →
              </button>
            </div>
          </div>
        );
      })()}

      {/* STEP 5: WORKFLOW ACTIONS */}
      {activeStep === 5 && (
        <div className="form-card" data-testid="step-5-card">
          <h2>Step 5: Workflow State & Publication Management</h2>
          <p style={{ color: '#64748B' }}>
            Current Status: <strong style={{ color: '#084B7A' }}>{testData.status}</strong>
          </p>

          <div style={{ display: 'flex', gap: '14px', marginTop: '20px', flexWrap: 'wrap' }}>
            {(testData.status === 'DRAFT' || testData.status === 'CHANGES_REQUESTED') && (
              <button className="btn-primary" onClick={handleSubmitReview} disabled={saving} data-testid="submit-review-btn">
                Submit for Review
              </button>
            )}

            {testData.status === 'REVIEW_PENDING' && (
              <>
                <button className="btn-primary" onClick={handleApprove} disabled={saving} data-testid="approve-test-btn">
                  ✓ Approve Test
                </button>
                <button
                  className="btn-secondary"
                  style={{ color: '#DC2626' }}
                  onClick={() => setShowRejectModal(true)}
                  disabled={saving}
                  data-testid="request-changes-btn"
                >
                  Request Changes
                </button>
              </>
            )}

            {testData.status === 'APPROVED' && (
              <button
                className="btn-primary"
                style={{ backgroundColor: '#059669' }}
                onClick={handlePublish}
                disabled={saving}
                data-testid="publish-test-btn"
              >
                🚀 Publish Test & Freeze Snapshots
              </button>
            )}

            {testData.status !== 'ARCHIVED' && (
              <button
                className="btn-secondary"
                style={{ color: '#64748B' }}
                onClick={handleArchive}
                disabled={saving}
                data-testid="archive-test-btn"
              >
                Archive Test
              </button>
            )}
          </div>
        </div>
      )}

      {/* MANUAL QUESTION PICKER MODAL */}
      {showPickerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Manual Question Picker</h3>
              <button onClick={() => setShowPickerModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Search question text or code..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <select
                  className="field-input"
                  style={{ width: '180px' }}
                  value={pickerCategory}
                  onChange={(e) => setPickerCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
                <select
                  className="field-input"
                  style={{ width: '140px' }}
                  value={pickerDifficulty}
                  onChange={(e) => setPickerDifficulty(e.target.value)}
                >
                  <option value="">All Difficulties</option>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
                <button className="btn-secondary" onClick={openManualPicker}>
                  Filter
                </button>
              </div>

              {pickerLoading ? (
                <div>Loading questions...</div>
              ) : (
                <table className="distribution-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Code</th>
                      <th>Question Text (English)</th>
                      <th>Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <tr key={q.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedQuestionIds.length >= testData.totalQuestions) {
                                    alert(`Question limit reached. This Test requires exactly ${testData.totalQuestions} questions.`);
                                    return;
                                  }
                                  setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                                } else {
                                  setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== q.id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <strong>{q.code}</strong>
                          </td>
                          <td>{q.questionTextEn}</td>
                          <td>{q.difficulty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <span>
                Selected: {selectedQuestionIds.length} / {testData.totalQuestions}
              </span>
              <button className="btn-secondary" onClick={() => setShowPickerModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveManualSelection} disabled={saving}>
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE QUESTION MODAL */}
      {showReplaceModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Replace Question</h3>
              <button onClick={() => setShowReplaceModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                Replacing question. Selected replacement must match category ({replaceCategoryFilter}) and difficulty ({replaceDifficultyFilter}) constraints to preserve blueprint.
              </p>
              <table className="distribution-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Code</th>
                    <th>Question Text</th>
                    <th>Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {replacePool.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <input
                          type="radio"
                          name="replaceNewQuestion"
                          value={q.id}
                          checked={selectedNewQuestionId === q.id}
                          onChange={() => setSelectedNewQuestionId(q.id)}
                        />
                      </td>
                      <td>
                        <strong>{q.code}</strong>
                      </td>
                      <td>{q.questionTextEn}</td>
                      <td>{q.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowReplaceModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleExecuteReplace} disabled={!selectedNewQuestionId || saving}>
                Confirm Replacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Request Changes</h3>
              <button onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Rejection Reason *</label>
              <textarea
                className="field-textarea"
                rows={4}
                placeholder="Explain what needs to be changed..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleRequestChanges} disabled={saving}>
                Send Changes Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TestFormPage;
