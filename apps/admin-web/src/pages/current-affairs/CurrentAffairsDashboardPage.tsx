import React, { useEffect, useState } from 'react';
import { Card, PageHeader } from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';

export const CurrentAffairsDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    scheduled: 0,
    archived: 0,
    trash: 0,
    today: 0,
    thisMonth: 0,
    totalViews: 0,
    featured: 0,
  });
  
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from a dedicated dashboard/analytics endpoint.
    // For now, we will aggregate locally from the list api as a mockup implementation
    // matching the UI requirements.
    const fetchDashboard = async () => {
      try {
        const res = await currentAffairsApi.list({ pageSize: 50 });
        const items = res.data || [];
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        let todayCount = 0;
        let monthCount = 0;

        items.forEach((item: any) => {
          const dt = new Date(item.createdAt).getTime();
          if (dt >= startOfDay) todayCount++;
          if (dt >= startOfMonth) monthCount++;
        });

        setStats({
          total: items.length,
          published: items.filter((i: any) => i.status === 'PUBLISHED').length,
          drafts: items.filter((i: any) => i.status === 'DRAFT').length,
          scheduled: items.filter((i: any) => i.status === 'SCHEDULED').length,
          archived: items.filter((i: any) => i.status === 'ARCHIVED').length,
          trash: items.filter((i: any) => i.status === 'TRASH').length,
          today: todayCount,
          thisMonth: monthCount,
          totalViews: items.reduce((sum: number, i: any) => sum + (i.views || 0), 0),
          featured: items.filter((i: any) => i.isFeatured).length,
        });

        setRecent(items.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Current Affairs Dashboard"
        subtitle="Overview and statistics for Current Affairs"
        breadcrumbItems={[{ label: 'Dashboard', href: '/' }, { label: 'Current Affairs' }]}
      />

      <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Total Articles</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#0F172A' }}>{stats.total}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Published</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#16A34A' }}>{stats.published}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Drafts</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#D97706' }}>{stats.drafts}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Today's Articles</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#2563EB' }}>{stats.today}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Scheduled</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#9333EA' }}>{stats.scheduled}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Archived</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#94A3B8' }}>{stats.archived}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Featured</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#4F46E5' }}>{stats.featured}</h3>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '24px' }}>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Total Views</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#0F172A' }}>{stats.totalViews}</h3>
          </div>
        </Card>
      </div>

      <div style={{ padding: '24px', marginTop: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Recent Articles</h2>
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Article</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#0F172A', fontSize: '14px' }}>{item.titleEn}</p>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: item.status === 'PUBLISHED' ? '#DCFCE7' : '#F1F5F9', color: item.status === 'PUBLISHED' ? '#166534' : '#475569', borderRadius: '16px', fontSize: '12px', fontWeight: 500 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#64748B', fontSize: '14px' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <p style={{ margin: 0, color: '#334155', fontSize: '14px' }}>{item.views || 0}</p>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>No recent articles found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
