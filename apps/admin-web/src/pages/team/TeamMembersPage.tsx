// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, Badge } from '@study-karnataka/ui';
import { useTeam } from '../../hooks/useTeam';
import { useRoles } from '../../hooks/useRoles';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, Shield, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit, Ban, RefreshCw, Trash2, Mail, XSquare, Clock } from 'lucide-react';
import { MemberDetailsDrawer } from './MemberDetailsDrawer';
import { EditScopeDrawer } from './EditScopeDrawer';

export const TeamMembersPage: React.FC = () => {
  const navigate = useNavigate();
  const { members, kpi, fetchMembers, fetchKPIs, loading, suspendMember, reactivateMember, deactivateMember, resendInvite, cancelInvite } = useTeam();
  const { roles, fetchRoles } = useRoles();
  const error = null;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [examFilter, setExamFilter] = useState('All Exams');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isEditScopeOpen, setIsEditScopeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchKPIs();
    fetchRoles();
    loadData();
  }, []);

  const loadData = () => {
    fetchMembers({
      page,
      limit,
      search: search || undefined,
      role: roleFilter !== 'All Roles' ? roleFilter : undefined,
      status: statusFilter !== 'All Statuses' ? statusFilter : undefined,
      moduleAccess: moduleFilter !== 'All Modules' ? moduleFilter : undefined,
    });
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('All Roles');
    setStatusFilter('All Statuses');
    setModuleFilter('All Modules');
    setExamFilter('All Exams');
    setPage(1);
    setTimeout(() => {
      fetchMembers({ page: 1, limit });
    }, 0);
  };

  const handleRowSelect = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === members.length && members.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(members.map(m => m.id)));
    }
  };

  const getRoleColor = (roleName: string) => {
    const l = roleName?.toLowerCase() || '';
    if (l.includes('mentor')) return 'pink';
    if (l.includes('admin')) return 'blue';
    if (l.includes('manager')) return 'orange';
    if (l.includes('reviewer')) return 'purple';
    if (l.includes('support')) return 'green';
    return 'gray';
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('pending')) return 'orange';
    if (s.includes('active') && !s.includes('inactive')) return 'green';
    if (s.includes('suspend')) return 'red';
    return 'gray';
  };
  
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const openDetails = (member: any) => {
    setSelectedMember(member);
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ paddingBottom: '100px', width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* 1 & 2. Breadcrumb and Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <PageHeader
          title="Team Members"
          subtitle="Manage administrative staff, mentors and their working scope."
          breadcrumbItems={[
            { label: 'Admin', href: '/' },
            { label: 'Team', href: '/team' },
            { label: 'Team Members' },
          ]}
        />
        {/* 3. Invite Button */}
        <Button 
          variant="primary" 
          onClick={() => navigate('/team/members/invite')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Invite Team Member
        </Button>
      </div>

      {/* 4. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Total Team Members</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.total || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>All members in the platform</div>
          </div>
        </Card>
        
        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Active Members</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.active || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Currently active</div>
          </div>
        </Card>

        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
            <UserX size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Suspended Members</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.suspended || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Temporarily suspended</div>
          </div>
        </Card>

        <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Roles</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{kpi?.rolesCount || roles.length || 0}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Configured roles</div>
          </div>
        </Card>
      </div>

      {/* 5. Filter Container */}
      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search by name, email, phone or employee ID..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
              />
            </div>
          </div>
          
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Role</label>
            <select 
              value={roleFilter} 
              onChange={e => setRoleFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', backgroundColor: '#fff' }}
            >
              <option value="All Roles">All Roles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', backgroundColor: '#fff' }}
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending Invite">Pending Invite</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Module Scope</label>
            <select 
              value={moduleFilter} 
              onChange={e => setModuleFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', backgroundColor: '#fff' }}
            >
              <option value="All Modules">All Modules</option>
              <option value="Students">Students</option>
              <option value="Study Plans">Study Plans</option>
              <option value="Mock Tests">Mock Tests</option>
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>Exam Scope</label>
            <select 
              value={examFilter} 
              onChange={e => setExamFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', backgroundColor: '#fff' }}
            >
              <option value="All Exams">All Exams</option>
              <option value="UPSC">UPSC</option>
              <option value="KPSC">KPSC</option>
              <option value="KAS">KAS</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button variant="primary" onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>
      </Card>

      {/* 6. Actual Team Members Table */}
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading team members...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: '#EF4444', marginBottom: '16px' }}>Unable to load team members.</div>
            <Button variant="outline" onClick={loadData}>Retry</Button>
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Users size={48} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
              {search || roleFilter !== 'All Roles' ? 'No team members match your filters.' : 'No team members yet'}
            </h3>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>
              {search || roleFilter !== 'All Roles' 
                ? 'Try changing your search or filters.' 
                : 'Invite your first team member to start managing Study Karnataka.'}
            </p>
            {search || roleFilter !== 'All Roles' ? (
              <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/team/members/invite')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Invite Team Member
              </Button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '16px', width: '48px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedRows.size === members.length && members.length > 0} 
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>#</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Name</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Email</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Role</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Module Scope</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Exam Scope</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Last Active</th>
                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => {
                    const rowNum = (page - 1) * limit + index + 1;
                    const initials = member.fullName ? member.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                    const isSelected = selectedRows.has(member.id);
                    
                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: isSelected ? '#F0F9FF' : '#fff', cursor: 'pointer' }} onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.actions-menu')) return;
                        openDetails(member);
                      }}>
                        <td style={{ padding: '16px' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleRowSelect(member.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '16px', color: '#64748B', fontSize: '14px' }}>{rowNum}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: '#0F172A', fontSize: '14px' }}>{member.fullName}</div>
                              {member.employeeId && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{member.employeeId}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{member.email}</td>
                        <td style={{ padding: '16px' }}>
                          <Badge color={getRoleColor(member.role?.name || member.role)}>{member.role?.name || member.role || 'No Role'}</Badge>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {member.memberModuleScope?.length > 0 ? (
                              <>
                                {member.memberModuleScope.slice(0, 2).map((mod: string) => (
                                  <span key={mod} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '12px', border: '1px solid #E2E8F0' }}>{mod}</span>
                                ))}
                                {member.memberModuleScope.length > 2 && (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '12px', border: '1px solid #E2E8F0' }}>+{member.memberModuleScope.length - 2}</span>
                                )}
                              </>
                            ) : <span style={{ color: '#94A3B8', fontSize: '13px' }}>All Modules</span>}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {member.examScope?.length > 0 ? (
                              <>
                                {member.examScope.slice(0, 2).map((exam: string) => (
                                  <span key={exam} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '12px', border: '1px solid #E2E8F0' }}>{exam}</span>
                                ))}
                                {member.examScope.length > 2 && (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '12px', border: '1px solid #E2E8F0' }}>+{member.examScope.length - 2}</span>
                                )}
                              </>
                            ) : <span style={{ color: '#94A3B8', fontSize: '13px' }}>All Exams</span>}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(member.status) === 'green' ? '#10B981' : getStatusColor(member.status) === 'orange' ? '#F59E0B' : getStatusColor(member.status) === 'red' ? '#EF4444' : '#94A3B8' }} />
                              <span style={{ color: '#334155', fontSize: '14px', fontWeight: 500 }}>{member.status || 'Active'}</span>
                           </div>
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '13px' }}>
                          {member.status === 'PENDING_INVITE' || member.status === 'Pending Invite' ? 'Invitation Pending' : member.lastActive || 'Never'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
                          <div className="actions-menu" style={{ display: 'inline-block' }} onClick={(e) => { e.stopPropagation(); }}>
                            <Button 
                              variant="ghost" 
                              style={{ padding: '6px' }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === member.id ? null : member.id);
                              }}
                            >
                              <MoreHorizontal size={18} color="#64748B" />
                            </Button>
                            
                            {openMenuId === member.id && (
                              <div style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50px',
                                backgroundColor: '#fff',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                zIndex: 50,
                                minWidth: '180px',
                                textAlign: 'left',
                                padding: '8px 0'
                              }}>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => { setOpenMenuId(null); openDetails(member); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Eye size={16} /> View Details
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => { setOpenMenuId(null); navigate(`/admin/team/members/${member.id}/edit`); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Edit size={16} /> Edit Member
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => { setOpenMenuId(null); setSelectedMember(member); setIsEditScopeOpen(true); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Shield size={16} /> Edit Scope
                                </div>
                                <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }} onClick={() => setOpenMenuId(null)} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Clock size={16} /> View Activity
                                </div>
                                
                                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />
                                
                                {member.status === 'ACTIVE' && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EAB308' }} onClick={async () => { setOpenMenuId(null); await suspendMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEFCE8'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Ban size={16} /> Suspend Member
                                  </div>
                                )}
                                {(member.status === 'SUSPENDED' || member.status === 'INACTIVE') && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#10B981' }} onClick={async () => { setOpenMenuId(null); await reactivateMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#ECFDF5'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <RefreshCw size={16} /> Reactivate
                                  </div>
                                )}
                                {(member.status === 'PENDING_INVITE' || member.status === 'Pending Invite') && (
                                  <>
                                    <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3B82F6' }} onClick={async () => { setOpenMenuId(null); await resendInvite(member.id); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#EFF6FF'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <Mail size={16} /> Resend Invite
                                    </div>
                                    <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={async () => { setOpenMenuId(null); await cancelInvite(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <XSquare size={16} /> Cancel Invite
                                    </div>
                                  </>
                                )}
                                
                                {member.status !== 'PENDING_INVITE' && member.status !== 'Pending Invite' && (
                                  <div style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#EF4444' }} onClick={async () => { setOpenMenuId(null); await deactivateMember(member.id); loadData(); }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF2F2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <Trash2 size={16} /> Deactivate
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* 7. Pagination */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
              <div style={{ color: '#64748B', fontSize: '14px' }}>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, kpi?.total || members.length)} of {kpi?.total || members.length} team members
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Rows per page</span>
                  <select 
                    value={limit} 
                    onChange={e => { setLimit(Number(e.target.value)); setPage(1); setTimeout(loadData, 0); }}
                    style={{ padding: '6px 24px 6px 12px', borderRadius: '4px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '13px' }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button variant="outline" style={{ padding: '6px', minWidth: '32px' }} disabled={page === 1} onClick={() => { setPage(p => p - 1); setTimeout(loadData, 0); }}>
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant={page === 1 ? 'primary' : 'outline'} style={{ padding: '6px 12px', minWidth: '32px' }} onClick={() => { setPage(1); setTimeout(loadData, 0); }}>1</Button>
                  {kpi?.total > limit && (
                    <Button variant={page === 2 ? 'primary' : 'outline'} style={{ padding: '6px 12px', minWidth: '32px' }} onClick={() => { setPage(2); setTimeout(loadData, 0); }}>2</Button>
                  )}
                  <Button variant="outline" style={{ padding: '6px', minWidth: '32px' }} disabled={page * limit >= (kpi?.total || members.length)} onClick={() => { setPage(p => p + 1); setTimeout(loadData, 0); }}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 8. Drawer */}
      <MemberDetailsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        memberId={selectedMember?.id} 
      />
    </div>
  );
};
