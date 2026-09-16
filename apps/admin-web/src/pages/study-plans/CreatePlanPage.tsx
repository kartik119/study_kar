import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, Alert } from '@study-karnataka/ui';
import { Calendar, User, Save, Clock, BookOpen, Layers, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculatePlanPreview, createStudyPlan } from '../../services/studyPlansApi';
import { fetchExams } from '../../services/examApi';
import { fetchStudents } from '../../services/studentApi';

export const CreatePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceRuleId = searchParams.get('ruleId') || undefined;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState('4');
  const [totalTopics, setTotalTopics] = useState('2000');

  // External data
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Preview state
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    // Load exams and students (simplified for this UI phase)
    const loadDependencies = async () => {
      try {
        const [examData, studentData] = await Promise.all([
          fetchExams({}),
          fetchStudents() // Note: assuming this exists or mocking for now
        ]);
        setExams(examData);
        setStudents(studentData.data || studentData);
      } catch (err) {
        console.error("Failed to load form dependencies", err);
      }
    };
    loadDependencies();
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const data = await calculatePlanPreview({
        planStartDate,
        examDate,
        selectedDailyMinutes: parseInt(dailyHours) * 60,
        totalTopics: parseInt(totalTopics) || undefined,
        forceRuleId
      });
      setPreview(data);
    } catch (err: any) {
      setError(err.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await createStudyPlan({
        studentId,
        examCycleId: examId,
        planStartDate,
        examDate,
        selectedDailyMinutes: parseInt(dailyHours) * 60,
        totalTopics: parseInt(totalTopics) || undefined,
        forceRuleId
      });
      navigate('/study-plans/assigned');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFeasibilityAlert = (status: string) => {
    switch(status) {
      case 'FULL_COVERAGE':
        return <div style={{ padding: '12px', backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} /> Syllabus comfortably fits within the given time.</div>;
      case 'TIGHT_COVERAGE':
        return <div style={{ padding: '12px', backgroundColor: '#FFFBEB', color: '#92400E', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Syllabus fits tightly within the timeframe.</div>;
      case 'COMPRESSED_COVERAGE':
        return <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Warning: The given timeframe is insufficient for full syllabus coverage at the selected daily hours.</div>;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '8px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Create Study Plan</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Configure a personalized dynamic study plan.</p>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Plan Configuration</h2>
          <form onSubmit={handlePreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Select Student</label>
              <Select 
                value={studentId} 
                onChange={e => setStudentId(e.target.value)}
                options={[
                  { label: '-- Select Student --', value: '' },
                  ...students.map(s => ({ label: s.fullName || s.email, value: s.id }))
                ]}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Select Exam Cycle</label>
              <Select 
                value={examId} 
                onChange={e => setExamId(e.target.value)}
                options={[
                  { label: '-- Select Exam --', value: '' },
                  ...exams.map(e => ({ label: e.titleEn, value: e.id }))
                ]}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Plan Start Date</label>
                <Input type="date" value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Exam Date</label>
                <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Student Daily Availability (Hours)</label>
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
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Total Syllabus Topics (Optional)</label>
              <Input 
                type="number" 
                value={totalTopics} 
                onChange={e => setTotalTopics(e.target.value)} 
                placeholder="e.g. 2000"
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Used to dynamically scale the required concept study time.</p>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Button type="submit" variant="primary" isLoading={loading} style={{ width: '100%' }}>
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
                <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Identified Rule</div>
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

              <Button variant="primary" onClick={handleSave} isLoading={loading} style={{ width: '100%' }}>
                <Save size={16} style={{ marginRight: '8px' }} /> Assign Plan to Student
              </Button>
            </Card>
          ) : (
            <Card style={{ padding: '48px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
              <Clock size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#475569', margin: '0 0 8px 0' }}>No Preview Generated</h3>
              <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0, maxWidth: '250px' }}>Fill out the configuration form and click "Calculate & Preview" to see the dynamic plan distribution.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
