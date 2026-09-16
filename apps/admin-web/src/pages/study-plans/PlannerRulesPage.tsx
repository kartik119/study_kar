import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, EmptyState, Modal, FormField, Input, Checkbox } from '@study-karnataka/ui';
import { Plus, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchStudyPlannerRules, createStudyPlannerRule, updateStudyPlannerRule } from '../../services/studyPlansApi';

export const PlannerRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minRemainingDays: 0,
    maxRemainingDays: 0,
    recommendedDailyMinutes: 0,
    conceptMinutes: 0,
    revisionMinutes: 0,
    mcqMinutes: 0,
    currentAffairsMinutes: 0,
    conceptTargetMinutes: 42000,
    priority: 0,
    isActive: true
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchStudyPlannerRules();
      setRules(data);
    } catch (err) {
      console.error("Failed to load rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleOpenModal = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        minRemainingDays: rule.minRemainingDays,
        maxRemainingDays: rule.maxRemainingDays,
        recommendedDailyMinutes: rule.recommendedDailyMinutes,
        conceptMinutes: rule.conceptMinutes,
        revisionMinutes: rule.revisionMinutes,
        mcqMinutes: rule.mcqMinutes,
        currentAffairsMinutes: rule.currentAffairsMinutes,
        conceptTargetMinutes: rule.conceptTargetMinutes || 42000,
        priority: rule.priority || 0,
        isActive: rule.isActive
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        minRemainingDays: 0,
        maxRemainingDays: 0,
        recommendedDailyMinutes: 240,
        conceptMinutes: 120,
        revisionMinutes: 60,
        mcqMinutes: 15,
        currentAffairsMinutes: 45,
        conceptTargetMinutes: 42000,
        priority: 0,
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
        minRemainingDays: Number(formData.minRemainingDays),
        maxRemainingDays: Number(formData.maxRemainingDays),
        recommendedDailyMinutes: Number(formData.recommendedDailyMinutes),
        conceptMinutes: Number(formData.conceptMinutes),
        revisionMinutes: Number(formData.revisionMinutes),
        mcqMinutes: Number(formData.mcqMinutes),
        currentAffairsMinutes: Number(formData.currentAffairsMinutes),
        conceptTargetMinutes: Number(formData.conceptTargetMinutes),
        priority: Number(formData.priority)
      };

      if (editingRule) {
        await updateStudyPlannerRule(editingRule.id, payload);
      } else {
        await createStudyPlannerRule(payload);
      }
      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      console.error("Failed to save rule", err);
      alert("Error saving rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Planner Rules Configuration</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Manage the core time distributions for different plan durations.</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: '8px' }} /> Create New Rule
        </Button>
      </div>

      {loading ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading rules...</Card>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No Rules Configured"
          description="There are currently no planner rules in the system. Seed the database or create one manually."
          onAction={() => handleOpenModal()}
          actionLabel="Create First Rule"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {rules.map(rule => (
            <Card key={rule.id} style={{ padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>{rule.name}</div>
                <Badge label={rule.isActive ? 'Active' : 'Inactive'} variant={rule.isActive ? 'success' : 'neutral'} />
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>{rule.description}</p>
              
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Applies for Days:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{rule.minRemainingDays} to {rule.maxRemainingDays} days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Recommended Base Time:</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{rule.recommendedDailyMinutes / 60} hours/day</span>
                </div>
                <div style={{ borderTop: '1px solid #E2E8F0', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Concept:</span>
                  <span style={{ fontWeight: 500 }}>{rule.conceptMinutes}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Revision:</span>
                  <span style={{ fontWeight: 500 }}>{rule.revisionMinutes}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>MCQ:</span>
                  <span style={{ fontWeight: 500 }}>{rule.mcqMinutes}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Current Affairs:</span>
                  <span style={{ fontWeight: 500 }}>{rule.currentAffairsMinutes}m</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(rule)}>Edit Rule</Button>
                <Button variant="primary" size="sm" onClick={() => navigate(`/study-plans/new?ruleId=${rule.id}`)}>
                  <Play size={14} style={{ marginRight: '4px' }} /> Generate Plan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingRule ? "Edit Planner Rule" : "Create New Rule"}
        maxWidth="600px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Rule Name" required>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. 1 Year Plan"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Min Remaining Days" required>
              <Input 
                type="number" 
                value={formData.minRemainingDays} 
                onChange={(e) => setFormData({...formData, minRemainingDays: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
            <FormField label="Max Remaining Days" required>
              <Input 
                type="number" 
                value={formData.maxRemainingDays} 
                onChange={(e) => setFormData({...formData, maxRemainingDays: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Recommended Daily (mins)" required>
              <Input 
                type="number" 
                value={formData.recommendedDailyMinutes} 
                onChange={(e) => setFormData({...formData, recommendedDailyMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
            <FormField label="Concept Target (mins)" required>
              <Input 
                type="number" 
                value={formData.conceptTargetMinutes} 
                onChange={(e) => setFormData({...formData, conceptTargetMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', margin: '8px 0 0 0' }}>Daily Time Distribution</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Concept (mins)" required>
              <Input 
                type="number" 
                value={formData.conceptMinutes} 
                onChange={(e) => setFormData({...formData, conceptMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
            <FormField label="Revision (mins)" required>
              <Input 
                type="number" 
                value={formData.revisionMinutes} 
                onChange={(e) => setFormData({...formData, revisionMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
            <FormField label="MCQ (mins)" required>
              <Input 
                type="number" 
                value={formData.mcqMinutes} 
                onChange={(e) => setFormData({...formData, mcqMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
            <FormField label="Current Affairs (mins)" required>
              <Input 
                type="number" 
                value={formData.currentAffairsMinutes} 
                onChange={(e) => setFormData({...formData, currentAffairsMinutes: parseInt(e.target.value) || 0})} 
                required 
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <Checkbox 
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              id="isActiveRule"
              label="Active Rule"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
