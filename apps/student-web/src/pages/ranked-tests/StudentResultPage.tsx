import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentResultResponse, LeaderboardEntryResponse } from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<StudentResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryResponse[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await StudentRankedTestApi.getStudentResult(id);
      setResult(res);

      if (res.resultPublicationStatus === 'PUBLISHED') {
        const lb = await StudentRankedTestApi.getLeaderboard(id, { page: 1, pageSize: 20 });
        setLeaderboard(lb.entries);
        setMyRank(lb.myRank);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load result');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[#64748B]">Loading Competition Results...</div>;
  }

  if (error || !result) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">{error}</div>
        <button
          onClick={() => navigate('/ranked-tests')}
          className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Ranked Tests
        </button>
      </div>
    );
  }

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-[#084B7A] bg-[#EAF3F9] px-2.5 py-1 rounded">
            {result.rankedTestCode}
          </span>
          <h1 className="text-xl font-bold text-[#111827] mt-1">{result.testTitle}</h1>
          <p className="text-xs text-[#64748B]">Official State Competitive Results & Leaderboard</p>
        </div>
        <button
          onClick={() => navigate('/ranked-tests')}
          className="px-3 py-1.5 border border-[#DCE6EE] text-xs font-semibold text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back
        </button>
      </div>

      {/* Rank & Score Overview Banner */}
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          {/* Rank Badge */}
          <div className="p-4 bg-gradient-to-br from-[#084B7A] to-[#004475] text-white rounded-lg shadow space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Your Karnataka Rank</span>
            <div className="text-3xl font-extrabold text-white">
              #{result.rank || myRank?.rank || 'N/A'}
            </div>
            <div className="text-[11px] text-sky-200">out of {result.totalParticipants || myRank?.totalParticipants || 0} participants</div>
          </div>

          {/* Raw Score */}
          <div className="p-4 bg-[#F4F8FB] border border-[#DCE6EE] rounded-lg space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase">Raw Score</span>
            <div className="text-3xl font-extrabold text-[#111827]">
              {result.rawScore} <span className="text-sm text-[#64748B] font-normal">/ {result.maximumMarks}</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-bold">{result.percentage?.toFixed(1)}% Score</div>
          </div>

          {/* Correct / Wrong */}
          <div className="p-4 bg-[#F4F8FB] border border-[#DCE6EE] rounded-lg space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase">Accuracy & Breakdown</span>
            <div className="text-lg font-bold text-[#111827] mt-1 space-x-2">
              <span className="text-emerald-600 font-bold">{result.correctCount} ✓</span>
              <span className="text-rose-600 font-bold">{result.wrongCount} ✕</span>
              <span className="text-gray-500 font-normal">{result.unansweredCount} -</span>
            </div>
            <div className="text-[11px] text-[#64748B]">Correct / Wrong / Unanswered</div>
          </div>

          {/* Time Taken */}
          <div className="p-4 bg-[#F4F8FB] border border-[#DCE6EE] rounded-lg space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase">Time Taken</span>
            <div className="text-2xl font-bold text-[#084B7A] mt-1">
              {formatTime(result.timeTakenSeconds || 0)}
            </div>
            <div className="text-[11px] text-[#64748B]">Authoritative Server Duration</div>
          </div>
        </div>

        {result.canViewSolutions && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => navigate(`/ranked-tests/${id}/result/review`)}
              className="px-5 py-2.5 bg-[#084B7A] text-white font-bold text-xs rounded hover:bg-[#004475] shadow transition-colors"
            >
              View Solution Review & Detailed Explanations →
            </button>
          </div>
        )}
      </div>

      {/* Privacy-Safe Leaderboard Table */}
      <div className="bg-white border border-[#DCE6EE] rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-3">
          <h2 className="text-base font-bold text-[#111827]">🏆 State Leaderboard (Top Participants)</h2>
          <span className="text-xs text-[#64748B] font-medium">Privacy-Protected Student Profiles</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">Leaderboard data being compiled...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#334155]">
              <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] uppercase border-b border-[#DCE6EE]">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Participant</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Correct</th>
                  <th className="p-3">Wrong</th>
                  <th className="p-3">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6EE]">
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-[#F4F8FB] transition-colors ${
                      entry.isCurrentStudent ? 'bg-amber-50/80 font-bold text-[#084B7A]' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold">
                      {entry.rank === 1 ? '🥇 #1' : entry.rank === 2 ? '🥈 #2' : entry.rank === 3 ? '🥉 #3' : `#${entry.rank}`}
                    </td>
                    <td className="p-3">
                      {entry.studentDisplayName} {entry.isCurrentStudent && <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded ml-2">(You)</span>}
                    </td>
                    <td className="p-3 font-bold text-[#111827]">{entry.rawScore}</td>
                    <td className="p-3 text-xs text-emerald-600 font-semibold">{entry.correctCount}</td>
                    <td className="p-3 text-xs text-rose-600 font-semibold">{entry.wrongCount}</td>
                    <td className="p-3 text-xs font-mono">{formatTime(entry.timeTakenSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
