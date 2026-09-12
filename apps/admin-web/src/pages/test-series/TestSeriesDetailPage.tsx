import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TestSeriesResponse } from '@study-karnataka/shared-types';
import { TestSeriesApi } from '../../api/test-series.api';

export const TestSeriesDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [series, setSeries] = useState<TestSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal / Prompt State
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (id) loadSeries();
  }, [id]);

  const loadSeries = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await TestSeriesApi.getTestSeriesById(id);
      setSeries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load test series details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowAction = async (action: 'submit' | 'request_changes' | 'approve' | 'publish' | 'archive') => {
    if (!id) return;
    setError(null);
    setActionMessage(null);

    try {
      let updated: TestSeriesResponse;
      if (action === 'submit') {
        updated = await TestSeriesApi.submitForReview(id);
        setActionMessage('Test Series submitted for review successfully!');
      } else if (action === 'request_changes') {
        if (!rejectionReason.trim()) {
          alert('Please enter a rejection reason.');
          return;
        }
        updated = await TestSeriesApi.requestChanges(id, rejectionReason);
        setShowRejectModal(false);
        setActionMessage('Changes requested successfully.');
      } else if (action === 'approve') {
        updated = await TestSeriesApi.approveSeries(id);
        setActionMessage('Test Series approved successfully!');
      } else if (action === 'publish') {
        updated = await TestSeriesApi.publishSeries(id);
        setActionMessage('Test Series published successfully!');
      } else {
        updated = await TestSeriesApi.archiveSeries(id);
        setActionMessage('Test Series archived successfully.');
      }
      setSeries(updated);
    } catch (err: any) {
      setError(err.message || 'Workflow action failed');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-[#64748B]">Loading Test Series Details...</div>;
  }

  if (error || !series) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
          {error || 'Test Series not found'}
        </div>
        <button
          onClick={() => navigate('/mcq-library/test-series')}
          className="px-4 py-2 border border-[#DCE6EE] text-sm text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Test Series List
        </button>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'REVIEW_PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'CHANGES_REQUESTED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'APPROVED':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'PUBLISHED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6EE] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#084B7A] bg-[#EAF3F9] px-2.5 py-1 rounded">
              {series.code}
            </span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(series.status)}`}>
              {series.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mt-2">{series.titleEn}</h1>
          <p className="text-sm text-[#64748B]">{series.titleKn}</p>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center gap-2">
          {(series.status === 'DRAFT' || series.status === 'CHANGES_REQUESTED') && (
            <button
              onClick={() => navigate(`/mcq-library/test-series/new?edit=${series.id}`)}
              className="px-3 py-1.5 border border-[#DCE6EE] text-sm text-[#084B7A] rounded hover:bg-[#F4F8FB]"
            >
              Edit Series
            </button>
          )}

          {(series.status === 'DRAFT' || series.status === 'CHANGES_REQUESTED') && (
            <button
              onClick={() => handleWorkflowAction('submit')}
              className="px-4 py-1.5 bg-[#084B7A] text-white text-sm font-medium rounded hover:bg-[#004475]"
            >
              Submit for Review
            </button>
          )}

          {series.status === 'REVIEW_PENDING' && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded hover:bg-rose-100"
              >
                Request Changes
              </button>
              <button
                onClick={() => handleWorkflowAction('approve')}
                className="px-4 py-1.5 bg-[#084B7A] text-white text-sm font-medium rounded hover:bg-[#004475]"
              >
                Approve Series
              </button>
            </>
          )}

          {series.status === 'APPROVED' && (
            <button
              onClick={() => handleWorkflowAction('publish')}
              className="px-5 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded hover:bg-emerald-700 shadow"
            >
              Publish Test Series
            </button>
          )}

          {series.status !== 'ARCHIVED' && (
            <button
              onClick={() => handleWorkflowAction('archive')}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md font-medium">
          {actionMessage}
        </div>
      )}

      {/* Series Readiness & Reuse Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Readiness Panel */}
        <div className="p-5 bg-white border border-[#DCE6EE] rounded-lg shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">Series Readiness Check</h3>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                series.isReadinessValid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {series.isReadinessValid ? '✓ Ready' : '✕ Issues Detected'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#334155]">
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>English & Kannada Metadata:</span>
              <span className="font-semibold text-emerald-600">✓ Present</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Exam Context:</span>
              <span className="font-semibold text-emerald-600">✓ {series.examCycle?.titleEn}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Tests Included:</span>
              <span className="font-semibold">{series.totalTests} Tests</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1">
              <span>Student-Ready Tests (Published):</span>
              <span
                className={`font-semibold ${
                  series.studentReadyTestsCount === series.totalTests ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {series.studentReadyTestsCount} / {series.totalTests} Ready
              </span>
            </div>
          </div>

          {!series.isReadinessValid && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
              <span className="font-bold">Blocking Readiness Issues:</span>
              <ul className="list-disc list-inside">
                {series.readinessErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Question Reuse Panel */}
        <div className="p-5 bg-white border border-[#DCE6EE] rounded-lg shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">Question Reuse Analytics</h3>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                series.isReusePolicyValid
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {series.isReusePolicyValid ? '✓ Reuse Policy Passed' : '✕ Policy Violation'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Total Question Slots</span>
              <div className="text-lg font-bold text-[#111827]">{series.totalQuestionSlots}</div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Unique Canonical MCQs</span>
              <div className="text-lg font-bold text-[#084B7A]">{series.uniqueMcqCount}</div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Repeated Questions</span>
              <div className="text-lg font-bold text-amber-600">{series.repeatedMcqCount}</div>
            </div>
            <div className="p-2.5 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
              <span className="text-[#64748B]">Reuse Ratio</span>
              <div className="text-lg font-bold text-[#111827]">{series.questionReusePercentage}%</div>
            </div>
          </div>

          {/* Duplicate details listing */}
          {series.duplicateMcqDetails.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-2">
              <div className="font-bold">Duplicate Question Locations ({series.duplicateMcqDetails.length}):</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {series.duplicateMcqDetails.map((dup, i) => (
                  <div key={i} className="bg-white p-2 rounded border border-amber-200">
                    <span className="font-mono font-bold text-[#084B7A]">{dup.mcqCode || dup.mcqId}</span>
                    <div className="text-[11px] text-[#64748B]">
                      Appears in:{' '}
                      {dup.locations.map((loc) => `${loc.testCode} (${loc.entryType}, Slot #${loc.questionDisplayOrder})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Included Tests Table */}
      <div className="bg-white border border-[#DCE6EE] rounded-lg shadow-sm p-5 space-y-4">
        <h3 className="text-base font-bold text-[#111827]">Included Tests ({series.tests.length})</h3>

        {series.tests.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B] border border-dashed border-[#DCE6EE] rounded-lg">
            No Tests attached to this Series.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#334155]">
              <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] border-b border-[#DCE6EE]">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Test Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Questions</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Entry Role</th>
                  <th className="p-3">Scheduled Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6EE]">
                {series.tests.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F4F8FB]">
                    <td className="p-3 font-bold text-[#084B7A]">{st.orderIndex}</td>
                    <td className="p-3 font-mono text-xs font-semibold">{st.mockTest?.code || st.mockTestId}</td>
                    <td className="p-3 font-medium text-[#111827]">{st.mockTest?.titleEn}</td>
                    <td className="p-3 text-xs">{st.mockTest?.totalQuestions} Questions</td>
                    <td className="p-3 text-xs">{st.mockTest?.durationMinutes} min</td>
                    <td className="p-3 text-xs font-semibold">{st.entryType}</td>
                    <td className="p-3 text-xs">{st.availableFrom ? new Date(st.availableFrom).toLocaleString() : 'Immediate'}</td>
                    <td className="p-3 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          st.mockTest?.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {st.mockTest?.status || 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Request Changes on Test Series</h3>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what changes are required before approval..."
                className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-[#DCE6EE] text-sm rounded hover:bg-[#F4F8FB]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleWorkflowAction('request_changes')}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded hover:bg-rose-700"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
