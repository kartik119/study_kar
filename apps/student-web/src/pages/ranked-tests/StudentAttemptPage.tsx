import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  StudentAttemptResponse,
  StudentAttemptQuestionPayload,
} from '@study-karnataka/shared-types';
import { StudentRankedTestApi } from '../../api/student-ranked-test.api';

export const StudentAttemptPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [attempt, setAttempt] = useState<StudentAttemptResponse | null>(null);
  const [questions, setQuestions] = useState<StudentAttemptQuestionPayload[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers State: Map of mockTestQuestionId -> { selectedOption, isMarkedForReview }
  const [answersMap, setAnswersMap] = useState<
    Record<string, { selectedOption: string | null; isMarkedForReview: boolean }>
  >({});

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaletteDrawer, setShowPaletteDrawer] = useState(false);

  // Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (id) loadAttemptAndQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Periodic Timer & Countdown
  useEffect(() => {
    if (remainingSeconds <= 0 && attempt) {
      if (attempt.status === 'ACTIVE') {
        handleTimeExpired();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds]);

  const loadAttemptAndQuestions = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Resume/Get Active Attempt
      const att = await StudentRankedTestApi.startOrResumeAttempt(id);
      setAttempt(att);
      setRemainingSeconds(att.remainingSeconds);
      setAnswersMap(att.savedAnswers || {});

      // 2. Get Frozen Question Snapshots
      const qList = await StudentRankedTestApi.getAttemptQuestions(att.attemptId);
      setQuestions(qList);
    } catch (err: any) {
      setError(err.message || 'Failed to load test attempt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = async (optionLetter: string) => {
    if (!attempt || !currentQuestion) return;

    const currentAns = answersMap[currentQuestion.mockTestQuestionId] || {
      selectedOption: null,
      isMarkedForReview: false,
    };

    // Toggle option if already selected
    const newOption = currentAns.selectedOption === optionLetter ? null : optionLetter;

    // Optimistic UI update
    setAnswersMap((prev) => ({
      ...prev,
      [currentQuestion.mockTestQuestionId]: {
        selectedOption: newOption,
        isMarkedForReview: currentAns.isMarkedForReview,
      },
    }));

    // Autosave API write
    setSaveStatus('SAVING');
    try {
      await StudentRankedTestApi.saveAnswer(
        attempt.attemptId,
        currentQuestion.mockTestQuestionId,
        newOption,
        currentAns.isMarkedForReview
      );
      setSaveStatus('SAVED');
    } catch (err) {
      console.error('Autosave failed', err);
      setSaveStatus('ERROR');
    }
  };

  const handleToggleMarkForReview = async () => {
    if (!attempt || !currentQuestion) return;

    const currentAns = answersMap[currentQuestion.mockTestQuestionId] || {
      selectedOption: null,
      isMarkedForReview: false,
    };

    const newMarked = !currentAns.isMarkedForReview;

    setAnswersMap((prev) => ({
      ...prev,
      [currentQuestion.mockTestQuestionId]: {
        selectedOption: currentAns.selectedOption,
        isMarkedForReview: newMarked,
      },
    }));

    setSaveStatus('SAVING');
    try {
      await StudentRankedTestApi.saveAnswer(
        attempt.attemptId,
        currentQuestion.mockTestQuestionId,
        currentAns.selectedOption,
        newMarked
      );
      setSaveStatus('SAVED');
    } catch (err) {
      console.error('Autosave failed', err);
      setSaveStatus('ERROR');
    }
  };

  const handleTimeExpired = async () => {
    if (!attempt) return;
    try {
      await StudentRankedTestApi.submitAttempt(attempt.attemptId);
      navigate(`/ranked-tests/${id}/submitted`);
    } catch (err) {
      console.error('Auto-submit failed', err);
      navigate(`/ranked-tests/${id}/submitted`);
    }
  };

  const handleFinalSubmit = async () => {
    if (!attempt) return;
    setIsSubmitting(true);
    try {
      await StudentRankedTestApi.submitAttempt(attempt.attemptId);
      setShowSubmitModal(false);
      navigate(`/ranked-tests/${id}/submitted`);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[#64748B]">Loading Examination Interface...</div>;
  }

  if (error || !attempt || questions.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md font-medium">
          {error || 'Unable to load test'}
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

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answersMap[currentQuestion?.mockTestQuestionId] || {
    selectedOption: null,
    isMarkedForReview: false,
  };

  // Stats calculation
  const answeredCount = Object.values(answersMap).filter((a) => a.selectedOption !== null).length;
  const markedCount = Object.values(answersMap).filter((a) => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

  // Format timer HH:MM:SS
  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-[#084B7A] text-white px-6 py-3 flex items-center justify-between shadow-md shrink-0">
        <div>
          <span className="text-[11px] font-mono font-bold text-sky-200 uppercase tracking-wider bg-sky-900/60 px-2 py-0.5 rounded">
            {attempt.rankedTestCode}
          </span>
          <h1 className="text-sm font-bold text-white leading-tight mt-0.5">{attempt.testTitle}</h1>
        </div>

        {/* Center: Server Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="bg-[#004475] border border-sky-600/50 px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-inner">
            <span className="text-[11px] font-bold text-sky-200 uppercase">Time Remaining:</span>
            <span className={`font-mono text-base font-bold ${remainingSeconds < 300 ? 'text-rose-300 animate-pulse' : 'text-white'}`}>
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          {/* Autosave Status Indicator */}
          <div className="text-xs font-semibold">
            {saveStatus === 'SAVING' && <span className="text-amber-300">Saving...</span>}
            {saveStatus === 'SAVED' && <span className="text-emerald-300">Saved ✓</span>}
            {saveStatus === 'ERROR' && <span className="text-rose-300">Save Failed ⚠️</span>}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaletteDrawer(!showPaletteDrawer)}
            className="md:hidden px-3 py-1.5 bg-sky-800 text-xs font-bold rounded"
          >
            Palette ({answeredCount}/{questions.length})
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-md hover:bg-emerald-700 shadow transition-colors"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto p-4 gap-4">
        {/* Left Column: Question Area */}
        <main className="flex-1 bg-white border border-[#DCE6EE] rounded-lg shadow-sm flex flex-col justify-between overflow-y-auto">
          {/* Question Top Info Bar */}
          <div className="px-6 py-3 border-b border-[#DCE6EE] flex items-center justify-between bg-[#F7F9FC]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#084B7A]">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {currentQuestion.sectionTitle && (
                <span className="text-xs text-[#64748B] bg-slate-100 px-2 py-0.5 rounded">
                  {currentQuestion.sectionTitle}
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-[#64748B] space-x-3">
              <span className="text-emerald-600 font-bold">+{currentQuestion.positiveMarks} Marks</span>
              <span className="text-rose-600 font-bold">-{currentQuestion.negativeMarks} Marks</span>
            </div>
          </div>

          {/* Question Text & Options Content */}
          <div className="p-6 flex-1 space-y-6 overflow-y-auto">
            <div className="text-base font-bold text-[#111827] leading-relaxed">
              {currentQuestion.questionText}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {[
                { label: 'A', text: currentQuestion.optionA },
                { label: 'B', text: currentQuestion.optionB },
                { label: 'C', text: currentQuestion.optionC },
                { label: 'D', text: currentQuestion.optionD },
              ].map((opt) => {
                const isSelected = currentAnswer.selectedOption === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectOption(opt.label)}
                    className={`w-full text-left p-4 border rounded-lg transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#084B7A] bg-[#F4F8FB] ring-2 ring-[#084B7A]/20 shadow-xs'
                        : 'border-[#DCE6EE] hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-[#084B7A] text-white' : 'bg-gray-100 text-[#334155]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-sm text-[#111827] font-medium pt-0.5 leading-normal">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Control Bar */}
          <div className="px-6 py-4 border-t border-[#DCE6EE] flex items-center justify-between bg-[#F7F9FC]">
            <button
              onClick={handleToggleMarkForReview}
              className={`px-3 py-1.5 border text-xs font-semibold rounded-md transition-colors ${
                currentAnswer.isMarkedForReview
                  ? 'bg-purple-100 border-purple-300 text-purple-800'
                  : 'bg-white border-[#DCE6EE] text-[#334155] hover:bg-gray-50'
              }`}
            >
              {currentAnswer.isMarkedForReview ? '★ Marked for Review' : '☆ Mark for Review'}
            </button>

            <div className="flex gap-2">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="px-4 py-1.5 border border-[#DCE6EE] text-xs font-bold text-[#334155] rounded-md disabled:opacity-30 hover:bg-white"
              >
                ← Previous
              </button>

              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="px-5 py-1.5 bg-[#084B7A] text-white text-xs font-bold rounded-md disabled:opacity-30 hover:bg-[#004475]"
              >
                Next →
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Question Palette */}
        <aside className="w-72 bg-white border border-[#DCE6EE] rounded-lg shadow-sm p-4 hidden md:flex flex-col space-y-4 shrink-0">
          <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#DCE6EE] pb-2">
            Question Palette
          </h2>

          {/* Palette Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Answered ({answeredCount})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400"></span> Unanswered ({unansweredCount})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span> Review ({markedCount})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#084B7A]"></span> Current
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-2 pr-1 content-start">
            {questions.map((q, index) => {
              const ans = answersMap[q.mockTestQuestionId] || { selectedOption: null, isMarkedForReview: false };
              const isCurrent = index === currentIndex;

              let btnClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300';
              if (ans.isMarkedForReview) {
                btnClass = 'bg-purple-600 text-white font-bold border-purple-700';
              } else if (ans.selectedOption !== null) {
                btnClass = 'bg-emerald-600 text-white font-bold border-emerald-700';
              }

              if (isCurrent) {
                btnClass += ' ring-2 ring-offset-1 ring-[#084B7A]';
              }

              return (
                <button
                  key={q.mockTestQuestionId}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-9 h-9 rounded text-xs border flex items-center justify-center transition-all ${btnClass}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">Submit Examination Confirmation</h3>
            <p className="text-xs text-[#64748B]">Review your attempt summary before final submission:</p>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-emerald-800 font-bold">Answered</span>
                <div className="text-xl font-bold text-emerald-700 mt-1">{answeredCount}</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-gray-700 font-bold">Unanswered</span>
                <div className="text-xl font-bold text-gray-800 mt-1">{unansweredCount}</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <span className="text-purple-800 font-bold">Marked</span>
                <div className="text-xl font-bold text-purple-700 mt-1">{markedCount}</div>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200 font-medium">
              ⚠️ Once submitted, your answers will be frozen and you cannot make further changes.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-[#DCE6EE] text-xs font-semibold rounded hover:bg-[#F4F8FB]"
              >
                Continue Test
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Final Answers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
