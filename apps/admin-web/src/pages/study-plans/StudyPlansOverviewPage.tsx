import React from 'react';
import { Card, Badge } from '@study-karnataka/ui';
import { CalendarCheck, Settings, Users, BookOpen, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StudyPlansOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Study Plans Overview</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Manage and configure automated study plans for students.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Metric Cards */}
        <Card style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', color: '#2563EB' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Active Student Plans</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>0</div>
          </div>
        </Card>

        <Card style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '8px', color: '#059669' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Total Plans Created</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>0</div>
          </div>
        </Card>

        <Card style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
            <CalendarCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Plans with Tight Coverage</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>0</div>
          </div>
        </Card>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Quick Actions</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div onClick={() => handleNavigate('/study-plans/new')} style={{ cursor: 'pointer' }}>
          <Card style={{ padding: '20px', transition: 'box-shadow 0.2s', border: '1px solid #e2e8f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px', color: '#475569' }}>
                <CalendarCheck size={20} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Create a Plan</div>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Generate a new study plan for an exam cycle using dynamic rules.</p>
          </Card>
        </div>

        <div onClick={() => handleNavigate('/study-plans/assigned')} style={{ cursor: 'pointer' }}>
          <Card style={{ padding: '20px', transition: 'box-shadow 0.2s', border: '1px solid #e2e8f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px', color: '#475569' }}>
                <Users size={20} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>View Assigned Plans</div>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>List all plans currently assigned to students and track their progress.</p>
          </Card>
        </div>

        <div onClick={() => handleNavigate('/study-plans/rules')} style={{ cursor: 'pointer' }}>
          <Card style={{ padding: '20px', transition: 'box-shadow 0.2s', border: '1px solid #e2e8f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px', color: '#475569' }}>
                <Settings size={20} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Planner Rules Config</div>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Configure the time scaling rules, 1 Year Plan, 6 Month Plan, etc.</p>
          </Card>
        </div>

        <div onClick={() => handleNavigate('/study-plans/templates')} style={{ cursor: 'pointer' }}>
          <Card style={{ padding: '20px', transition: 'box-shadow 0.2s', border: '1px solid #e2e8f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px', color: '#475569' }}>
                <Layers size={20} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Plan Templates</div>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage preset plan configurations combining exams and rules.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
