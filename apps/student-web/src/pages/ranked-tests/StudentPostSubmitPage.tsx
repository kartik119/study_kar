import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentResultResponse } from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentPostSubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [resultState, setResultState] = useState<StudentResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadResult();
  }, [id]);

  const loadResult = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await StudentRankedTestApi.getStudentResult(id);
      setResultState(data);
      if (data.resultPublicationStatus === 'PUBLISHED') {
        navigate(`/ranked-tests/${id}/result`);
      }
    } catch (err: any) {
      console.error('Failed to load submission state', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[#64748B]">Verifying Submission State...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 text-center">
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-8 shadow-sm space-y-6">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
          ✓
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#111827]">Ranked Test Submitted Successfully!</h1>
          <p className="text-xs text-[#64748B]">{resultState?.testTitle || 'State Competitive Examination'}</p>
        </div>

        {/* Status Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1 text-left">
          <div className="font-bold flex items-center gap-2 text-sm">
            <span>⏳ Status:</span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono font-bold">
              RESULTS AWAITED
            </span>
          </div>
          <p className="text-amber-800 leading-relaxed pt-1">
            To ensure maximum fairness across Karnataka, individual scores, correct answers, and official rankings will be released once all participant examination windows conclude and results are officially published.
          </p>
        </div>

        <div className="pt-4 border-t border-[#DCE6EE] flex justify-center gap-4">
          <button
            onClick={() => navigate('/ranked-tests')}
            className="px-5 py-2 bg-[#084B7A] text-white font-bold text-xs rounded hover:bg-[#004475] shadow-xs"
          >
            ← Back to Ranked Tests
          </button>
          <button
            onClick={loadResult}
            className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold text-[#334155] rounded hover:bg-[#F4F8FB]"
          >
            Refresh Status 🔄
          </button>
        </div>
      </div>
    </div>
  );
};
