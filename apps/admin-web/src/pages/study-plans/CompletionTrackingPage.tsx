import React from 'react';
import { Card, Badge, Button, EmptyState } from '@study-karnataka/ui';
import { useStudents } from '../../hooks/useStudents';
import { useNavigate } from 'react-router-dom';

export const CompletionTrackingPage: React.FC = () => {
  const { students, loading } = useStudents();
  const navigate = useNavigate();

  // Filter out students who don't have an assigned plan or planDetails
  const trackingData = students.filter(s => s.plan && s.plan !== 'N/A' && s.planDetails);

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Completion Tracking</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Monitor student progress on their active plans.</p>
        </div>
      </div>

      {loading ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading tracking data...</Card>
      ) : trackingData.length === 0 ? (
        <EmptyState
          title="No Active Tracking Data"
          description="There are currently no students with active study plans being tracked."
        />
      ) : (
        <Card style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Active Plan</th>
                <th style={{ padding: '12px 16px', width: '200px' }}>Overall Progress</th>
                <th style={{ padding: '12px 16px' }}>Tasks Completed</th>
                <th style={{ padding: '12px 16px' }}>Tasks Pending</th>
                <th style={{ padding: '12px 16px' }}>Overdue</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trackingData.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 500 }}>{student.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{student.email}</div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500, color: '#3b82f6' }}>{student.plan}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${student.planDetails?.overallCompletion || 0}%`, 
                            backgroundColor: (student.planDetails?.overallCompletion || 0) > 80 ? '#10b981' : '#3b82f6', 
                            borderRadius: '4px' 
                          }} 
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{student.planDetails?.overallCompletion || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#10b981' }}>{student.planDetails?.tasksCompleted || 0}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#f59e0b' }}>{student.planDetails?.tasksPending || 0}</td>
                  <td style={{ padding: '16px' }}>
                    {student.planDetails?.overdueTasks > 0 ? (
                      <Badge label={`${student.planDetails.overdueTasks} Overdue`} variant="error" />
                    ) : (
                      <span style={{ color: '#64748b' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {student.planDetails?.overdueTasks > 0 ? (
                      <Badge label="At Risk" variant="warning" />
                    ) : (
                      <Badge label="On Track" variant="success" />
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <Button variant="outline" onClick={() => navigate(`/students/${student.id}`)}>View Profile</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
