import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SolutionReviewItem } from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentSolutionReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [solutions, setSolutions] = useState<SolutionReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');

  useEffect(() => {
    if (id) loadSolutions();
  }, [id]);

  const loadSolutions = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await StudentRankedTestApi.getSolutionReview(id);
      setSolutions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load solutions');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[#64748B]">Loading Solution Review & Detailed Explanations...</div>;
  }

  if (error || solutions.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">{error}</div>
        <button
          onClick={() => navigate(`/ranked-tests/${id}/result`)}
          className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Results
        </button>
      </div>
    );
  }

  const filtered = solutions.filter((s) => {
    if (filter === 'CORRECT') return s.studentSelectedOption && s.isCorrect;
    if (filter === 'WRONG') return s.studentSelectedOption && !s.isCorrect;
    if (filter === 'UNANSWERED') return !s.studentSelectedOption;
    return true;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Solution Review & Detailed Explanations</h1>
          <p className="text-xs text-[#64748B]">
            Review your responses against official correct answers and explanations.
          </p>
        </div>
        <button
          onClick={() => navigate(`/ranked-tests/${id}/result`)}
          className="px-3 py-1.5 border border-[#DCE6EE] text-xs font-semibold text-[#334155] rounded hover:bg-[#F4F8FB]"
        >
          ← Back to Result
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DCE6EE] pb-2 text-xs">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            filter === 'ALL' ? 'bg-[#084B7A] text-white' : 'bg-white border border-[#DCE6EE] text-[#334155]'
          }`}
        >
          All Questions ({solutions.length})
        </button>
        <button
          onClick={() => setFilter('CORRECT')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            filter === 'CORRECT' ? 'bg-emerald-600 text-white' : 'bg-white border border-[#DCE6EE] text-[#334155]'
          }`}
        >
          Correct ({solutions.filter((s) => s.studentSelectedOption && s.isCorrect).length})
        </button>
        <button
          onClick={() => setFilter('WRONG')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            filter === 'WRONG' ? 'bg-rose-600 text-white' : 'bg-white border border-[#DCE6EE] text-[#334155]'
          }`}
        >
          Wrong ({solutions.filter((s) => s.studentSelectedOption && !s.isCorrect).length})
        </button>
        <button
          onClick={() => setFilter('UNANSWERED')}
          className={`px-3 py-1.5 rounded font-bold transition-colors ${
            filter === 'UNANSWERED' ? 'bg-gray-600 text-white' : 'bg-white border border-[#DCE6EE] text-[#334155]'
          }`}
        >
          Unanswered ({solutions.filter((s) => !s.studentSelectedOption).length})
        </button>
      </div>

      {/* Solutions List */}
      <div className="space-y-6">
        {filtered.map((item) => (
          <div key={item.mockTestQuestionId} className="bg-white border border-[#DCE6EE] rounded-lg p-6 shadow-xs space-y-4">
            {/* Top Q Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-[#084B7A]">Question #{item.displayOrder}</span>
              <div className="flex items-center gap-2 text-xs">
                {item.studentSelectedOption ? (
                  item.isCorrect ? (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                      ✓ Correct (+{item.positiveMarks})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">
                      ✕ Incorrect (-{item.negativeMarks})
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 font-bold rounded">Unanswered (0)</span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div className="text-base font-bold text-[#111827]">{item.questionText}</div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'A', text: item.optionA },
                { label: 'B', text: item.optionB },
                { label: 'C', text: item.optionC },
                { label: 'D', text: item.optionD },
              ].map((opt) => {
                const isCorrectOpt = item.correctOption === opt.label;
                const isStudentSelected = item.studentSelectedOption === opt.label;

                let borderClass = 'border-[#DCE6EE] bg-white';
                if (isCorrectOpt) {
                  borderClass = 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900';
                } else if (isStudentSelected && !isCorrectOpt) {
                  borderClass = 'border-rose-500 bg-rose-50 text-rose-900 line-through';
                }

                return (
                  <div key={opt.label} className={`p-3 border rounded-md flex items-start gap-2 ${borderClass}`}>
                    <span className="font-bold shrink-0">({opt.label})</span>
                    <span className="flex-1">{opt.text}</span>
                    {isCorrectOpt && <span className="text-emerald-700 font-bold text-[11px]">✓ Correct Answer</span>}
                    {isStudentSelected && !isCorrectOpt && <span className="text-rose-700 font-bold text-[11px]">Your Choice</span>}
                  </div>
                );
              })}
            </div>

            {/* Explanation Box */}
            {item.explanation && (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs space-y-1 text-sky-900">
                <div className="font-bold text-[#084B7A]">💡 Official Explanation:</div>
                <div className="leading-relaxed">{item.explanation}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
