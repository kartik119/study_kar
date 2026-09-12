import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentRankedTestSummary } from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentPreStartPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [testSummary, setTestSummary] = useState<StudentRankedTestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (id) loadTestInfo();
  }, [id]);

  const loadTestInfo = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await StudentRankedTestApi.getStudentRankedTests();
      const found = list.find((item) => item.id === id);
      if (!found) {
        throw new Error('Ranked Test not found or unavailable');
      }
      setTestSummary(found);
    } catch (err: any) {
      setError(err.message || 'Failed to load test instructions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    if (!id) return;
    setIsStarting(true);
    setError(null);

    try {
      await StudentRankedTestApi.startOrResumeAttempt(id);
      setShowConfirmModal(false);
      navigate(`/ranked-tests/${id}/attempt`);
    } catch (err: any) {
      setError(err.message || 'Failed to start attempt');
      setShowConfirmModal(false);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[#64748B]">Loading Examination Instructions...</div>;
  }

  if (error || !testSummary) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">
          {error || 'Ranked Test unavailable'}
        </div>
        <button
          onClick={() => navigate('/ranked-tests')}
          className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Ranked Tests
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-[#084B7A] bg-[#EAF3F9] px-2 py-0.5 rounded">
            {testSummary.code}
          </span>
          <h1 className="text-xl font-bold text-[#111827] mt-1">{testSummary.title}</h1>
          <p className="text-xs text-[#64748B]">{testSummary.examTitle}</p>
        </div>
        <button
          onClick={() => navigate('/ranked-tests')}
          className="px-3 py-1.5 border border-[#DCE6EE] text-xs font-semibold text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back
        </button>
      </div>

      {/* Test Metadata Box */}
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-gray-100 pb-2">
          Examination Structure & Rules
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Total Questions</span>
            <div className="text-lg font-bold text-[#111827]">{testSummary.totalQuestions}</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Duration</span>
            <div className="text-lg font-bold text-[#084B7A]">{testSummary.durationMinutes} Minutes</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Mode</span>
            <div className="text-lg font-bold text-purple-700">
              {testSummary.mode === 'ANYTIME_RANKED' ? 'Anytime' : 'Live'}
            </div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Attempts Allowed</span>
            <div className="text-lg font-bold text-rose-700">1 Attempt</div>
          </div>
        </div>

        {/* Important Rules List */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
          <div className="font-bold">⚠️ Mandatory Examination Rules:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>One-Attempt Rule:</strong> Once you start this Ranked Test, your single attempt begins immediately. Retakes are strictly blocked.
            </li>
            <li>
              <strong>Server-Controlled Timer:</strong> Closing your browser or refreshing the page does <strong>NOT</strong> pause your server timer.
            </li>
            <li>
              <strong>Autosave:</strong> Every answer choice is automatically saved to the server in real-time.
            </li>
            <li>
              <strong>Bilingual Fairness:</strong> All students receive identical questions, order, and marks. Questions render in your locked preparation language.
            </li>
            <li>
              <strong>Results Publication:</strong> Correct answers, detailed explanations, and your official Karnataka State Rank will be published after the examination window closes.
            </li>
          </ul>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-6 py-2.5 bg-[#084B7A] text-white font-bold text-sm rounded-md hover:bg-[#004475] shadow-md transition-colors"
          >
            Start Ranked Test →
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Confirm Test Start</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Are you sure you want to start <strong>{testSummary.title}</strong>?
              <br />
              <span className="text-rose-600 font-bold mt-1 block">
                Your personal timer will begin immediately. You cannot restart or pause.
              </span>
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold rounded hover:bg-[#F4F8FB]"
              >
                Cancel
              </button>
              <button
                disabled={isStarting}
                onClick={handleStartAttempt}
                className="px-5 py-2 bg-[#084B7A] text-white text-xs font-bold rounded hover:bg-[#004475] disabled:opacity-50"
              >
                {isStarting ? 'Starting...' : 'I Agree & Start Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
