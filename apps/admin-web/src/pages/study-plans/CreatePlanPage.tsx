import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge, Alert } from '@study-karnataka/ui';
import { Calendar, User, Save, Clock, BookOpen, Layers, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculatePlanPreview, createStudyPlan, fetchStudyPlanTemplates } from '../../services/studyPlansApi';
import { fetchExams } from '../../services/examApi';
import { fetchStudents } from '../../services/studentApi';

export const CreatePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceRuleId = searchParams.get('ruleId') || undefined;
  
  const [localTemplateId, setLocalTemplateId] = useState(searchParams.get('templateId') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState(searchParams.get('examId') || '');
  const [planStartDate, setPlanStartDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState(searchParams.get('dailyHours') || '4');
  const [totalTopics, setTotalTopics] = useState(searchParams.get('totalTopics') || '2000');

  // External data
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Preview state
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    // Load exams, students and templates
    const loadDependencies = async () => {
      try {
        const [examData, studentData, templateData] = await Promise.all([
          fetchExams({}),
          fetchStudents(),
          fetchStudyPlanTemplates()
        ]);
        setExams(examData);
        setStudents(studentData.data || studentData);
        setTemplates(templateData || []);
      } catch (err) {
        console.error("Failed to load form dependencies", err);
      }
    };
    loadDependencies();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setLocalTemplateId(tId);
    
    if (tId) {
      const selectedTpl = templates.find(t => t.id === tId);
      if (selectedTpl) {
        if (selectedTpl.examCycleId) setExamId(selectedTpl.examCycleId);
        if (selectedTpl.totalTopics) setTotalTopics(String(selectedTpl.totalTopics));
        if (selectedTpl.defaultDailyMinutes) setDailyHours(String(selectedTpl.defaultDailyMinutes / 60));
      }
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newExamId = e.target.value;
    setExamId(newExamId);
    
    // Auto-populate topics if we have a template for this exam
    if (newExamId) {
      const matchingTemplate = templates.find(t => t.examCycleId === newExamId);
      if (matchingTemplate && matchingTemplate.totalTopics) {
        setTotalTopics(String(matchingTemplate.totalTopics));
      }
    }
  };

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
        forceRuleId,
        templateId: localTemplateId || undefined
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
        const requiredHours = preview?.feasibility?.requiredDailyMinutes 
          ? Math.ceil(preview.feasibility.requiredDailyMinutes / 60)
          : null;
          
        return (
          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' }}>
              Timeframe Insufficient
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
              Based on the start date and exam date, the student does not have enough time to finish the syllabus at {dailyHours} hours/day. 
              {requiredHours && (
                <span style={{ display: 'block', marginTop: '8px', fontWeight: 500 }}>
                  They must study at least <strong style={{ fontSize: '16px', color: '#DC2626' }}>{requiredHours} hours per day</strong> to complete the syllabus in time.
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
                  alert('Please select the next exam cycle from the dropdown.');
                  setPreview(null);
                }}>
                  No, Generate for Next Exam
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
            
            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0F172A' }}>Base on Template</label>
              <Select 
                value={localTemplateId} 
                onChange={handleTemplateChange}
                required
                options={[
                  { label: '-- Select Template --', value: '' },
                  ...templates.map(t => ({ label: `${t.name} (Exam: ${t.examCycle?.titleEn || 'N/A'})`, value: t.id }))
                ]}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Selecting a template will auto-fill the target exam, topics, and recommended daily hours.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Select Student</label>
              <Select 
                value={studentId} 
                onChange={e => setStudentId(e.target.value)}
                options={[
                  { label: '-- Select Student --', value: '' },
                  ...students.map(s => ({ label: s.name || s.email, value: s.id }))
                ]}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Select Exam Cycle</label>
              <Select 
                value={examId} 
                onChange={handleExamChange}
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Total Syllabus Topics</label>
              <Input 
                type="number" 
                value={totalTopics} 
                onChange={e => setTotalTopics(e.target.value)} 
                placeholder="e.g. 2000"
                required
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
