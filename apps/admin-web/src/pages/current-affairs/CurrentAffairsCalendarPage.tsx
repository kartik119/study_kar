import React, { useEffect, useState } from 'react';
import { Card, PageHeader, Button } from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';

export const CurrentAffairsCalendarPage: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const fetchCalendar = async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await currentAffairsApi.getCalendar(year, month);
      setCalendarData(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();

  const getDayData = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarData.find((d) => d.date === dateStr);
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long' });

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Monthly Archive"
        subtitle="View and manage current affairs by publication date"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs', href: '/current-affairs' },
          { label: 'Monthly Archive' },
        ]}
      />

      <div style={{ padding: '0 24px', marginTop: '24px' }}>
        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <Button variant="outline" onClick={handlePrevMonth}>&larr; Previous</Button>
              <h4 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{monthName} {currentYear}</h4>
              <Button variant="outline" onClick={handleNextMonth}>Next &rarr;</Button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#64748B' }}>Loading calendar...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontWeight: 600, color: '#64748B', padding: '8px 0', fontSize: '14px' }}>{d}</div>
                ))}
                
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', opacity: 0.5 }}></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const data = getDayData(day);
                  return (
                    <div 
                      key={`day-${day}`} 
                      style={{ 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px', 
                        padding: '8px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        minHeight: '100px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3B82F6'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                    >
                      <span style={{ fontWeight: 500, color: '#334155', fontSize: '14px' }}>{day}</span>
                      {data && data.total > 0 && (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {data.publishedCount > 0 && <div style={{ fontSize: '12px', backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>Pub: {data.publishedCount}</div>}
                          {data.draftCount > 0 && <div style={{ fontSize: '12px', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px' }}>Draft: {data.draftCount}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
