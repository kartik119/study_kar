import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RankedTestResponse, RankedTestStatus } from '@study-karnataka/shared-types';
import { RankedTestApi } from '../../api/ranked-test.api';

export const RankedTestDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [rankedConfig, setRankedConfig] = useState<RankedTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Invalidation modal state
  const [showInvalidateModal, setShowInvalidateModal] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [invalidationReason, setInvalidationReason] = useState('');

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await RankedTestApi.getRankedTestById(id);
      setRankedConfig(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load Ranked Test detail');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'activate' | 'close' | 'generate_rankings' | 'publish_results') => {
    if (!id) return;
    setError(null);
    setActionMsg(null);
    try {
      if (action === 'activate') {
        const updated = await RankedTestApi.activateRankedTest(id);
        setRankedConfig(updated);
        setActionMsg('Ranked Test activated successfully! Configuration is now frozen.');
      } else if (action === 'close') {
        const updated = await RankedTestApi.closeRankedTest(id);
        setRankedConfig(updated);
        setActionMsg('Ranked Test closed successfully. No new attempts will be accepted.');
      } else if (action === 'generate_rankings') {
        const res = await RankedTestApi.generateRankings(id);
        setActionMsg(res.message || 'Rankings generated successfully!');
        loadDetail();
      } else if (action === 'publish_results') {
        const updated = await RankedTestApi.publishResults(id);
        setRankedConfig(updated);
        setActionMsg('Results published successfully! Students can now view their ranks.');
      }
    } catch (err: any) {
      setError(err.message || 'Action failed');
    }
  };

  const handleInvalidateAttempt = async () => {
    if (!selectedAttemptId || !invalidationReason.trim()) {
      alert('Please provide an invalidation reason');
      return;
    }
    try {
      await RankedTestApi.invalidateAttempt(selectedAttemptId, invalidationReason);
      setShowInvalidateModal(false);
      setSelectedAttemptId(null);
      setInvalidationReason('');
      setActionMsg('Student attempt invalidated successfully.');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to invalidate attempt');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-[#64748B]">Loading Ranked Test Detail...</div>;
  }

  if (error || !rankedConfig) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error || 'Ranked Test not found'}
        </div>
        <button
          onClick={() => navigate('/mcq-library/ranked-tests')}
          className="px-4 py-2 border border-[#DCE6EE] text-sm text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Ranked Tests List
        </button>
      </div>
    );
  }

  const getStatusBadge = (st: RankedTestStatus) => {
    switch (st) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'ACTIVE':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'CLOSED':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'RESULTS_PUBLISHED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6EE] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#084B7A] bg-[#EAF3F9] px-2.5 py-1 rounded">
              {rankedConfig.code}
            </span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(rankedConfig.status)}`}>
              {rankedConfig.status}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
              {rankedConfig.mode}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mt-2">{rankedConfig.mockTest?.titleEn}</h1>
          <p className="text-sm text-[#64748B]">{rankedConfig.mockTest?.titleKn}</p>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-2">
          {rankedConfig.status === 'DRAFT' && (
            <button
              onClick={() => handleAction('activate')}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded hover:bg-emerald-700 shadow"
            >
              Activate Competition
            </button>
          )}

          {rankedConfig.status === 'ACTIVE' && (
            <button
              onClick={() => handleAction('close')}
              className="px-4 py-2 bg-amber-600 text-white font-bold text-sm rounded hover:bg-amber-700 shadow"
            >
              Close Test Window
            </button>
          )}

          {rankedConfig.status === 'CLOSED' && (
            <>
              <button
                onClick={() => handleAction('generate_rankings')}
                className="px-4 py-2 bg-[#084B7A] text-white font-bold text-sm rounded hover:bg-[#004475]"
              >
                Generate Rankings
              </button>
              <button
                onClick={() => handleAction('publish_results')}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded hover:bg-emerald-700 shadow"
              >
                Publish Results
              </button>
            </>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md font-medium">
          {actionMsg}
        </div>
      )}

      {/* Readiness & Immutability Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Readiness Panel */}
        <div className="p-5 bg-white border border-[#DCE6EE] rounded-lg shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">Ranked Test Readiness Check</h3>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                rankedConfig.isReadinessValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {rankedConfig.isReadinessValid ? '✓ Ready to Activate' : '✕ Blocking Issues'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#334155]">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Underlying Test Status:</span>
              <span className="font-semibold text-emerald-600">✓ {rankedConfig.mockTest?.status}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Questions Snapshot Count:</span>
              <span className="font-semibold">{rankedConfig.mockTest?.totalQuestions} Questions</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Solution Release Policy:</span>
              <span className="font-semibold">{rankedConfig.solutionReleasePolicy}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>One Attempt Rule:</span>
              <span className="font-semibold text-purple-700 font-mono">Enforced @@unique(rankedTestId, studentId)</span>
            </div>
          </div>
        </div>

        {/* Operational Metrics Panel */}
        <div className="p-5 bg-white border border-[#DCE6EE] rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[#111827]">Live Participation Analytics</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Total Attempts Started</span>
              <div className="text-xl font-bold text-[#111827]">{rankedConfig.totalAttemptsCount || 0}</div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Active (In Progress)</span>
              <div className="text-xl font-bold text-sky-600">{rankedConfig.activeAttemptsCount || 0}</div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Submitted / Finalized</span>
              <div className="text-xl font-bold text-emerald-600">
                {(rankedConfig.submittedAttemptsCount || 0) + (rankedConfig.autoSubmittedAttemptsCount || 0)}
              </div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Invalidated</span>
              <div className="text-xl font-bold text-rose-600">{rankedConfig.invalidatedAttemptsCount || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Composition Immutability Lock Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
        <div>
          <span className="font-bold text-[#111827]">🔒 Frozen Test Composition:</span> Questions, options, order, marks, and negative marking are strictly inherited from underlying Test <span className="font-mono text-[#084B7A] font-bold">{rankedConfig.mockTest?.code}</span>.
        </div>
        <button
          onClick={() => navigate(`/mcq-library/tests/${rankedConfig.mockTestId}`)}
          className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-[#084B7A]"
        >
          View Underlying Test
        </button>
      </div>

      {/* Invalidation Modal */}
      {showInvalidateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Invalidate Student Attempt</h3>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Invalidation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={invalidationReason}
                onChange={(e) => setInvalidationReason(e.target.value)}
                placeholder="Specify official reason for administrative attempt invalidation..."
                className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInvalidateModal(false)}
                className="px-4 py-2 border border-[#DCE6EE] text-sm rounded hover:bg-[#F4F8FB]"
              >
                Cancel
              </button>
              <button
                onClick={handleInvalidateAttempt}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded hover:bg-rose-700"
              >
                Invalidate Attempt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
