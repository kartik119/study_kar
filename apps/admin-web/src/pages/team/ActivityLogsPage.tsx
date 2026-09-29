// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, Badge, DropdownMenu } from '@study-karnataka/ui';
import { teamApi } from '../../api/team.api';
import { Search, Activity, Users, FileText, Settings, Shield, ChevronLeft, ChevronRight, MoreHorizontal, Eye, X, List, Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { ActivityDetailsDrawer } from './ActivityDetailsDrawer';
import { format } from 'date-fns';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState([]);
  const [kpi, setKpi] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState('All Types');
  const [teamMember, setTeamMember] = useState('All Members');
  const [module, setModule] = useState('All Modules');
  const [dateRange, setDateRange] = useState('All Time');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIs();
    loadData();
  }, [page, limit]);

  const fetchKPIs = async () => {
    try {
      const res = await teamApi.getActivityLogsKPIs();
      if (res.success) {
        setKpi(res.data);
        setSummary(res.data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await teamApi.getActivityLogs({
        page,
        limit,
        search: search || undefined,
        activityType: activityType !== 'All Types' ? activityType : undefined,
        module: module !== 'All Modules' ? module : undefined,
      });
      if (res.success) {
        setLogs(res.data.items);
        setTotal(res.data.meta.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActivityType('All Types');
    setTeamMember('All Members');
    setModule('All Modules');
    setDateRange('All Time');
    setPage(1);
    setTimeout(() => {
      loadData();
    }, 0);
  };

  const openDetails = async (id: string) => {
    try {
      const res = await teamApi.getActivityLogDetails(id);
      if (res.success) {
        setSelectedLog(res.data);
        setIsDrawerOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const getModuleBadge = (mod: string) => {
    const m = mod?.toUpperCase() || '';
    if (m === 'WORK_ASSIGNMENT') return <Badge color="purple">Work Assignments</Badge>;
    if (m === 'TEAM' || m === 'ROLE_PERMISSION') return <Badge color="blue">Team Management</Badge>;
    if (m === 'AUTH' || m === 'SYSTEM' || m === 'SETTINGS') return <Badge color="gray">System</Badge>;
    return <Badge color="green">{mod}</Badge>;
  };

  return (
    <div style={{ paddingBottom: '100px', width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <PageHeader
          title="Activity Logs"
          subtitle="Track and monitor all team activities, changes and important actions across the platform."
          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Team', href: '/team' },
            { label: 'Activity Logs' },
          ]}
        />
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Total Activities</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.totalActivities || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>All recorded activities</div>
          </div>
        </Card>
        
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Team Management</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.teamManagement || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Member, role and permission changes</div>
          </div>
        </Card>
        
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D946EF' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Work Assignment</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.workAssignments || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Assignment related activities</div>
          </div>
        </Card>
        
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
            <Settings size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>System Activities</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.systemActivities || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Login, settings and other system actions</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="Search by user, action, details or ID..." 
              style={{ width: '100%', height: '36px', paddingLeft: '36px', paddingRight: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
            />
          </div>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Activity Type</label>
          <select 
            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: 'white' }}
            value={activityType}
            onChange={e => setActivityType(e.target.value)}
          >
            <option>All Types</option>
            <option>Team</option>
            <option>Role & Permission</option>
            <option>Work Assignment</option>
            <option>Authentication</option>
            <option>Study Material</option>
            <option>Student</option>
            <option>Settings</option>
            <option>System</option>
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Team Member</label>
          <select 
            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: 'white' }}
            value={teamMember}
            onChange={e => setTeamMember(e.target.value)}
          >
            <option>All Members</option>
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Module</label>
          <select 
            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: 'white' }}
            value={module}
            onChange={e => setModule(e.target.value)}
          >
            <option>All Modules</option>
            <option>TEAM</option>
            <option>ROLE_PERMISSION</option>
            <option>WORK_ASSIGNMENT</option>
            <option>AUTH</option>
            <option>STUDY_MATERIAL</option>
            <option>STUDENT</option>
            <option>SYSTEM</option>
          </select>
        </div>

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Date Range</label>
          <select 
            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: 'white' }}
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option>All Time</option>
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>

        <Button variant="secondary" onClick={handleResetFilters} style={{ height: '36px', padding: '0 16px' }}>Reset</Button>
        <Button variant="primary" onClick={handleApplyFilters} style={{ height: '36px', padding: '0 16px' }}>Apply Filters</Button>
      </Card>

      {/* Main Content Layout */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: 77% */}
        <Card style={{ flex: '7.7', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Activity Log Directory</h3>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>Complete history of all team activities and changes.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{total} activities</span>
              <select 
                value={limit} 
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{ height: '32px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: 'white' }}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Activity Type</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Module</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>IP Address</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading activities...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#0F172A', fontWeight: 500, marginBottom: '8px' }}>No activities match your filters.</div>
                      <Button variant="secondary" onClick={handleResetFilters}>Clear Filters</Button>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: 'white' }}>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '14px', color: '#0F172A', fontWeight: 500 }}>{format(new Date(log.createdAt), 'dd MMM yyyy')}</div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{format(new Date(log.createdAt), 'hh:mm a')}</div>
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                            {log.adminUser?.fullName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{log.adminUser?.fullName || 'System Automated Process'}</div>
                            <div style={{ fontSize: '13px', color: '#64748B' }}>{log.adminUser?.adminProfile?.designation || log.adminUser?.adminRoles?.[0]?.role?.name || 'Admin'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        <Badge color="gray">{log.module}</Badge>
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', fontSize: '14px', color: '#0F172A' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', fontSize: '14px', color: '#475569' }}>
                        {log.reason || `Target: ${log.recordId || '-'}`}
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                        {getModuleBadge(log.module)}
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', fontSize: '14px', color: '#64748B' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ position: 'relative' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === log.id ? null : log.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          
                          {openMenuId === log.id && (
                            <DropdownMenu 
                              isOpen={true} 
                              onClose={() => setOpenMenuId(null)}
                              items={[
                                { label: 'View Details', icon: <Eye size={16} />, onClick: () => openDetails(log.id) }
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total} activities
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                variant="secondary" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px' }}
              >
                Previous
              </Button>
              <Button 
                variant="secondary" 
                disabled={page * limit >= total} 
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px' }}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        {/* RIGHT COLUMN: 23% */}
        <div style={{ flex: '2.3', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>Activity Summary</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>Overview of team activities and key insights.</p>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Activity Types</h4>
                <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>View All</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {summary?.categoryBreakdown?.map((cat: any, idx: number) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <List size={14} color="#64748B" />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{cat.category}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{cat.count}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((cat.count / Math.max(kpi?.totalActivities || 1, 1)) * 100, 100)}%`, backgroundColor: '#3B82F6', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>Today's Activities</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{kpi?.todayActivities || 0}</div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>Active Team Members</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{kpi?.activeTeamMembersToday || 0}</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Top Active Team Members</h4>
                <button style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>View All</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {summary?.topActiveMembers?.map((m: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{m.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{m.role}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{m.count}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 12px 0' }}>Recent Activity Insights</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary?.insights?.map((ins: string, idx: number) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
            </div>

          </Card>
        </div>
      </div>

      <ActivityDetailsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        activityLog={selectedLog} 
      />
    </div>
  );
};
