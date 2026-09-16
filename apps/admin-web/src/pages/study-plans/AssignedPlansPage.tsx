import React, { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Button, Modal } from '@study-karnataka/ui';
import { fetchAssignedPlans } from '../../services/studyPlansApi';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit } from 'lucide-react';

export const AssignedPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForView, setSelectedPlanForView] = useState<any>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const navigate = useNavigate();

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
                        onClick={() => setSelectedPlanForView(p)}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        style={{ padding: '6px' }} 
                        title="Edit Plan"
                        onClick={() => setSelectedPlanForEdit(p)}
                      >
                        <Edit size={16} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
              <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '50%', color: '#2563EB' }}>
                <Eye size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#0F172A', fontSize: '16px' }}>Detailed View Upcoming</h3>
                <p style={{ margin: 0 }}>The deep plan analytics and day-by-day task view for <strong>{selectedPlanForView.student?.fullName || selectedPlanForView.student?.email}</strong> is scheduled for the Phase 5 release.</p>
              </div>
            </div>
            
            <h4 style={{ margin: '0 0 12px 0', color: '#1E293B' }}>Current Overview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Exam Cycle</div>
                <div style={{ fontWeight: 500, color: '#0F172A' }}>{selectedPlanForView.examCycle?.titleEn}</div>
              </div>
              <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Daily Commitment</div>
                <div style={{ fontWeight: 500, color: '#0F172A' }}>{selectedPlanForView.selectedDailyMinutes / 60} Hours</div>
              </div>
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px' }}>
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '50%', color: '#DC2626' }}>
                <Edit size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#991B1B', fontSize: '16px' }}>Editing Restricted</h3>
                <p style={{ margin: 0, color: '#B91C1C' }}>Modifying an active assigned plan is currently restricted to prevent synchronization issues with the student's daily tasks. Future releases will support dynamic rescaling.</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedPlanForEdit(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
