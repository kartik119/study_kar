import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge, Alert } from '@study-karnataka/ui';
import { StudentPerformanceApi } from '../../api/student-performance.api';
import { FrequentlyWrongQuestionItem } from '@study-karnataka/shared-types';

export const FrequentlyWrongQuestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<FrequentlyWrongQuestionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await StudentPerformanceApi.getFrequentlyWrongQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load frequently wrong questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="outline" size="sm" onClick={() => navigate('/performance')}>
          ← Back to Performance
        </Button>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Frequently Wrong Questions
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            Questions answered incorrectly 2 or more times across practice sessions and ranked tests.
          </p>
        </div>

        {questions.length > 0 && (
          <Button variant="primary" size="md" onClick={() => navigate('/practice/configure?selectionMode=INCORRECT_RETRY')}>
            🔄 Retry All Incorrect Questions
          </Button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading question history...</div>
      ) : questions.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center', backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
            🎉 No Repeated Errors!
          </div>
          <p style={{ fontSize: '14px', color: '#14532D', margin: '0 0 16px 0' }}>
            You don't have any questions answered incorrectly multiple times.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/practice')}>
            Start Topic Practice
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q) => (
            <Card key={q.mcqQuestionId} style={{ padding: '20px', borderLeft: q.latestOutcome === 'INCORRECT' ? '4px solid #DC2626' : '4px solid #16A34A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Badge label={q.code} variant="neutral" />
                    <Badge label={q.difficulty} variant={q.difficulty === 'EASY' ? 'success' : q.difficulty === 'MEDIUM' ? 'warning' : 'error'} />
                    {q.isPyq && <Badge label="PYQ" variant="info" />}
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      {q.categoryName} {q.subcategoryName ? `› ${q.subcategoryName}` : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px', lineHeight: 1.4 }}>
                    {q.questionText}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/practice/configure?categoryId=${q.categoryId}&selectionMode=INCORRECT_RETRY`)}
                >
                  Retry Question →
                </Button>
              </div>

              {/* Metrics bar */}
              <div style={{ display: 'flex', gap: '20px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Times Wrong: </span>
                  <strong style={{ color: '#DC2626' }}>{q.timesWrong}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Times Correct: </span>
                  <strong style={{ color: '#16A34A' }}>{q.timesCorrect}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Total Seen: </span>
                  <strong style={{ color: '#334155' }}>{q.timesSeen}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Latest Status: </span>
                  <strong style={{ color: q.latestOutcome === 'CORRECT' ? '#16A34A' : '#DC2626' }}>
                    {q.latestOutcome === 'CORRECT' ? 'Recovered (Correct)' : 'Active Error (Incorrect)'}
                  </strong>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
