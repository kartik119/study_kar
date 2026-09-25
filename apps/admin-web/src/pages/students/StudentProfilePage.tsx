import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  MetricCard,
  Card,
  Tabs,
  StatusBadge,
  Button,
  EmptyState
} from '@study-karnataka/ui';
import { useStudents } from '../../hooks/useStudents';

export const StudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { getStudent } = useStudents();
  
  const student = studentId ? getStudent(studentId) : null;

  if (!student) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <EmptyState 
          title="Student Not Found" 
          description="The student profile you are looking for does not exist or has been removed." 
          actionLabel="Back to Students"
          onAction={() => navigate('/students')}
        />
      </div>
    );
  }

  const renderProgressBar = (val: number) => (
    <div style={{ flex: 1, height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${val}%`, backgroundColor: '#3B82F6', borderRadius: '4px' }} />
    </div>
  );
  
  const getStatusBadge = (status: string) => {
    if (status === 'AT_RISK') return <StatusBadge status="At Risk" />;
    return <StatusBadge status={status} />;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title={student.name}
        subtitle="Manage student profile, progress and learning analytics."
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Students', href: '/students' },
          { label: student.name },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B', marginRight: '16px' }}>{student.id}</span>
            {getStatusBadge(student.status)}
            <Button variant="outline" onClick={() => navigate(`/students/${student.id}/edit`)}>Edit Student</Button>
            <Button variant="outline">Message</Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Overall Progress" value={`${student.progress}%`} />
        <MetricCard title="Study Time" value={student.progress === 0 ? '0h 0m' : `${Math.floor(student.progress * 2)}h ${Math.floor((student.progress * 2.5) % 60)}m`} />
        <MetricCard title="MCQs Attempted" value={student.progress === 0 ? '0' : (Math.floor(student.progress * 20)).toLocaleString()} />
        <MetricCard title="Accuracy" value={`${student.accuracy}%`} />
        <MetricCard title="Tests Taken" value={student.progress === 0 ? '0' : Math.floor(student.progress / 3)} />
        <MetricCard title="Current Streak" value={student.progress === 0 ? '0 Days' : `${Math.floor(student.progress / 5)} Days`} />
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '24px' }}>
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'progress', label: 'Learning Progress' },
            { id: 'plan', label: 'Study Plan' },
            { id: 'tests', label: 'Tests & Performance' },
            { id: 'revision', label: 'Revision' },
            { id: 'activity', label: 'Activity' },
            { id: 'subscription', label: 'Subscription' },
          ]}
        />

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Card title="Student Information" style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Email</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Mobile</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Join Date</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.joinDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Exam</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.exam}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Current Study Plan</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.plan || 'Not Assigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Subscription</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.subscriptionType || 'Free'} {student.subscriptionEndDate ? `(Ends ${student.subscriptionEndDate})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Assigned Mentor</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.assignedMentor || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Last Active</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.lastActive}</span>
                </div>
              </div>
            </Card>

            <Card title="Task Progress" style={{ flex: '2 1 400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Concepts</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(82 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(82 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Revision</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(48 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(48 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>MCQ Practice</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(80 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(80 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Current Affairs</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(55 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(55 * (student.progress / 70)))}%</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'activity' && (
          <Card title="Activity Timeline">
            {student.progress === 0 ? (
              <div style={{ color: '#64748B', padding: '20px 0' }}>No recent activity found for this student.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px' }}>Today</h4>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '70px', fontSize: '13px', color: '#64748B' }}>10:30 AM</div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>Completed Indian Polity topic</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '70px', fontSize: '13px', color: '#64748B' }}>09:45 AM</div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>Attempted KPSC Sectional Test</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '70px', fontSize: '13px', color: '#64748B' }}>09:15 AM</div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>Completed 20 MCQs</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px' }}>Yesterday</h4>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '70px', fontSize: '13px', color: '#64748B' }}>08:20 PM</div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>Completed Current Affairs</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '70px', fontSize: '13px', color: '#64748B' }}>07:30 PM</div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>Revised Indian Economy</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'plan' && (
          <Card title={`Current Plan: ${student.plan && student.plan !== 'N/A' ? student.plan : 'None'}`}>
            {(!student.plan || student.plan === 'N/A') ? (
              <div style={{ color: '#64748B', padding: '20px 0' }}>No study plan assigned to this student.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <MetricCard title="Plan Start Date" value={student.planDetails?.startDate ? new Date(student.planDetails.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
                  <MetricCard title="Plan Target Date" value={student.planDetails?.targetDate ? new Date(student.planDetails.targetDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
                  <MetricCard title="Overall Completion" value={`${student.planDetails?.overallCompletion || 0}%`} />
                  <MetricCard title="Tasks Completed" value={student.planDetails?.tasksCompleted || 0} />
                  <MetricCard title="Tasks Pending" value={student.planDetails?.tasksPending || 0} />
                  <MetricCard title="Overdue Tasks" value={student.planDetails?.overdueTasks || 0} badgeText={student.planDetails?.overdueTasks > 0 ? "Action Required" : undefined} />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Daily Target Distribution</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Concepts</div>
                      <div style={{ fontSize: '18px', fontWeight: 500, color: '#3B82F6' }}>120 mins</div>
                    </div>
                    <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Topics/Day</div>
                      <div style={{ fontSize: '18px', fontWeight: 500, color: '#0F172A' }}>1 topics</div>
                    </div>
                    <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F0FDF4' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Revision</div>
                      <div style={{ fontSize: '18px', fontWeight: 500, color: '#10B981' }}>60 mins</div>
                    </div>
                    <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFBEB' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>MCQs</div>
                      <div style={{ fontSize: '18px', fontWeight: 500, color: '#F59E0B' }}>15 mins</div>
                    </div>
                    <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FAF5FF' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Current Affairs</div>
                      <div style={{ fontSize: '18px', fontWeight: 500, color: '#A855F7' }}>45 mins</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Full Study Schedule</h3>
                    <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', backgroundColor: '#fff' }}>
                      <option>Bilingual</option>
                      <option>English</option>
                      <option>Kannada</option>
                    </select>
                  </div>
                  <Button variant="outline">Enable Edit Mode</Button>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#0F172A' }}>October 2026</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                    {Array.from({ length: 30 }).map((_, i) => {
                      const date = new Date(student.planDetails?.startDate || '2026-10-21');
                      date.setDate(date.getDate() + i);
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const currentDay = new Date(date);
                      currentDay.setHours(0, 0, 0, 0);
                      
                      let statusText = 'Pending';
                      let bg = '#F1F5F9';
                      let color = '#64748B';
                      let icon = '⏳';
                      
                      if (currentDay < today) {
                        statusText = 'Completed';
                        bg = '#DCFCE7';
                        color = '#166534';
                        icon = '✅';
                      } else if (currentDay.getTime() === today.getTime()) {
                        statusText = 'In Progress';
                        bg = '#DBEAFE';
                        color = '#1E40AF';
                        icon = '🔄';
                      }

                      return (
                        <div key={i} style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                              Day {i + 1} - {date.toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: bg, color: color }}>
                              <span>{icon}</span> {statusText}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: currentDay < today ? '#10B981' : '#E2E8F0', fontSize: '16px' }}>{currentDay < today ? '✓' : '○'}</span>
                              <span><span style={{ color: '#3B82F6', fontWeight: 600, textDecoration: currentDay < today ? 'line-through' : 'none' }}>120m Concept:</span> <span style={{ color: '#475569', textDecoration: currentDay < today ? 'line-through' : 'none' }}>{i % 2 === 0 ? 'National Current Affairs | ರಾಷ್ಟ್ರೀಯ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು' : 'International Current Affairs | ಅಂತರರಾಷ್ಟ್ರೀಯ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು'}</span></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: currentDay < today ? '#10B981' : '#E2E8F0', fontSize: '16px' }}>{currentDay < today ? '✓' : '○'}</span>
                              <span style={{ color: '#10B981', fontWeight: 600, textDecoration: currentDay < today ? 'line-through' : 'none' }}>60m Revision</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: currentDay < today ? '#10B981' : '#E2E8F0', fontSize: '16px' }}>{currentDay < today ? '✓' : '○'}</span>
                              <span style={{ color: '#F59E0B', fontWeight: 600, textDecoration: currentDay < today ? 'line-through' : 'none' }}>15m MCQ Practice</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: currentDay < today ? '#10B981' : '#E2E8F0', fontSize: '16px' }}>{currentDay < today ? '✓' : '○'}</span>
                              <span style={{ color: '#A855F7', fontWeight: 600, textDecoration: currentDay < today ? 'line-through' : 'none' }}>45m Current Affairs</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {(activeTab === 'progress' || activeTab === 'tests' || activeTab === 'revision' || activeTab === 'subscription') && (
          <Card title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data`}>
             <p style={{ fontSize: '14px', color: '#64748B' }}>
               Detailed analytics and breakdown for {activeTab} will be rendered here, integrated with the existing modules.
             </p>
          </Card>
        )}
      </div>
    </div>
  );
};
