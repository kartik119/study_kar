import React, { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Button, Modal, FormField, Input, Select, Checkbox } from '@study-karnataka/ui';
import { fetchStudyPlanTemplates, createStudyPlanTemplate, updateStudyPlanTemplate, fetchStudyPlannerRules } from '../../services/studyPlansApi';
import { fetchExams } from '../../services/examApi';
import { Plus } from 'lucide-react';

export const PlanTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    examCycleId: '',
    plannerRuleId: '',
    defaultDailyMinutes: 240,
    totalTopics: 2000,
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
        totalTopics: Number(formData.totalTopics) || undefined
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

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Plan Templates</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Manage pre-configured templates for rapid plan assignment.</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: '8px' }} /> Create Template
        </Button>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(t)}>Edit Template</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
                setFormData({
                  ...formData, 
                  examCycleId: examId,
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
