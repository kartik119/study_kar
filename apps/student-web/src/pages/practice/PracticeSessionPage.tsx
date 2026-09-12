import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge, Alert } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import {
  PracticeSessionSummary,
  PracticeQuestionPayload,
  SubmitPracticeAnswerResult,
} from '@study-karnataka/shared-types';

export const PracticeSessionPage: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSessionSummary | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestionPayload[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SubmitPracticeAnswerResult | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch session & questions
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    StudentTopicPracticeApi.getSession(sessionId)
      .then((res) => {
        setSession(res.session);
        setQuestions(res.questions);
        setElapsedSeconds(res.session.timeSpentSeconds || 0);

        // Find first unanswered question
        const firstUnanswered = res.questions.findIndex((q) => !q.isAnswered && !q.isRevealed);
        if (firstUnanswered !== -1) {
          setCurrentIndex(firstUnanswered);
        } else {
          setCurrentIndex(0);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load session');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Sync selectedOption / feedback when currentIndex changes
  useEffect(() => {
    if (questions.length === 0 || !questions[currentIndex]) return;
    const currentQ = questions[currentIndex];
    setSelectedOption(currentQ.selectedOption || null);
    setFeedback(null);
  }, [currentIndex, questions]);

  const currentQ = questions[currentIndex];

  // Format time display (mm:ss)
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQ || !selectedOption || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await StudentTopicPracticeApi.submitAnswer(sessionId, {
        questionId: currentQ.questionId,
        selectedOption: selectedOption as 'A' | 'B' | 'C' | 'D',
      });

      setFeedback(res);

      // Update local question state
      setQuestions((prev) =>
        prev.map((q) =>
          q.questionId === currentQ.questionId
            ? {
                ...q,
                selectedOption,
                isAnswered: true,
                isCorrect: res.isCorrect,
                correctOption: res.correctOption,
                explanation: res.explanation,
              }
            : q
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  // Skip Question
  const handleSkip = async () => {
    if (!sessionId || !currentQ) return;
    try {
      await StudentTopicPracticeApi.skipQuestion(sessionId, currentQ.questionId);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reveal Answer
  const handleReveal = async () => {
    if (!sessionId || !currentQ || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await StudentTopicPracticeApi.revealAnswer(sessionId, currentQ.questionId);
      setFeedback(res);

      setQuestions((prev) =>
        prev.map((q) =>
          q.questionId === currentQ.questionId
            ? {
                ...q,
                isAnswered: true,
                isRevealed: true,
                isCorrect: false,
                correctOption: res.correctOption,
                explanation: res.explanation,
              }
            : q
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Mark for Revision
  const handleToggleRevision = async () => {
    if (!sessionId || !currentQ) return;
    try {
      const res = await StudentTopicPracticeApi.toggleMarkForRevision(sessionId, currentQ.questionId);
      setQuestions((prev) =>
        prev.map((q) => (q.questionId === currentQ.questionId ? { ...q, markedForRevision: res.markedForRevision } : q))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Complete Session
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await StudentTopicPracticeApi.completeSession(sessionId, elapsedSeconds);
      navigate(`/practice/session/${sessionId}/summary`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Loading practice session...</div>;
  }

  if (error && !session) {
    return (
      <div style={{ maxWidth: '500px', margin: '60px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
        <Alert variant="error" title="Session Error" message={error} />
        <div style={{ marginTop: '16px' }}>
          <Button variant="primary" onClick={() => navigate('/practice')}>Back to Practice Home</Button>
        </div>
      </div>
    );
  }

  const answeredCount = questions.filter((q) => q.isAnswered || q.isRevealed).length;
  const isQuestionAnswered = currentQ?.isAnswered || currentQ?.isRevealed || feedback !== null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', fontFamily: 'Inter, sans-serif' }}>
      {/* Session Top Bar */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #DCE6EE',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
            Save & Exit
          </Button>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#111827' }}>
              {session?.categoryName} {session?.subcategoryName ? `› ${session.subcategoryName}` : ''}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Mode: {session?.selectionMode} • Language: {session?.preparationLanguage === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#084B7A' }}>
              Question {currentIndex + 1} / {questions.length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Progress: {answeredCount} of {questions.length} answered
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#EAF3F9',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              color: '#084B7A',
              fontSize: '14px',
            }}
          >
            ⏱️ {formatTime(elapsedSeconds)}
          </div>

          <Button variant="secondary" size="sm" onClick={handleCompleteSession}>
            Finish Session
          </Button>
        </div>
      </header>

      {/* Main Practice Workspace */}
      <main style={{ maxWidth: '960px', margin: '28px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {currentQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Question Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #DCE6EE',
                padding: '28px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Question Header Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge label={`Q${currentIndex + 1}`} variant="info" />
                  <Badge label={currentQ.difficulty} variant={currentQ.difficulty === 'EASY' ? 'success' : currentQ.difficulty === 'MEDIUM' ? 'warning' : 'neutral'} />
                  {currentQ.isPyq && <Badge label="PYQ" variant="warning" />}
                </div>

                <button
                  type="button"
                  onClick={handleToggleRevision}
                  style={{
                    background: 'none',
                    border: '1px solid #DCE6EE',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: currentQ.markedForRevision ? '#FEF3C7' : '#FFFFFF',
                    color: currentQ.markedForRevision ? '#D97706' : '#64748B',
                  }}
                >
                  {currentQ.markedForRevision ? '★ Marked for Revision' : '☆ Mark for Revision'}
                </button>
              </div>

              {/* Question Text */}
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                }}
              >
                {currentQ.questionText}
              </div>

              {/* Options Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'A', text: currentQ.optionA },
                  { key: 'B', text: currentQ.optionB },
                  { key: 'C', text: currentQ.optionC },
                  { key: 'D', text: currentQ.optionD },
                ].map((opt) => {
                  const isSelected = selectedOption === opt.key;
                  const isCorrectOpt = feedback?.correctOption === opt.key || currentQ.correctOption === opt.key;
                  const isSubmitted = isQuestionAnswered;

                  let optionBg = '#FFFFFF';
                  let borderCol = '#DCE6EE';
                  let textCol = '#334155';

                  if (isSubmitted) {
                    if (isCorrectOpt) {
                      optionBg = '#DCFCE7';
                      borderCol = '#16A34A';
                      textCol = '#14532D';
                    } else if (isSelected && !isCorrectOpt) {
                      optionBg = '#FEE2E2';
                      borderCol = '#DC2626';
                      textCol = '#7F1D1D';
                    }
                  } else if (isSelected) {
                    optionBg = '#EAF3F9';
                    borderCol = '#084B7A';
                    textCol = '#084B7A';
                  }

                  return (
                    <div
                      key={opt.key}
                      data-testid={`option-${opt.key}`}
                      onClick={() => {
                        if (!isSubmitted) setSelectedOption(opt.key);
                      }}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '10px',
                        border: `2px solid ${borderCol}`,
                        backgroundColor: optionBg,
                        color: textCol,
                        fontWeight: isSelected || isCorrectOpt ? 700 : 500,
                        fontSize: '15px',
                        cursor: isSubmitted ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isSubmitted && isCorrectOpt ? '#16A34A' : isSelected ? '#084B7A' : '#F1F5F9',
                          color: isSubmitted && isCorrectOpt || isSelected ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                          flexShrink: 0,
                        }}
                      >
                        {opt.key}
                      </div>
                      <div style={{ flexGrow: 1, lineHeight: '1.5' }}>{opt.text}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '1px solid #EAF3F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  {!isQuestionAnswered && (
                    <Button variant="outline" size="sm" onClick={handleReveal} disabled={submitting}>
                      Show Answer
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSkip} disabled={currentIndex >= questions.length - 1}>
                    Skip Question
                  </Button>
                </div>

                {!isQuestionAnswered ? (
                  <Button data-testid="submit-answer-btn" variant="primary" size="md" disabled={!selectedOption || submitting} onClick={handleSubmitAnswer}>
                    {submitting ? 'Checking...' : 'Submit Answer'}
                  </Button>
                ) : (
                  <Button
                    data-testid="next-question-btn"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (currentIndex < questions.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                      } else {
                        handleCompleteSession();
                      }
                    }}
                  >
                    {currentIndex < questions.length - 1 ? 'Next Question →' : 'View Session Summary'}
                  </Button>
                )}
              </div>
            </div>

            {/* Instant Feedback & Explanation Card */}
            {(feedback || isQuestionAnswered) && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: `2px solid ${
                    (feedback?.isCorrect ?? currentQ.isCorrect) ? '#16A34A' : '#DC2626'
                  }`,
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 800,
                      fontSize: '14px',
                      backgroundColor: (feedback?.isCorrect ?? currentQ.isCorrect) ? '#DCFCE7' : '#FEE2E2',
                      color: (feedback?.isCorrect ?? currentQ.isCorrect) ? '#14532D' : '#7F1D1D',
                    }}
                  >
                    {(feedback?.isCorrect ?? currentQ.isCorrect) ? '✓ Correct Answer' : '✕ Incorrect'}
                  </div>
                  <span style={{ fontSize: '14px', color: '#64748B' }}>
                    Correct Option: <strong style={{ color: '#111827' }}>{feedback?.correctOption || currentQ.correctOption}</strong>
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                  Explanation (ವಿವರಣೆ):
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.6',
                    backgroundColor: '#F8FAFC',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {feedback?.explanation || currentQ.explanation || 'Detailed explanation is provided for learning and conceptual clarity.'}
                </div>
              </div>
            )}

            {/* Question Palette Strip */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #DCE6EE',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '10px' }}>
                Question Palette:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAns = q.isAnswered || q.isRevealed;
                  const isRev = q.markedForRevision;

                  let bg = '#F1F5F9';
                  let color = '#475569';
                  if (isAns) {
                    bg = q.isCorrect ? '#DCFCE7' : '#FEE2E2';
                    color = q.isCorrect ? '#14532D' : '#7F1D1D';
                  }
                  if (isRev) {
                    bg = '#FEF3C7';
                    color = '#92400E';
                  }

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: isCurrent ? '2px solid #084B7A' : '1px solid #DCE6EE',
                        backgroundColor: bg,
                        color,
                        fontWeight: isCurrent ? 800 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
