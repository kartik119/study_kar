import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankedTestMode, RankedSolutionReleasePolicy } from '@study-karnataka/shared-types';
import { RankedTestApi } from '../../api/ranked-test.api';

export const CreateRankedTestPage: React.FC = () => {
  const navigate = useNavigate();

  const [nextCodePreview, setNextCodePreview] = useState<string>('RANKED_000001');
  const [candidateTests, setCandidateTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [mockTestId, setMockTestId] = useState('');
  const [mode, setMode] = useState<RankedTestMode>('ANYTIME_RANKED');
  const [availableFrom, setAvailableFrom] = useState('');
  const [startDeadlineAt, setStartDeadlineAt] = useState('');
  const [scheduledStartAt, setScheduledStartAt] = useState('');
  const [scheduledEndAt, setScheduledEndAt] = useState('');
  const [latestJoinAt, setLatestJoinAt] = useState('');
  const [solutionReleasePolicy, setSolutionReleasePolicy] = useState<RankedSolutionReleasePolicy>('AFTER_RESULTS_PUBLISHED');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [codeRes, testsRes] = await Promise.all([
        RankedTestApi.getNextRankedCodePreview(),
        RankedTestApi.getEligiblePublishedTests(),
      ]);
      setNextCodePreview(codeRes.code);
      setCandidateTests(testsRes);

      // Default dates
      const now = new Date();
      setAvailableFrom(now.toISOString().slice(0, 16));
      const tomorrow = new Date(now.getTime() + 86400000);
      setStartDeadlineAt(tomorrow.toISOString().slice(0, 16));

      const in2DaysStart = new Date(now.getTime() + 172800000);
      const in2DaysEnd = new Date(now.getTime() + 172800000 + 7200000);
      setScheduledStartAt(in2DaysStart.toISOString().slice(0, 16));
      setScheduledEndAt(in2DaysEnd.toISOString().slice(0, 16));
    } catch (err: any) {
      setError(err.message || 'Failed to initialize creation wizard');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTest = candidateTests.find((t) => t.id === mockTestId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockTestId) {
      alert('Please select a Published Mock Test');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: any = {
        mockTestId,
        mode,
        solutionReleasePolicy,
        availableFrom: new Date(availableFrom).toISOString(),
      };

      if (mode === 'ANYTIME_RANKED') {
        payload.startDeadlineAt = new Date(startDeadlineAt).toISOString();
      } else {
        payload.scheduledStartAt = new Date(scheduledStartAt).toISOString();
        payload.scheduledEndAt = new Date(scheduledEndAt).toISOString();
        if (latestJoinAt) {
          payload.latestJoinAt = new Date(latestJoinAt).toISOString();
        }
      }

      const created = await RankedTestApi.createRankedTest(payload);
      navigate(`/mcq-library/ranked-tests/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create Ranked Test configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-[#084B7A] uppercase bg-[#EAF3F9] px-2.5 py-1 rounded">
            {nextCodePreview}
          </span>
          <h1 className="text-xl font-bold text-[#111827] mt-2">Create Ranked Test Configuration</h1>
          <p className="text-xs text-[#64748B]">
            Configure competition mode, timing, and solution release rules for a Published Test.
          </p>
        </div>
        <button
          onClick={() => navigate('/mcq-library/ranked-tests')}
          className="px-3 py-1.5 border border-[#DCE6EE] text-sm text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-[#64748B]">Loading published candidate tests...</div>
      ) : candidateTests.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#DCE6EE] rounded-lg text-sm text-[#64748B]">
          No Published Tests available. Please publish a Test first in Mock Tests before configuring a Ranked Test.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 border border-[#DCE6EE] rounded-lg shadow-sm space-y-6">
          {/* 1. Select Published Test */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              Select Published Test <span className="text-rose-500">*</span>
            </label>
            <select
              value={mockTestId}
              onChange={(e) => setMockTestId(e.target.value)}
              className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white focus:ring-2 focus:ring-[#084B7A]"
            >
              <option value="">Select a Published Test...</option>
              {candidateTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.titleEn} ({t.totalQuestions} Questions | {t.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Test Read-Only Preview Panel */}
          {selectedTest && (
            <div className="p-4 bg-[#F7F9FC] border border-[#DCE6EE] rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#084B7A] text-sm">{selectedTest.titleEn}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">PUBLISHED</span>
              </div>
              <p className="text-[#64748B]">{selectedTest.titleKn}</p>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#DCE6EE]">
                <div>
                  <span className="text-[#64748B]">Questions:</span> <strong>{selectedTest.totalQuestions}</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Duration:</span> <strong>{selectedTest.durationMinutes} min</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Total Marks:</span> <strong>{selectedTest.totalMarks}</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Exam Cycle:</span> <strong>{selectedTest.examCycle?.titleEn || 'N/A'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 2. Select Ranked Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#334155]">
              Select Ranked Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setMode('ANYTIME_RANKED')}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  mode === 'ANYTIME_RANKED' ? 'border-[#084B7A] bg-[#F4F8FB]' : 'border-[#DCE6EE] hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-sm text-[#111827]">ANYTIME_RANKED</div>
                <div className="text-xs text-[#64748B] mt-1">
                  Students start at any time inside the start window and receive a full personal timed attempt (e.g. 120 min).
                </div>
              </div>

              <div
                onClick={() => setMode('SCHEDULED_LIVE')}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  mode === 'SCHEDULED_LIVE' ? 'border-[#084B7A] bg-[#F4F8FB]' : 'border-[#DCE6EE] hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-sm text-[#111827]">SCHEDULED_LIVE</div>
                <div className="text-xs text-[#64748B] mt-1">
                  All students share one global examination window (e.g. 10:00–12:00). Late entrants get remaining time only.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Mode Specific Timing Config */}
          {mode === 'ANYTIME_RANKED' ? (
            <div className="space-y-4 p-4 border border-[#DCE6EE] rounded-lg bg-[#F7F9FC]">
              <h3 className="text-xs font-bold text-[#111827] uppercase">Anytime Start Window Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Available From <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Last Start Time (startDeadlineAt) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDeadlineAt}
                    onChange={(e) => setStartDeadlineAt(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B]">
                💡 Final attempt deadline closes after: <strong>Last Start Time + Test Duration</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4 border border-[#DCE6EE] rounded-lg bg-[#F7F9FC]">
              <h3 className="text-xs font-bold text-[#111827] uppercase">Scheduled Live Examination Window</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Scheduled Start <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledStartAt}
                    onChange={(e) => setScheduledStartAt(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Scheduled End <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledEndAt}
                    onChange={(e) => setScheduledEndAt(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Latest Join Cutoff (Optional)</label>
                  <input
                    type="datetime-local"
                    value={latestJoinAt}
                    onChange={(e) => setLatestJoinAt(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B]">
                ⚠️ All participants share server end deadline ({scheduledEndAt || 'Scheduled End'}). Late joiners receive remaining time only.
              </p>
            </div>
          )}

          {/* 4. Solution Release Policy */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">Solution Release Policy</label>
            <select
              value={solutionReleasePolicy}
              onChange={(e) => setSolutionReleasePolicy(e.target.value as RankedSolutionReleasePolicy)}
              className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white focus:ring-2 focus:ring-[#084B7A]"
            >
              <option value="AFTER_RESULTS_PUBLISHED">
                AFTER_RESULTS_PUBLISHED (Solutions revealed only after official results publication)
              </option>
              <option value="NEVER">NEVER (Solutions are never revealed to students)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#DCE6EE] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/mcq-library/ranked-tests')}
              className="px-4 py-2 border border-[#DCE6EE] text-sm text-[#334155] rounded hover:bg-[#F4F8FB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-[#084B7A] text-white font-bold text-sm rounded hover:bg-[#004475] disabled:opacity-50 shadow"
            >
              {isSaving ? 'Creating...' : 'Create Ranked Test'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
