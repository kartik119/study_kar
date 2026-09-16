import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, EmptyState } from '@study-karnataka/ui';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { fetchWeeklyPlanner } from '../../api/student-study-plan.api';

export const StudentWeeklyPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlanner = async () => {
      try {
        const data = await fetchWeeklyPlanner();
        if (!data) {
          // No active plan
          setDays([]);
        } else {
          setDays(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load weekly planner');
      } finally {
        setLoading(false);
      }
    };
    loadPlanner();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTaskType = (type: string) => {
    const mapping: Record<string, string> = {
      CONCEPT: 'Learn Concept',
      REVISION: 'Revise Concept',
      MCQ: 'Practice MCQs',
      CURRENT_AFFAIRS: 'Current Affairs'
    };
    return mapping[type] || type;
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading your plan...</div>;
  }

  if (error) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FC', fontFamily: 'Inter, sans-serif' }}>
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E6EAF0',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>My Weekly Planner</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </header>

      <main style={{ maxWidth: '960px', margin: '36px auto', padding: '0 24px' }}>
        {days.length === 0 ? (
          <EmptyState
            title="No Active Study Plan"
            description="You don't have a study plan assigned yet. Create one to get your personalized daily schedule."
            actionLabel="Create My Study Plan"
            onAction={() => navigate('/study-plans/create')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {days.map(day => (
              <Card key={day.id} style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={20} color="#3B82F6" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
                        {formatDate(day.date)}
                      </h3>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Day {day.dayNumber} of Plan</span>
                    </div>
                  </div>
                  <Badge label={day.status} variant={day.status === 'COMPLETED' ? 'success' : 'info'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {day.tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      style={{ 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px', 
                        padding: '16px',
                        backgroundColor: task.status === 'COMPLETED' ? '#F8FAFC' : '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase' }}>
                          {formatTaskType(task.taskType)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748B' }}>
                          <Clock size={14} /> {task.plannedMinutes}m
                        </div>
                      </div>
                      
                      {task.topic ? (
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#1E293B' }}>
                            {task.topic.title}
                          </h4>
                          {task.totalSessions > 1 && (
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              Session {task.sessionNumber} of {task.totalSessions}
                            </span>
                          )}
                        </div>
                      ) : (
                        <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 500, color: '#64748B' }}>
                          General Practice / Buffer
                        </h4>
                      )}

                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        {task.status === 'COMPLETED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '13px', fontWeight: 500 }}>
                            <CheckCircle size={16} /> Completed
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">Start Task</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
