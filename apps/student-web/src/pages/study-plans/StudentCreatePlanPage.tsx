import React, { useState, useEffect } from 'react';
import { Card, Button, Input, FormField, Select, Alert } from '@study-karnataka/ui';
import { Calendar, CheckCircle, Clock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAvailableExams, createStudentStudyPlan, calculateStudentPlanPreview } from '../../api/student-study-plan.api';

export const StudentCreatePlanPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examCycleId, setExamCycleId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [dailyHours, setDailyHours] = useState('4');

  const [preview, setPreview] = useState<any>(null);

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

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCycleId || !planStartDate) {
      setError('Please select an exam and start date');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const data = await calculateStudentPlanPreview({
        examCycleId,
        planStartDate,
        selectedDailyMinutes: parseInt(dailyHours) * 60,
      });
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate preview');
      setPreview(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await createStudentStudyPlan({
        examCycleId,
        planStartDate,
        selectedDailyMinutes: parseInt(dailyHours) * 60
      });
      navigate('/study-plans/weekly');
    } catch (err: any) {
      setError(err.message || 'Failed to create study plan');
      setSubmitting(false);
    }
  };

  const renderFeasibilityAlert = (status: string) => {
    switch(status) {
      case 'FULL_COVERAGE':
        return <div style={{ padding: '12px', backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} /> Syllabus comfortably fits within the given time.</div>;
      case 'TIGHT_COVERAGE':
        return <div style={{ padding: '12px', backgroundColor: '#FFFBEB', color: '#92400E', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Syllabus fits tightly within the timeframe.</div>;
      case 'COMPRESSED_COVERAGE':
        const requiredHours = preview?.feasibility?.requiredDailyMinutes 
          ? Math.ceil(preview.feasibility.requiredDailyMinutes / 60)
          : null;
          
        return (
          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' }}>
              Timeframe Insufficient
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
              Based on the start date and exam date, you do not have enough time to finish the syllabus at {dailyHours} hours/day. 
              {requiredHours && (
                <span style={{ display: 'block', marginTop: '8px', fontWeight: 500 }}>
                  You must study at least <strong style={{ fontSize: '16px', color: '#DC2626' }}>{requiredHours} hours per day</strong> to complete the syllabus in time.
                </span>
              )}
            </div>
            {requiredHours && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button type="button" variant="primary" size="sm" onClick={() => {
                  setDailyHours(String(requiredHours));
                  alert(`Daily hours updated to ${requiredHours}. Please click 'Calculate & Preview Plan' again.`);
                }}>
                  Yes, Update to {requiredHours} hrs/day
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  alert('Please select a different exam cycle.');
                  setPreview(null);
                }}>
                  No, I'll Change Exam
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
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

      <main style={{ maxWidth: '1000px', margin: '36px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Plan Configuration</h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>Tell us your goals and we'll generate a personalized day-by-day schedule.</p>

        {error && <div style={{ marginBottom: '16px' }}><Alert variant="error" title="Error" message={error} /></div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Settings</h2>
            <form onSubmit={handlePreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              <FormField label="How many hours can you study daily?" required>
                <Select 
                  value={dailyHours} 
                  onChange={e => setDailyHours(e.target.value)}
                  options={[
                    { label: '2 Hours / Day', value: '2' },
                    { label: '3 Hours / Day', value: '3' },
                    { label: '4 Hours / Day', value: '4' },
                    { label: '5 Hours / Day', value: '5' },
                    { label: '6 Hours / Day', value: '6' },
                    { label: '7 Hours / Day', value: '7' },
                    { label: '8 Hours / Day', value: '8' },
                    { label: '9 Hours / Day', value: '9' },
                    { label: '10 Hours / Day', value: '10' },
                    { label: '11 Hours / Day', value: '11' },
                    { label: '12 Hours / Day', value: '12' },
                    { label: '13 Hours / Day', value: '13' },
                    { label: '14 Hours / Day', value: '14' },
                    { label: '15 Hours / Day', value: '15' },
                    { label: '16 Hours / Day', value: '16' }
                  ]}
                />
              </FormField>

              <div style={{ marginTop: '24px' }}>
                <Button type="submit" variant="primary" isLoading={submitting} style={{ width: '100%' }}>
                  Calculate & Preview Plan
                </Button>
              </div>
            </form>
          </Card>

          <div>
            {preview ? (
              <Card style={{ padding: '24px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} /> Plan Preview
                </h2>
                
                {renderFeasibilityAlert(preview.feasibility.coverageStatus)}

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Identified Strategy</div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{preview.rule.name}</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{preview.rule.description}</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Daily Time Distribution</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Concept Study</span>
                      <span style={{ color: '#2563EB', fontWeight: 600 }}>{preview.distribution.conceptMinutes} mins</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Revision</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>{preview.distribution.revisionMinutes} mins</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>MCQ Practice</span>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>{preview.distribution.mcqMinutes} mins</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Current Affairs</span>
                      <span style={{ color: '#7C3AED', fontWeight: 600 }}>{preview.distribution.currentAffairsMinutes} mins</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Timeline Details</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>
                    Days Remaining: <strong>{preview.feasibility.daysRemaining} days</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>
                    Concept Completion Estimated In: <strong>{preview.feasibility.estimatedConceptCompletionDays} days</strong>
                  </div>
                </div>

                <Button variant="primary" onClick={handleSave} isLoading={submitting} style={{ width: '100%' }}>
                  <Save size={16} style={{ marginRight: '8px' }} /> Confirm & Generate Plan
                </Button>
              </Card>
            ) : (
              <Card style={{ padding: '48px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
                <Clock size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#475569', margin: '0 0 8px 0' }}>No Preview Generated</h3>
                <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0, maxWidth: '250px' }}>Fill out your configuration and click "Calculate & Preview" to see your dynamic plan distribution.</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
