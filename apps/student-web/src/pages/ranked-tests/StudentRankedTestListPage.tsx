import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentRankedTestSummary } from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentRankedTestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [rankedList, setRankedList] = useState<StudentRankedTestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankedTests();
  }, []);

  const loadRankedTests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await StudentRankedTestApi.getStudentRankedTests();
      setRankedList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load available Ranked Tests');
    } finally {
      setIsLoading(false);
    }
  };

  const getCtaButton = (item: StudentRankedTestSummary) => {
    if (item.attemptState === 'NOT_STARTED') {
      return (
        <button
          onClick={() => navigate(`/ranked-tests/${item.id}`)}
          className="px-4 py-2 bg-[#084B7A] text-white font-bold text-xs rounded hover:bg-[#004475] shadow-xs"
        >
          View Details & Start →
        </button>
      );
    }

    if (item.attemptState === 'ACTIVE') {
      return (
        <button
          onClick={() => navigate(`/ranked-tests/${item.id}/attempt`)}
          className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded hover:bg-amber-700 shadow-xs animate-pulse"
        >
          Resume Test ⏱
        </button>
      );
    }

    if (item.attemptState === 'SUBMITTED' || item.attemptState === 'AUTO_SUBMITTED') {
      return (
        <button
          onClick={() => navigate(`/ranked-tests/${item.id}/submitted`)}
          className="px-4 py-2 bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded hover:bg-slate-200"
        >
          Submitted (Results Awaited)
        </button>
      );
    }

    if (item.attemptState === 'RESULTS_PUBLISHED') {
      return (
        <button
          onClick={() => navigate(`/ranked-tests/${item.id}/result`)}
          className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded hover:bg-emerald-700 shadow-xs"
        >
          View Result & Leaderboard 🏆
        </button>
      );
    }

    return (
      <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 font-bold text-xs rounded">
        Unavailable
      </button>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Ranked Competitions</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Compete with students across Karnataka in timed state-level mock examinations.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 border border-[#DCE6EE] text-xs font-semibold text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-[#64748B]">Loading Ranked Competitions...</div>
      ) : rankedList.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#DCE6EE] rounded-lg space-y-2">
          <p className="text-base font-bold text-[#111827]">No Active Ranked Tests Right Now</p>
          <p className="text-xs text-[#64748B]">Check back soon for upcoming KAS & state competitive live tests!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rankedList.map((item) => (
            <div key={item.id} className="bg-white border border-[#DCE6EE] rounded-lg p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#084B7A] bg-[#EAF3F9] px-2 py-0.5 rounded">
                    {item.code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      item.mode === 'ANYTIME_RANKED' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {item.mode === 'ANYTIME_RANKED' ? 'Anytime Ranked' : 'Scheduled Live'}
                  </span>
                </div>

                <h2 className="text-base font-bold text-[#111827]">{item.title}</h2>
                <div className="text-xs font-semibold text-[#64748B]">{item.examTitle}</div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#DCE6EE]">
                  <div>
                    <span className="text-[#64748B]">Questions:</span> <strong>{item.totalQuestions}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Duration:</span> <strong>{item.durationMinutes} mins</strong>
                  </div>
                </div>

                <div className="text-[11px] text-[#64748B] bg-slate-50 p-2 rounded border border-slate-200">
                  {item.mode === 'ANYTIME_RANKED' ? (
                    <div>
                      📅 Start Window: {new Date(item.availableFrom).toLocaleDateString()} to{' '}
                      {item.startDeadlineAt ? new Date(item.startDeadlineAt).toLocaleDateString() : 'Open'}
                    </div>
                  ) : (
                    <div>
                      🔴 Live Window: {item.scheduledStartAt ? new Date(item.scheduledStartAt).toLocaleString() : ''} to{' '}
                      {item.scheduledEndAt ? new Date(item.scheduledEndAt).toLocaleTimeString() : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#DCE6EE]">
                <span className="text-xs font-semibold text-slate-600">
                  One Attempt Only 🔒
                </span>
                {getCtaButton(item)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
