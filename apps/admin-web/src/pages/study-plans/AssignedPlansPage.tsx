import React, { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Button, Modal } from '@study-karnataka/ui';
import { fetchAssignedPlans, fetchPlanSchedule, updateAssignedPlan, deleteAssignedPlan } from '../../services/studyPlansApi';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2 } from 'lucide-react';

export const AssignedPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForView, setSelectedPlanForView] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const navigate = useNavigate();

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const updated = await updateAssignedPlan(selectedPlanForEdit.id, editFormData);
      setPlans(plans.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      setSelectedPlanForEdit(null);
    } catch (err) {
      console.error("Failed to update plan", err);
      alert("Failed to update plan");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await fetchAssignedPlans();
        setPlans(data);
      } catch (err) {
        console.error("Failed to load assigned plans", err);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const renderCoverageBadge = (status: string) => {
    switch (status) {
      case 'FULL_COVERAGE': return <Badge label="Full Coverage" variant="success" />;
      case 'TIGHT_COVERAGE': return <Badge label="Tight Coverage" variant="warning" />;
      case 'COMPRESSED_COVERAGE': return <Badge label="Compressed" variant="error" />;
      default: return <Badge label={status} variant="neutral" />;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge label="Active" variant="success" />;
      case 'DRAFT': return <Badge label="Draft" variant="neutral" />;
      case 'COMPLETED': return <Badge label="Completed" variant="info" />;
      default: return <Badge label={status} variant="neutral" />;
    }
  };

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Assigned Study Plans</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Monitor study plans actively assigned to students.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/study-plans/new')}>Create New Plan</Button>
      </div>

      {loading ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading plans...</Card>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No Assigned Plans"
          description="You haven't assigned any study plans to students yet."
          actionLabel="Create First Plan"
          onAction={() => navigate('/study-plans/new')}
        />
      ) : (
        <Card style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Exam Cycle</th>
                <th style={{ padding: '12px 16px' }}>Rule Config</th>
                <th style={{ padding: '12px 16px' }}>Daily Hours</th>
                <th style={{ padding: '12px 16px' }}>Coverage</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1e293b' }}>
                    <div>{p.student?.fullName || p.student?.email}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.student?.phone}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{p.examCycle?.titleEn}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Exam: {new Date(p.examDate).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{p.plannerRule?.name}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{p.selectedDailyMinutes / 60} hrs/day</td>
                  <td style={{ padding: '14px 16px' }}>{renderCoverageBadge(p.coverageStatus)}</td>
                  <td style={{ padding: '14px 16px' }}>{renderStatusBadge(p.status)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        variant="ghost" 
                        style={{ padding: '6px' }} 
                        title="View Details"
                        onClick={async () => {
                          setSelectedPlanForView(p);
                          setLoadingSchedule(true);
                          try {
                            const sched = await fetchPlanSchedule(p.id);
                            setScheduleData(sched);
                          } catch(err) {
                            console.error("Failed to fetch schedule", err);
                          } finally {
                            setLoadingSchedule(false);
                          }
                        }}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        style={{ padding: '6px' }} 
                        title="Edit Plan"
                        onClick={() => {
                          setSelectedPlanForEdit(p);
                          setEditFormData({
                            status: p.status,
                            coverageStatus: p.coverageStatus,
                            planStartDate: p.planStartDate ? new Date(p.planStartDate).toISOString().split('T')[0] : '',
                            examDate: p.examDate ? new Date(p.examDate).toISOString().split('T')[0] : '',
                            selectedDailyMinutes: p.selectedDailyMinutes,
                            dailyConceptMinutes: p.dailyConceptMinutes,
                            dailyRevisionMinutes: p.dailyRevisionMinutes,
                            dailyMcqMinutes: p.dailyMcqMinutes,
                            dailyCurrentAffairsMinutes: p.dailyCurrentAffairsMinutes
                          });
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        style={{ padding: '6px', color: '#EF4444' }} 
                        title="Delete Plan"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this assigned plan? This action cannot be undone.")) {
                            try {
                              await deleteAssignedPlan(p.id);
                              setPlans(plans.filter(plan => plan.id !== p.id));
                            } catch (err) {
                              console.error("Failed to delete plan", err);
                              alert("Failed to delete plan");
                            }
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* View Plan Modal */}
      <Modal 
        isOpen={!!selectedPlanForView} 
        onClose={() => setSelectedPlanForView(null)}
        title="Study Plan Details"
      >
        {selectedPlanForView && (
          <div style={{ padding: '8px 0', color: '#475569', fontSize: '14px' }}>
            {selectedPlanForView.selectedDailyMinutes < selectedPlanForView.recommendedDailyMinutes && (
              <div style={{ padding: '12px', backgroundColor: '#FFF7ED', color: '#C2410C', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #F97316' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Timeline Scaled Down</strong>
                The standard rule requires {selectedPlanForView.recommendedDailyMinutes / 60} hours/day, but the student selected {selectedPlanForView.selectedDailyMinutes / 60} hours/day. The syllabus completion is stretched further out (e.g., targeting next year's exam).
              </div>
            )}
            
            <h4 style={{ margin: '0 0 12px 0', color: '#1E293B' }}>Daily Target Distribution</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#EFF6FF' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Concepts</div>
                <div style={{ fontWeight: 500, color: '#1D4ED8' }}>{selectedPlanForView.dailyConceptMinutes} mins</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Topics/Day</div>
                <div style={{ fontWeight: 500, color: '#0F172A' }}>
                  {selectedPlanForView.template?.totalTopics && selectedPlanForView.estimatedConceptCompletionDays 
                    ? Math.max(1, Math.round(selectedPlanForView.template.totalTopics / selectedPlanForView.estimatedConceptCompletionDays)) + ' topics' 
                    : 'Auto-scaled'}
                </div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#ECFDF5' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Revision</div>
                <div style={{ fontWeight: 500, color: '#047857' }}>{selectedPlanForView.dailyRevisionMinutes} mins</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFBEB' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>MCQs</div>
                <div style={{ fontWeight: 500, color: '#B45309' }}>{selectedPlanForView.dailyMcqMinutes} mins</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F5F3FF' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Current Affairs</div>
                <div style={{ fontWeight: 500, color: '#6D28D9' }}>{selectedPlanForView.dailyCurrentAffairsMinutes} mins</div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', color: '#1E293B' }}>Upcoming Weekly Schedule (First 7 Days)</h4>
            {loadingSchedule ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading schedule...</div>
            ) : scheduleData.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>No schedule generated for this plan yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {scheduleData.map((day: any) => (
                  <div key={day.id} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', backgroundColor: '#fff' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Day {day.dayNumber} - {new Date(day.date).toLocaleDateString()}</div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '13px' }}>
                      {day.tasks?.filter((t:any) => t.taskType === 'CONCEPT').map((task: any) => (
                        <li key={task.id} style={{ marginBottom: '4px' }}>
                          <span style={{ color: '#2563EB', fontWeight: 500 }}>{task.durationMinutes}m Concept</span>: {task.topic?.name || 'Untitled Topic'}
                        </li>
                      ))}
                      {day.tasks?.filter((t:any) => t.taskType === 'REVISION').map((task: any) => (
                        <li key={task.id} style={{ marginBottom: '4px' }}>
                          <span style={{ color: '#059669', fontWeight: 500 }}>{task.durationMinutes}m Revision</span>
                        </li>
                      ))}
                      {day.tasks?.filter((t:any) => t.taskType === 'MCQ').map((task: any) => (
                        <li key={task.id} style={{ marginBottom: '4px' }}>
                          <span style={{ color: '#D97706', fontWeight: 500 }}>{task.durationMinutes}m MCQ Practice</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedPlanForView(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Plan Modal */}
      <Modal 
        isOpen={!!selectedPlanForEdit} 
        onClose={() => setSelectedPlanForEdit(null)}
        title="Edit Study Plan"
      >
        {selectedPlanForEdit && (
          <div style={{ padding: '8px 0', color: '#475569', fontSize: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Status</label>
                <select name="status" value={editFormData.status || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Coverage Status</label>
                <select name="coverageStatus" value={editFormData.coverageStatus || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
                  <option value="FULL_COVERAGE">Full Coverage</option>
                  <option value="TIGHT_COVERAGE">Tight Coverage</option>
                  <option value="COMPRESSED_COVERAGE">Compressed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Plan Start Date</label>
                <input type="date" name="planStartDate" value={editFormData.planStartDate || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Exam Date</label>
                <input type="date" name="examDate" value={editFormData.examDate || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Total Daily Minutes</label>
                <input type="number" name="selectedDailyMinutes" value={editFormData.selectedDailyMinutes || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Daily Concept Minutes</label>
                <input type="number" name="dailyConceptMinutes" value={editFormData.dailyConceptMinutes || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Daily Revision Minutes</label>
                <input type="number" name="dailyRevisionMinutes" value={editFormData.dailyRevisionMinutes || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Daily MCQ Minutes</label>
                <input type="number" name="dailyMcqMinutes" value={editFormData.dailyMcqMinutes || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Daily Current Affairs Minutes</label>
                <input type="number" name="dailyCurrentAffairsMinutes" value={editFormData.dailyCurrentAffairsMinutes || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setSelectedPlanForEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
