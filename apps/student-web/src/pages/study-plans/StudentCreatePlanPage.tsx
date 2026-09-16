import React, { useState, useEffect } from 'react';
import { Card, Button, Input, FormField, Select, Alert } from '@study-karnataka/ui';
import { useNavigate } from 'react-router-dom';
import { fetchAvailableExams, createStudentStudyPlan } from '../../api/student-study-plan.api';

export const StudentCreatePlanPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examCycleId, setExamCycleId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');

  useEffect(() => {
    const loadExams = async () => {
      try {
        const data = await fetchAvailableExams();
        setExams(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCycleId || !planStartDate) {
      setError('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createStudentStudyPlan({
        examCycleId,
        planStartDate
      });
      navigate('/study-plans/weekly');
    } catch (err: any) {
      setError(err.message || 'Failed to create study plan');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FC', fontFamily: 'Inter, sans-serif' }}>
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E6EAF0',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Create My Study Plan</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </header>

      <main style={{ maxWidth: '600px', margin: '36px auto', padding: '0 24px' }}>
        <Card title="Configure Your Plan" subtitle="Tell us your goals and we'll generate a personalized day-by-day schedule.">
          {error && <div style={{ marginBottom: '16px' }}><Alert variant="error" title="Error" message={error} /></div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <FormField label="Target Exam" required>
              {loading ? (
                <div>Loading exams...</div>
              ) : (
                <Select
                  value={examCycleId}
                  onChange={(e) => setExamCycleId(e.target.value)}
                  options={[
                    { value: '', label: 'Select an Exam...' },
                    ...exams.map(exam => ({
                      value: exam.id,
                      label: `${exam.programme?.titleEn || 'Exam'} - ${exam.cycleName}`
                    }))
                  ]}
                />
              )}
            </FormField>

            <FormField label="When will you start studying?" required>
              <Input 
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
              />
            </FormField>

            <div style={{ marginTop: '24px' }}>
              <Button type="submit" variant="primary" size="lg" isLoading={submitting} style={{ width: '100%' }}>
                Generate My Plan
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};
