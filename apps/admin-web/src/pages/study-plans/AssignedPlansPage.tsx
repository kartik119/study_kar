import React, { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Button, Modal, Select } from '@study-karnataka/ui';
import { fetchAssignedPlans, fetchPlanSchedule, updateAssignedPlan, deleteAssignedPlan, updateStudyPlanTask, deleteStudyPlanTask, addStudyPlanTask } from '../../services/studyPlansApi';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus, Check, X } from 'lucide-react';

export const AssignedPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForView, setSelectedPlanForView] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskMins, setEditingTaskMins] = useState<number>(0);
  const [addingTaskToDayId, setAddingTaskToDayId] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<any>({ taskType: 'REVISION', plannedMinutes: 60 });
  const [languageView, setLanguageView] = useState<'ENGLISH' | 'KANNADA' | 'BILINGUAL'>('BILINGUAL');
  
  const navigate = useNavigate();

  const filteredPlans = plans.filter(p => {
    if (filterMonth === 'ALL' && filterYear === 'ALL') return true;
    
    // Using planStartDate as the "joined" date
    const date = new Date(p.planStartDate);
    const month = (date.getMonth() + 1).toString();
    const year = date.getFullYear().toString();
    
    if (filterMonth !== 'ALL' && filterMonth !== month) return false;
    if (filterYear !== 'ALL' && filterYear !== year) return false;
    return true;
  });

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

  const refreshSchedule = async (planId: string) => {
    try {
      const sched = await fetchPlanSchedule(planId);
      setScheduleData(sched);
    } catch(err) {
      console.error("Failed to fetch schedule", err);
    }
  };

  const handleTaskUpdate = async (taskId: string) => {
    if (!selectedPlanForView) return;
    try {
      await updateStudyPlanTask(selectedPlanForView.id, taskId, { plannedMinutes: editingTaskMins });
      setEditingTaskId(null);
      await refreshSchedule(selectedPlanForView.id);
    } catch(err) {
      alert("Failed to update task");
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!selectedPlanForView) return;
    if (window.confirm("Delete this task from the schedule?")) {
      try {
        await deleteStudyPlanTask(selectedPlanForView.id, taskId);
        await refreshSchedule(selectedPlanForView.id);
      } catch(err) {
        alert("Failed to delete task");
      }
    }
  };

  const handleTaskAdd = async (dayId: string) => {
    if (!selectedPlanForView) return;
    try {
      await addStudyPlanTask(selectedPlanForView.id, dayId, newTaskData);
      setAddingTaskToDayId(null);
      setNewTaskData({ taskType: 'REVISION', plannedMinutes: 60 });
      await refreshSchedule(selectedPlanForView.id);
    } catch(err) {
      alert("Failed to add task");
    }
  };

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
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Joined Month</label>
              <Select 
                value={filterMonth} 
                onChange={(e: any) => setFilterMonth(e.target.value)}
                options={[
                  { label: "All Months", value: "ALL" },
                  { label: "January", value: "1" },
                  { label: "February", value: "2" },
                  { label: "March", value: "3" },
                  { label: "April", value: "4" },
                  { label: "May", value: "5" },
                  { label: "June", value: "6" },
                  { label: "July", value: "7" },
                  { label: "August", value: "8" },
                  { label: "September", value: "9" },
                  { label: "October", value: "10" },
                  { label: "November", value: "11" },
                  { label: "December", value: "12" }
                ]}
              />
            </div>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Joined Year</label>
              <Select 
                value={filterYear} 
                onChange={(e: any) => setFilterYear(e.target.value)}
                options={[
                  { label: "All Years", value: "ALL" },
                  { label: "2024", value: "2024" },
                  { label: "2025", value: "2025" },
                  { label: "2026", value: "2026" },
                  { label: "2027", value: "2027" }
                ]}
              />
            </div>
          </div>
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
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No students joined in this selected time period.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((p) => (
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
                  ))
                )}
            </tbody>
          </table>
        </Card>
        </>
      )}

      {/* View Plan Modal */}
      <Modal 
        isOpen={!!selectedPlanForView} 
        onClose={() => setSelectedPlanForView(null)}
        title="Study Plan Details"
        maxWidth="800px"
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
                  {(() => {
                    if (selectedPlanForView.template?.totalTopics && selectedPlanForView.estimatedConceptCompletionDays) {
                      return Math.max(1, Math.round(selectedPlanForView.template.totalTopics / selectedPlanForView.estimatedConceptCompletionDays)) + ' topics';
                    }
                    if (scheduleData && scheduleData.length > 0) {
                      const conceptDay = scheduleData.find((day: any) => day.tasks?.some((t: any) => t.taskType === 'CONCEPT'));
                      if (conceptDay) {
                        const conceptTasks = conceptDay.tasks.filter((t: any) => t.taskType === 'CONCEPT');
                        // mockTopics handling (when topics are combined into one task but mockTopics array is set)
                        if (conceptTasks[0].mockTopics && conceptTasks[0].mockTopics.length > 0) {
                          return conceptTasks[0].mockTopics.length + ' topics';
                        }
                        return conceptTasks.length + ' topics';
                      }
                    }
                    return 'Auto-scaled';
                  })()}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h4 style={{ margin: 0, color: '#1E293B' }}>Full Study Schedule</h4>
                <select 
                  value={languageView} 
                  onChange={e => setLanguageView(e.target.value as any)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="ENGLISH">English</option>
                  <option value="KANNADA">Kannada</option>
                  <option value="BILINGUAL">Bilingual</option>
                </select>
              </div>
              <Button 
                variant={isScheduleEditMode ? "primary" : "secondary"} 
                onClick={() => setIsScheduleEditMode(!isScheduleEditMode)}
              >
                {isScheduleEditMode ? "Disable Edit Mode" : "Enable Edit Mode"}
              </Button>
            </div>
            {loadingSchedule ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading schedule...</div>
            ) : scheduleData.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>No schedule generated for this plan yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {(() => {
                  let currentMonthStr = '';
                  let hasShownRevisionHeader = false;
                  return scheduleData.map((day: any) => {
                    const date = new Date(day.date);
                    const monthStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const isNewMonth = monthStr !== currentMonthStr;
                    if (isNewMonth) {
                      currentMonthStr = monthStr;
                    }
                    
                    const conceptTasks = day.tasks?.filter((t:any) => t.taskType === 'CONCEPT') || [];
                    const hasConcepts = conceptTasks.length > 0;
                    
                    const isFirstRevisionDay = !hasConcepts && !hasShownRevisionHeader && day.dayNumber > 1; // Ensure it's not just day 1 of an empty plan
                    if (isFirstRevisionDay) {
                      hasShownRevisionHeader = true;
                    }
                    
                    return (
                      <React.Fragment key={day.id}>
                        {isNewMonth && (
                          <div style={{ 
                            marginTop: '16px', 
                            marginBottom: '4px', 
                            paddingBottom: '4px', 
                            borderBottom: '2px solid #E2E8F0', 
                            color: '#0F172A', 
                            fontWeight: 700, 
                            fontSize: '16px',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#fff',
                            zIndex: 10,
                            paddingTop: '8px'
                          }}>
                            {monthStr}
                          </div>
                        )}
                        
                        {isFirstRevisionDay && (
                          <div style={{
                            margin: '8px 0',
                            padding: '12px 16px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #34D399',
                            borderRadius: '8px',
                            color: '#047857',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}>
                            <span style={{ fontSize: '18px' }}>🎉</span> 
                            Syllabus is fully covered! The remaining days are dedicated exclusively to revision and practice.
                          </div>
                        )}

                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', backgroundColor: '#fff' }}>
                          <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Day {day.dayNumber} - {date.toLocaleDateString()}</div>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '13px' }}>
                            {day.tasks?.map((task: any) => {
                              const isEditing = editingTaskId === task.id;
                              let color = '#475569';
                              let label = task.taskType;
                              if (task.taskType === 'CONCEPT') { color = '#2563EB'; label = 'Concept'; }
                              if (task.taskType === 'REVISION') { color = '#059669'; label = 'Revision'; }
                              if (task.taskType === 'MCQ') { color = '#D97706'; label = 'MCQ Practice'; }
                              if (task.taskType === 'CURRENT_AFFAIRS') { color = '#7C3AED'; label = 'Current Affairs'; }
                              
                              const renderTopicName = (topic: any) => {
                                if (!topic) return 'Untitled Topic';
                                if (languageView === 'ENGLISH') return topic.nameEn || 'Untitled Topic';
                                if (languageView === 'KANNADA') return topic.nameKn || topic.nameEn || 'Untitled Topic';
                                const knStr = topic.nameKn ? ` | ${topic.nameKn}` : '';
                                return `${topic.nameEn || 'Untitled Topic'}${knStr}`;
                              };

                              return (
                                <li key={task.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ flex: 1 }}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                          type="number" 
                                          value={editingTaskMins} 
                                          onChange={e => setEditingTaskMins(Number(e.target.value))}
                                          style={{ width: '60px', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                        />
                                        <span>m {label}</span>
                                        {task.taskType === 'CONCEPT' && <span>: {renderTopicName(task.topic)}</span>}
                                      </div>
                                    ) : (
                                      <div>
                                        <span style={{ color: color, fontWeight: 500 }}>{task.plannedMinutes}m {label}</span>
                                        {task.taskType === 'CONCEPT' && <span>: {renderTopicName(task.topic)}</span>}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isScheduleEditMode && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {isEditing ? (
                                        <>
                                          <Button variant="ghost" style={{ padding: '4px', color: '#10B981' }} onClick={() => handleTaskUpdate(task.id)}><Check size={14} /></Button>
                                          <Button variant="ghost" style={{ padding: '4px', color: '#64748B' }} onClick={() => setEditingTaskId(null)}><X size={14} /></Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button variant="ghost" style={{ padding: '4px', color: '#64748B' }} onClick={() => { setEditingTaskId(task.id); setEditingTaskMins(task.plannedMinutes); }}><Edit size={14} /></Button>
                                          <Button variant="ghost" style={{ padding: '4px', color: '#EF4444' }} onClick={() => handleTaskDelete(task.id)}><Trash2 size={14} /></Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          {isScheduleEditMode && (
                            <div style={{ marginTop: '12px' }}>
                              {addingTaskToDayId === day.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                  <select value={newTaskData.taskType} onChange={e => setNewTaskData({...newTaskData, taskType: e.target.value})} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
                                    <option value="CONCEPT">Concept</option>
                                    <option value="REVISION">Revision</option>
                                    <option value="MCQ">MCQ</option>
                                    <option value="CURRENT_AFFAIRS">Current Affairs</option>
                                  </select>
                                  <input type="number" value={newTaskData.plannedMinutes} onChange={e => setNewTaskData({...newTaskData, plannedMinutes: Number(e.target.value)})} style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                                  <span>m</span>
                                  <Button variant="ghost" style={{ padding: '4px', color: '#10B981' }} onClick={() => handleTaskAdd(day.id)}><Check size={14} /></Button>
                                  <Button variant="ghost" style={{ padding: '4px', color: '#64748B' }} onClick={() => setAddingTaskToDayId(null)}><X size={14} /></Button>
                                </div>
                              ) : (
                                <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '12px', color: '#3B82F6' }} onClick={() => setAddingTaskToDayId(day.id)}>
                                  <Plus size={14} style={{ marginRight: '4px' }} /> Add Task
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
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
