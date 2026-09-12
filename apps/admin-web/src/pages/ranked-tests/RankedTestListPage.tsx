import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankedTestResponse, RankedTestMode, RankedTestStatus } from '@study-karnataka/shared-types';
import { RankedTestApi } from '../../api/ranked-test.api';

export const RankedTestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [rankedList, setRankedList] = useState<RankedTestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadRankedTests();
  }, [search, mode, status, page]);

  const loadRankedTests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await RankedTestApi.getRankedTestList({
        search: search || undefined,
        mode: (mode as RankedTestMode) || undefined,
        status: (status as RankedTestStatus) || undefined,
        page,
        pageSize: 10,
      });
      setRankedList(result.items);
      setTotalPages(result.meta.totalPages || 1);
      setTotalCount(result.meta.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load Ranked Tests');
    } finally {
      setIsLoading(false);
    }
  };

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

  const activeCount = rankedList.filter((r) => r.status === 'ACTIVE').length;
  const publishedCount = rankedList.filter((r) => r.status === 'RESULTS_PUBLISHED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6EE] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Ranked Test Engine</h1>
          <p className="text-sm text-[#64748B]">
            Configure Anytime Ranked & Scheduled Live competitions on frozen Published Tests.
          </p>
        </div>
        <button
          onClick={() => navigate('/mcq-library/ranked-tests/new')}
          className="inline-flex items-center justify-center px-4 py-2 bg-[#084B7A] text-white font-medium text-sm rounded-md hover:bg-[#004475] shadow-sm transition-colors"
        >
          + Create Ranked Test
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Ranked Configurations</span>
          <div className="text-2xl font-bold text-[#111827] mt-1">{totalCount}</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Active Competitions</span>
          <div className="text-2xl font-bold text-sky-600 mt-1">{activeCount}</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Results Published</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Student Attempts</span>
          <div className="text-2xl font-bold text-[#111827] mt-1">
            {rankedList.reduce((acc, curr) => acc + (curr.totalAttemptsCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search Ranked Code or Test Title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-[#DCE6EE] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#084B7A]"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="px-3 py-2 border border-[#DCE6EE] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#084B7A]"
          >
            <option value="">All Ranked Modes</option>
            <option value="ANYTIME_RANKED">Anytime Ranked</option>
            <option value="SCHEDULED_LIVE">Scheduled Live</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-[#DCE6EE] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#084B7A]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
            <option value="RESULTS_PUBLISHED">Results Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Ranked Tests Table */}
      {isLoading ? (
        <div className="p-8 text-center text-[#64748B]">Loading Ranked Tests...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">{error}</div>
      ) : rankedList.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#DCE6EE] rounded-lg">
          <p className="text-lg font-semibold text-[#111827]">No Ranked Tests Found</p>
          <p className="text-sm text-[#64748B] mt-1">Get started by creating a new Ranked Test configuration.</p>
          <button
            onClick={() => navigate('/mcq-library/ranked-tests/new')}
            className="mt-4 px-4 py-2 bg-[#084B7A] text-white text-sm font-medium rounded-md hover:bg-[#004475]"
          >
            + Create Ranked Test
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#DCE6EE] rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#DCE6EE]">
                <th className="p-4">Ranked Code</th>
                <th className="p-4">Underlying Test</th>
                <th className="p-4">Exam Cycle</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Timing Window</th>
                <th className="p-4">Attempts</th>
                <th className="p-4">Status</th>
                <th className="p-4">Results</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6EE] text-sm text-[#334155]">
              {rankedList.map((r) => (
                <tr key={r.id} className="hover:bg-[#F4F8FB] transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-[#084B7A]">{r.code}</td>
                  <td className="p-4 font-medium text-[#111827]">
                    <div>{r.mockTest?.titleEn}</div>
                    <div className="text-xs text-[#64748B] font-mono">{r.mockTest?.code}</div>
                  </td>
                  <td className="p-4 text-xs text-[#334155]">{r.mockTest?.examCycle?.titleEn || 'N/A'}</td>
                  <td className="p-4 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                        r.mode === 'ANYTIME_RANKED'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {r.mode}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono">
                    {r.mode === 'ANYTIME_RANKED' ? (
                      <div>
                        <div>From: {new Date(r.availableFrom).toLocaleDateString()}</div>
                        <div className="text-[11px] text-[#64748B]">
                          Deadline: {r.startDeadlineAt ? new Date(r.startDeadlineAt).toLocaleDateString() : 'None'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div>Start: {r.scheduledStartAt ? new Date(r.scheduledStartAt).toLocaleString() : 'N/A'}</div>
                        <div className="text-[11px] text-[#64748B]">
                          End: {r.scheduledEndAt ? new Date(r.scheduledEndAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-xs font-bold text-[#111827]">
                    {r.totalAttemptsCount || 0} Attempts
                    <div className="text-[11px] font-normal text-[#64748B]">
                      {r.activeAttemptsCount || 0} active | {r.submittedAttemptsCount || 0} sub
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        r.resultPublicationStatus === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {r.resultPublicationStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/mcq-library/ranked-tests/${r.id}`)}
                      className="px-3 py-1 bg-white border border-[#DCE6EE] text-[#084B7A] text-xs font-medium rounded hover:bg-[#EAF3F9]"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="p-4 border-t border-[#DCE6EE] flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Page {page} of {totalPages} ({totalCount} items)
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-white border border-[#DCE6EE] rounded disabled:opacity-50 hover:bg-[#F4F8FB]"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-[#DCE6EE] rounded disabled:opacity-50 hover:bg-[#F4F8FB]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
