import React, { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Button, Modal, FormField, Input, Select, Checkbox } from '@study-karnataka/ui';
import { fetchStudyPlanTemplates, createStudyPlanTemplate, updateStudyPlanTemplate, deleteStudyPlanTemplate, fetchStudyPlannerRules, simulateTemplateGeneration } from '../../services/studyPlansApi';
import { fetchExams } from '../../services/examApi';
import { Plus, Play, Activity, Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PlanTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Simulation State
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simTemplate, setSimTemplate] = useState<any>(null);
  const [simFormData, setSimFormData] = useState({ planStartDate: '', selectedDailyMinutes: 240 });
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    examCycleId: '',
    plannerRuleId: '',
    defaultDailyMinutes: 240,
    totalTopics: 2000,
    targetExamDate: '',
    isActive: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, rData, eData] = await Promise.all([
        fetchStudyPlanTemplates(),
        fetchStudyPlannerRules(),
        fetchExams()
      ]);
      setTemplates(tData);
      setRules(rData);
      setExams(eData);
    } catch (err) {
      console.error("Failed to load templates or dependencies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        examCycleId: template.examCycleId,
        plannerRuleId: template.plannerRuleId,
        defaultDailyMinutes: template.defaultDailyMinutes,
        totalTopics: template.totalTopics || 2000,
        targetExamDate: template.targetExamDate ? new Date(template.targetExamDate).toISOString().split('T')[0] : '',
        isActive: template.isActive
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        examCycleId: '',
        plannerRuleId: '',
        defaultDailyMinutes: 240,
        totalTopics: 2000,
        targetExamDate: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        defaultDailyMinutes: Number(formData.defaultDailyMinutes),
        totalTopics: Number(formData.totalTopics) || undefined,
        targetExamDate: formData.targetExamDate ? new Date(formData.targetExamDate).toISOString() : null,
      };

      if (editingTemplate) {
        await updateStudyPlanTemplate(editingTemplate.id, payload);
      } else {
        await createStudyPlanTemplate(payload);
      }
      setIsModalOpen(false);
      loadData(); // reload
    } catch (err) {
      console.error("Failed to save template", err);
      alert("Error saving template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteStudyPlanTemplate(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete template", err);
      alert("Error deleting template");
    }
  };

  const handleOpenSimModal = () => {
    setSimTemplate(null);
    setSimFormData({ 
      planStartDate: new Date().toISOString().split('T')[0], 
      selectedDailyMinutes: 240 
    });
    setSimResults(null);
    setSimError(null);
    setIsSimModalOpen(true);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimError(null);
    setSimResults(null);
    if (!simTemplate) {
      setSimError("Please select a template to test.");
      setSimulating(false);
      return;
    }
    try {
      const result = await simulateTemplateGeneration({
        templateId: simTemplate.id,
        planStartDate: simFormData.planStartDate,
        selectedDailyMinutes: Number(simFormData.selectedDailyMinutes)
      });
      setSimResults(result);
    } catch (err: any) {
      setSimError(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Plan Templates</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Manage pre-configured templates for rapid plan assignment.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => handleOpenSimModal()}>
            <Activity size={16} style={{ marginRight: '8px' }} /> Test Template
          </Button>
          <Button variant="secondary" onClick={() => navigate('/study-plans/new')}>
            <Play size={16} style={{ marginRight: '8px' }} /> Generate Plan
          </Button>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus size={16} style={{ marginRight: '8px' }} /> Create Template
          </Button>
        </div>
      </div>

      {loading ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading templates...</Card>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No Templates Configured"
          description="Create standard templates combining exams and rules for fast one-click assignments."
          actionLabel="Create First Template"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {templates.map(t => (
            <Card key={t.id} style={{ padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
                <Badge label={t.isActive ? 'Active' : 'Inactive'} variant={t.isActive ? 'success' : 'neutral'} />
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>{t.description}</p>
              
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Target Exam:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{t.examCycle?.titleEn || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Default Rule:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{t.plannerRule?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Default Hours:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{t.defaultDailyMinutes / 60} hrs/day</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Target Topics:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{t.totalTopics || 'N/A'}</span>
                </div>
                {t.targetExamDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Target Exam Date:</span>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{new Date(t.targetExamDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(t)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(t.id)} style={{ color: '#ef4444', borderColor: '#ef4444' }}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isSimModalOpen}
        onClose={() => !simulating && setIsSimModalOpen(false)}
        title="Test Plan Generation"
        maxWidth="800px"
      >
        <form onSubmit={handleRunSimulation} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 100%' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Select Target Exam</label>
            <Select
              value={simTemplate?.id || ''}
              onChange={(e) => {
                const t = templates.find(x => x.id === e.target.value);
                setSimTemplate(t || null);
                if (t) {
                  setSimFormData({...simFormData, selectedDailyMinutes: t.defaultDailyMinutes});
                }
              }}
              options={[
                { label: 'Choose an exam...', value: '' },
                ...templates.map(t => ({ 
                  label: t.examCycle?.titleEn || t.name, 
                  value: t.id 
                }))
              ]}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Simulate Start Date</label>
            <Input 
              type="date"
              value={simFormData.planStartDate}
              onChange={e => setSimFormData({...simFormData, planStartDate: e.target.value})}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#475569' }}>Simulate Daily Availability (Hours)</label>
            <Select 
              value={String(simFormData.selectedDailyMinutes / 60)}
              onChange={e => setSimFormData({...simFormData, selectedDailyMinutes: Number(e.target.value) * 60})}
              options={[
                { label: '2 Hours / Day', value: '2' },
                { label: '3 Hours / Day', value: '3' },
                { label: '4 Hours / Day', value: '4' },
                { label: '5 Hours / Day', value: '5' },
                { label: '6 Hours / Day', value: '6' },
                { label: '8 Hours / Day', value: '8' },
                { label: '10 Hours / Day', value: '10' }
              ]}
            />
          </div>
          <Button type="submit" variant="primary" isLoading={simulating}>
            Run Simulation
          </Button>
        </form>

        {simError && (
          <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px', marginBottom: '16px' }}>
            {simError}
          </div>
        )}

        {simResults && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Generated 30-Day Schedule (Preview)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
              {simResults.days.map((day: any) => (
                <div key={day.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>Day {day.dayNumber} ({new Date(day.date).toLocaleDateString()})</span>
                    <span style={{ color: '#64748B', fontSize: '13px' }}>{day.plannedMinutes} mins</span>
                  </div>
                  
                  {day.tasks.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#94A3B8' }}>No tasks scheduled.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {day.tasks.map((task: any) => (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '4px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <Badge label={task.taskType} variant="info" />
                              {task.mockTopics && task.mockTopics.length > 0 ? (
                                <details style={{ marginLeft: '8px' }}>
                                  <summary style={{ fontWeight: 500, color: '#334155', cursor: 'pointer', outline: 'none' }}>
                                    {task.mockTopics.length} Concepts Covered
                                  </summary>
                                  <div style={{ marginTop: '8px', marginLeft: '4px', color: '#475569', fontSize: '12px' }}>
                                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                      {task.mockTopics.map((t: string, idx: number) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </details>
                              ) : (
                                <span style={{ marginLeft: '8px', fontWeight: 500, color: '#334155' }}>
                                  {task.topic ? task.topic.title : 'General / Buffer'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            <Clock size={12} /> {task.plannedMinutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingTemplate ? "Edit Plan Template" : "Create New Template"}
        maxWidth="600px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Template Name" required>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Standard 1 Year Plan for KAS"
              required 
            />
          </FormField>
          
          <FormField label="Description">
            <Input 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="Brief description of when this applies"
            />
          </FormField>

          <FormField label="Target Exam Cycle" required>
            <Select 
              value={formData.examCycleId} 
              onChange={(e) => {
                const examId = e.target.value;
                const selectedExam = exams.find(ex => ex.id === examId);
                let newDate = formData.targetExamDate;
                if (!newDate && selectedExam?.tentativeExamDate) {
                  newDate = new Date(selectedExam.tentativeExamDate).toISOString().split('T')[0];
                }
                setFormData({
                  ...formData, 
                  examCycleId: examId,
                  targetExamDate: newDate,
                  // Auto-fill total topics from the exam's actual syllabus count (if it exists)
                  ...(selectedExam && selectedExam.topicCount > 0 && { totalTopics: selectedExam.topicCount })
                });
              }}
              options={[
                { label: 'Select Exam Cycle...', value: '' },
                ...exams.map(ex => ({ label: ex.titleEn, value: ex.id }))
              ]}
              required
            />
          </FormField>

          <FormField label="Target Exam Date" required>
            <Input 
              type="date"
              value={formData.targetExamDate}
              onChange={(e) => setFormData({...formData, targetExamDate: e.target.value})}
              required
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>This exact date determines the plan timeline and overrides the exam cycle's default date.</p>
          </FormField>

          <FormField label="Planner Rule" required>
            <Select 
              value={formData.plannerRuleId} 
              onChange={(e) => {
                const ruleId = e.target.value;
                const rule = rules.find(r => r.id === ruleId);
                setFormData({
                  ...formData, 
                  plannerRuleId: ruleId,
                  // Auto-fill the daily target if a rule is selected and we are creating/changing it
                  ...(rule && { defaultDailyMinutes: rule.recommendedDailyMinutes })
                });
              }}
              options={[
                { label: 'Select Planner Rule...', value: '' },
                ...rules.map(r => ({ label: r.name, value: r.id }))
              ]}
              required
            />
          </FormField>

          <FormField label="Default Daily Target (mins)" required>
            <Input 
              type="number" 
              value={formData.defaultDailyMinutes} 
              onChange={(e) => setFormData({...formData, defaultDailyMinutes: parseInt(e.target.value) || 0})} 
              required 
            />
          </FormField>

          <FormField label="Target Total Topics" required>
            <Input 
              type="number" 
              value={formData.totalTopics} 
              onChange={(e) => setFormData({...formData, totalTopics: parseInt(e.target.value) || 0})} 
              required 
            />
          </FormField>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <Checkbox 
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              id="isActiveTemplate"
              label="Active Template"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
