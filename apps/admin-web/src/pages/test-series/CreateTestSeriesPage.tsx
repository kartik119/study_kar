import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TestSeriesReleaseMode,
  SeriesQuestionReusePolicy,
  SeriesTestEntryType,
  TestAccessClassification,
} from '@study-karnataka/shared-types';
import { TestSeriesApi } from '../../api/test-series.api';

export const CreateTestSeriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [step, setStep] = useState<number>(1);
  const [nextCodePreview, setNextCodePreview] = useState<string>('TS_000001');

  // Form State
  const [titleEn, setTitleEn] = useState('');
  const [titleKn, setTitleKn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionKn, setDescriptionKn] = useState('');
  const [instructionsEn, setInstructionsEn] = useState('');
  const [instructionsKn, setInstructionsKn] = useState('');
  const [examProgrammeId, setExamProgrammeId] = useState('');
  const [examStageId, setExamStageId] = useState('');
  const [examPaperId, setExamPaperId] = useState('');
  const [accessClassification, setAccessClassification] = useState<TestAccessClassification>('FREE');
  const [releaseMode, setReleaseMode] = useState<TestSeriesReleaseMode>('ALL_AVAILABLE');
  const [questionReusePolicy, setQuestionReusePolicy] = useState<SeriesQuestionReusePolicy>('NO_REPEAT');

  // Included Tests State
  const [selectedTests, setSelectedTests] = useState<
    {
      mockTestId: string;
      code: string;
      titleEn: string;
      titleKn: string;
      totalQuestions: number;
      durationMinutes: number;
      status: string;
      orderIndex: number;
      entryType: SeriesTestEntryType;
      availableFrom?: string;
    }[]
  >([]);

  // Candidate Test Picker State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [candidateTests, setCandidateTests] = useState<any[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  // Exam dropdown data
  const [examProgrammes, setExamProgrammes] = useState<any[]>([]);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExamProgrammes();
    if (!isEdit) {
      loadCodePreview();
    } else {
      loadExistingSeries();
    }
  }, [id]);

  const loadCodePreview = async () => {
    try {
      const res = await TestSeriesApi.getNextSeriesCodePreview();
      setNextCodePreview(res.code);
    } catch (err) {
      console.error('Failed to preview next series code', err);
    }
  };

  const loadExamProgrammes = async () => {
    try {
      const data = await TestSeriesApi.getExamProgrammes();
      setExamProgrammes(data);
    } catch (err) {
      console.error('Failed to load exam programmes', err);
    }
  };

  const loadExistingSeries = async () => {
    if (!id) return;
    try {
      const s = await TestSeriesApi.getTestSeriesById(id);
      setTitleEn(s.titleEn);
      setTitleKn(s.titleKn);
      setDescriptionEn(s.descriptionEn || '');
      setDescriptionKn(s.descriptionKn || '');
      setInstructionsEn(s.instructionsEn || '');
      setInstructionsKn(s.instructionsKn || '');
      setExamProgrammeId(s.examProgrammeId);
      setExamStageId(s.examStageId || '');
      setExamPaperId(s.examPaperId || '');
      setAccessClassification(s.accessClassification);
      setReleaseMode(s.releaseMode);
      setQuestionReusePolicy(s.questionReusePolicy);
      setNextCodePreview(s.code);

      const testsMap = s.tests.map((st) => ({
        mockTestId: st.mockTestId,
        code: st.mockTest?.code || st.mockTestId,
        titleEn: st.mockTest?.titleEn || 'Test',
        titleKn: st.mockTest?.titleKn || 'Test KN',
        totalQuestions: st.mockTest?.totalQuestions || 0,
        durationMinutes: st.mockTest?.durationMinutes || 60,
        status: st.mockTest?.status || 'DRAFT',
        orderIndex: st.orderIndex,
        entryType: st.entryType || 'PRACTICE',
        availableFrom: st.availableFrom || undefined,
      }));
      setSelectedTests(testsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load test series');
    }
  };

  const openTestPicker = async () => {
    if (!examProgrammeId) {
      alert('Please select an Exam Programme first in Step 1!');
      return;
    }
    setIsPickerOpen(true);
    setPickerLoading(true);
    try {
      const candidates = await TestSeriesApi.getEligibleTestsForSeries({
        examProgrammeId,
        seriesId: id,
        search: pickerSearch,
      });
      setCandidateTests(candidates);
    } catch (err: any) {
      alert(err.message || 'Failed to search candidate tests');
    } finally {
      setPickerLoading(false);
    }
  };

  const addTestToSeries = (t: any) => {
    if (selectedTests.some((st) => st.mockTestId === t.id)) {
      alert('This Test is already added to the series!');
      return;
    }
    const newEntry = {
      mockTestId: t.id,
      code: t.code,
      titleEn: t.titleEn,
      titleKn: t.titleKn,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
      status: t.status,
      orderIndex: selectedTests.length + 1,
      entryType: 'PRACTICE' as SeriesTestEntryType,
    };
    setSelectedTests([...selectedTests, newEntry]);
    setIsPickerOpen(false);
  };

  const removeTest = (index: number) => {
    const updated = selectedTests.filter((_, i) => i !== index);
    // re-index orderIndex
    const reindexed = updated.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setSelectedTests(reindexed);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...selectedTests];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    const reindexed = copy.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setSelectedTests(reindexed);
  };

  const moveDown = (index: number) => {
    if (index === selectedTests.length - 1) return;
    const copy = [...selectedTests];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    const reindexed = copy.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setSelectedTests(reindexed);
  };

  const updateEntryType = (index: number, entryType: SeriesTestEntryType) => {
    const copy = [...selectedTests];
    copy[index].entryType = entryType;
    setSelectedTests(copy);
  };

  const updateScheduledDate = (index: number, availableFrom: string) => {
    const copy = [...selectedTests];
    copy[index].availableFrom = availableFrom;
    setSelectedTests(copy);
  };

  const handleSaveSeries = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        titleEn,
        titleKn,
        descriptionEn,
        descriptionKn,
        instructionsEn,
        instructionsKn,
        examProgrammeId,
        examStageId: examStageId || undefined,
        examPaperId: examPaperId || undefined,
        accessClassification,
        releaseMode,
        questionReusePolicy,
        tests: selectedTests.map((t) => ({
          mockTestId: t.mockTestId,
          orderIndex: t.orderIndex,
          entryType: t.entryType,
          availableFrom: t.availableFrom || undefined,
        })),
      };

      if (isEdit && id) {
        await TestSeriesApi.updateTestSeries(id, payload);
        navigate(`/mcq-library/test-series/${id}`);
      } else {
        const created = await TestSeriesApi.createTestSeries(payload);
        navigate(`/mcq-library/test-series/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save test series');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="header-titles">
          <div className="test-code-badge">{nextCodePreview}</div>
          <h1>{isEdit ? 'Edit Test Series' : 'Create Test Series Wizard'}</h1>
          <p>Configure test series details, exam access, ordering, and schedule.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/mcq-library/test-series')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md font-medium">
          {error}
        </div>
      )}

      {/* Stepper Tabs */}
      <div className="wizard-stepper">
        {[
          { num: 1, label: 'Series Details' },
          { num: 2, label: 'Exam & Access' },
          { num: 3, label: 'Add Tests' },
          { num: 4, label: 'Ordering & Schedule' },
          { num: 5, label: 'Review & Save' },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`step-item ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
          >
            <div className="step-number">{s.num}</div>
            <div className="step-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="form-card">
        {step === 1 && (
          <div>
            <h2>Step 1: Series Details</h2>
            <div className="form-grid">
              <div className="field-group form-grid-full">
                <label className="field-label">Series Title (English) *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. KAS Prelims 2026 — Full Mock Test Series"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
              </div>
              <div className="field-group form-grid-full">
                <label className="field-label">Series Title (Kannada) *</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. ಕೆಎಎಸ್ ಪೂರ್ವಭಾವಿ 2026 — ಪೂರ್ಣ ಮಾದರಿ ಪರೀಕ್ಷಾ ಸರಣಿ"
                  value={titleKn}
                  onChange={(e) => setTitleKn(e.target.value)}
                />
              </div>
              <div className="field-group form-grid-full">
                <label className="field-label">Description (English)</label>
                <textarea
                  className="field-input"
                  rows={3}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                />
              </div>
              <div className="field-group form-grid-full">
                <label className="field-label">Description (Kannada)</label>
                <textarea
                  className="field-input"
                  rows={3}
                  value={descriptionKn}
                  onChange={(e) => setDescriptionKn(e.target.value)}
                />
              </div>
            </div>
            
            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <span />
              <button
                onClick={() => setStep(2)}
                className="btn-primary"
              >
                Next: Exam & Access →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Step 2: Exam & Access Classification</h2>
            <div className="form-grid">
              <div className="field-group form-grid-full">
                <label className="field-label">Exam Programme *</label>
                <select
                  className="field-select"
                  value={examProgrammeId}
                  onChange={(e) => setExamProgrammeId(e.target.value)}
                >
                  <option value="">Select Exam Programme...</option>
                  {examProgrammes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Access Classification</label>
                <select
                  className="field-select"
                  value={accessClassification}
                  onChange={(e) => setAccessClassification(e.target.value as TestAccessClassification)}
                >
                  <option value="FREE">Free</option>
                  <option value="PAID">Paid</option>
                  <option value="FREEMIUM">Freemium</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Question Reuse Policy</label>
                <select
                  className="field-select"
                  value={questionReusePolicy}
                  onChange={(e) => setQuestionReusePolicy(e.target.value as SeriesQuestionReusePolicy)}
                >
                  <option value="NO_REPEAT">No Repeat (Strict Unique Questions)</option>
                  <option value="ALLOW_REPEATS">Allow Repeats (Practice Only)</option>
                </select>
              </div>
            </div>

            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary"
              >
                Next: Add Tests →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827]">Step 3: Add Tests to Series</h2>
                <p className="text-xs text-[#64748B]">
                  Selected Tests: {selectedTests.length} | Total Questions:{' '}
                  {selectedTests.reduce((acc, curr) => acc + curr.totalQuestions, 0)}
                </p>
              </div>
              <button
                onClick={openTestPicker}
                className="px-4 py-2 bg-[#084B7A] text-white text-sm font-medium rounded hover:bg-[#004475]"
              >
                + Add Tests from Library
              </button>
            </div>

            {/* Test List Table */}
            {selectedTests.length === 0 ? (
              <div className="p-8 border border-dashed border-[#DCE6EE] rounded-lg text-center text-[#64748B] text-sm">
                No Tests added yet. Click "+ Add Tests from Library" to select completed tests for this Series.
              </div>
            ) : (
              <div className="border border-[#DCE6EE] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm text-[#334155]">
                  <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] border-b border-[#DCE6EE]">
                    <tr>
                      <th className="p-3"># Order</th>
                      <th className="p-3">Test Code</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Questions</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE6EE]">
                    {selectedTests.map((t, i) => (
                      <tr key={t.mockTestId} className="hover:bg-[#F4F8FB]">
                        <td className="p-3 font-bold text-[#084B7A]">{t.orderIndex}</td>
                        <td className="p-3 font-mono text-xs font-semibold">{t.code}</td>
                        <td className="p-3 font-medium text-[#111827]">{t.titleEn}</td>
                        <td className="p-3 text-xs">{t.totalQuestions} Questions</td>
                        <td className="p-3 text-xs">
                          <select
                            value={t.entryType}
                            onChange={(e) => updateEntryType(i, e.target.value as SeriesTestEntryType)}
                            className="px-2 py-1 border border-[#DCE6EE] rounded bg-white text-xs"
                          >
                            <option value="PRACTICE">Practice</option>
                            <option value="RANKED">Ranked</option>
                          </select>
                        </td>
                        <td className="p-3 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              t.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => moveUp(i)}
                            disabled={i === 0}
                            className="px-2 py-1 border border-[#DCE6EE] rounded text-xs disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveDown(i)}
                            disabled={i === selectedTests.length - 1}
                            className="px-2 py-1 border border-[#DCE6EE] rounded text-xs disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeTest(i)}
                            className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded hover:bg-rose-100"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setStep(2)}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="btn-primary"
              >
                Next: Ordering & Schedule →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2>Step 4: Release Schedule Configuration</h2>
            <div className="form-grid">
              <div className="field-group form-grid-full">
                <label className="field-label">Release Mode</label>
                <select
                  className="field-select"
                  value={releaseMode}
                  onChange={(e) => setReleaseMode(e.target.value as TestSeriesReleaseMode)}
                >
                  <option value="ALL_AVAILABLE">All Available (All tests unlocked immediately)</option>
                  <option value="SCHEDULED">Scheduled (Unlocks on specific date/time)</option>
                  <option value="SEQUENTIAL">Sequential (Unlocks in sequence order)</option>
                </select>
              </div>

              {releaseMode === 'SCHEDULED' && (
                <div className="field-group form-grid-full">
                  <label className="field-label" style={{ marginBottom: '12px' }}>Scheduled Release Timestamps</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedTests.map((t, i) => (
                      <div key={t.mockTestId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #E6EAF0', borderRadius: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                          #{t.orderIndex} {t.titleEn}
                        </span>
                        <input
                          type="datetime-local"
                          className="field-input"
                          style={{ width: 'auto' }}
                          value={t.availableFrom ? t.availableFrom.slice(0, 16) : ''}
                          onChange={(e) => updateScheduledDate(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setStep(3)}
                className="btn-secondary"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="btn-primary"
              >
                Next: Review & Save →
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-[#111827]">Step 5: Review & Create Test Series</h2>

            <div className="grid grid-cols-2 gap-4 text-xs border border-[#DCE6EE] p-4 rounded-lg bg-[#F7F9FC]">
              <div>
                <span className="font-semibold text-[#64748B]">Series Code:</span>{' '}
                <span className="font-mono font-bold text-[#084B7A]">{nextCodePreview}</span>
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Exam Programme:</span> {examProgrammeId}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">English Title:</span> {titleEn}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Kannada Title:</span> {titleKn}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Access:</span> {accessClassification}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Release Mode:</span> {releaseMode}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Reuse Policy:</span> {questionReusePolicy}
              </div>
              <div>
                <span className="font-semibold text-[#64748B]">Total Included Tests:</span> {selectedTests.length}
              </div>
            </div>

            <div className="wizard-footer" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setStep(4)}
                className="btn-secondary"
                disabled={isSaving}
              >
                ← Back
              </button>
              <button
                onClick={handleSaveSeries}
                disabled={isSaving}
                className="btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                {isSaving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Test Series')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Test Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-3">
              <h3 className="text-base font-bold text-[#111827]">Test Picker — Candidate Tests</h3>
              <button onClick={() => setIsPickerOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search Test Code or Title..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#DCE6EE] rounded text-sm"
              />
              <button
                onClick={openTestPicker}
                className="px-4 py-2 bg-[#084B7A] text-white text-sm font-medium rounded"
              >
                Search
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#DCE6EE]">
              {pickerLoading ? (
                <div className="p-8 text-center text-sm text-[#64748B]">Loading candidate tests...</div>
              ) : candidateTests.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#64748B]">
                  No candidate tests found for this Exam Programme.
                </div>
              ) : (
                candidateTests.map((t) => (
                  <div key={t.id} className="p-3 flex items-center justify-between hover:bg-[#F4F8FB]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#084B7A]">{t.code}</span>
                        <span className="text-sm font-medium text-[#111827]">{t.titleEn}</span>
                      </div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {t.totalQuestions} Questions | {t.durationMinutes} min | Status: {t.status}
                      </div>
                      {t.hasOverlapConflict && (
                        <div className="text-[11px] text-amber-700 font-semibold mt-1">
                          ⚠️ {t.overlapCountWithSeries} Question(s) already used in this Series
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addTestToSeries(t)}
                      className="px-3 py-1 bg-[#084B7A] text-white text-xs font-medium rounded hover:bg-[#004475]"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#DCE6EE] text-right">
              <button
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-2 border border-[#DCE6EE] text-sm rounded hover:bg-[#F4F8FB]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
