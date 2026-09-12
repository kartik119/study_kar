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
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>Premium (Ends Nov 2026)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: '14px' }}>Last Active</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{student.lastActive}</span>
                </div>
              </div>
            </Card>

            <Card title="Subject Performance" style={{ flex: '2 1 400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Indian Polity</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(82 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(82 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>History</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(64 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(64 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Economy</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(42 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(42 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Environment</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(72 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(72 * (student.progress / 70)))}%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: 500 }}>Karnataka GK</div>
                  {renderProgressBar(student.progress === 0 ? 0 : Math.min(100, Math.floor(35 * (student.progress / 70))))}
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{student.progress === 0 ? 0 : Math.min(100, Math.floor(35 * (student.progress / 70)))}%</div>
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
          <Card title={`Current Plan: ${student.plan || 'None'}`}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <MetricCard title="Plan Start Date" value="24 Aug 2026" />
                <MetricCard title="Plan Target Date" value="21 Nov 2026" />
                <MetricCard title="Overall Completion" value={`${student.progress}%`} />
                <MetricCard title="Tasks Completed" value={student.progress === 0 ? '0' : Math.floor(student.progress * 1.5)} />
                <MetricCard title="Tasks Pending" value={student.progress === 0 ? '200' : Math.floor(200 - (student.progress * 1.5))} />
                <MetricCard title="Overdue Tasks" value={student.progress === 0 ? '0' : Math.floor(student.progress / 20)} badgeText={student.progress === 0 ? undefined : "Action Required"} />
             </div>
             <Button>View Full Plan</Button>
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
