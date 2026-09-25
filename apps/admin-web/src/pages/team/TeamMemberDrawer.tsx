import React, { useState } from 'react';
import { Button, StatusBadge, Tabs } from '@study-karnataka/ui';
import { X, Mail, Phone, Shield, Edit, Users, CalendarCheck, Clock, CheckCircle2, Target, Briefcase, Activity } from 'lucide-react';

interface TeamMemberDrawerProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onResendInvite: (id: string) => void;
  onCancelInvite: (id: string) => void;
}

export const TeamMemberDrawer: React.FC<TeamMemberDrawerProps> = ({ 
  member, isOpen, onClose, onSuspend, onReactivate, onDeactivate, onResendInvite, onCancelInvite 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !member) return null;

  const isPending = member.status === 'Pending Invite' || member.status === 'PENDING INVITE';
  const isActive = member.status === 'ACTIVE';
  const isSuspended = member.status === 'SUSPENDED';
  const isMentor = member.role === 'MENTOR';

  const roleName = member.role === 'SUPER_ADMIN' ? 'Super Admin' 
                 : member.role === 'ADMIN' ? 'Admin'
                 : member.role === 'CONTENT_MANAGER' ? 'Content Manager'
                 : member.role === 'CONTENT_REVIEWER' ? 'Content Reviewer'
                 : member.role === 'MENTOR' ? 'Mentor'
                 : member.role === 'SUPPORT_EXECUTIVE' ? 'Support Executive'
                 : member.role;

  const roleColor = member.role === 'SUPER_ADMIN' ? { bg: '#FCE7F3', text: '#BE185D' }
                  : member.role === 'MENTOR' ? { bg: '#DCFCE7', text: '#15803D' }
                  : { bg: '#E0E7FF', text: '#4338CA' };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '33vw', minWidth: '450px', maxWidth: '600px', backgroundColor: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 }}>
            {member.name ? member.name.charAt(0).toUpperCase() : (member.fullName ? member.fullName.charAt(0).toUpperCase() : 'U')}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{member.name || member.fullName}</h2>
            <div style={{ margin: '4px 0 8px', fontSize: '14px', color: '#64748B' }}>{member.email}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ padding: '4px 10px', backgroundColor: roleColor.bg, color: roleColor.text, borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                {roleName}
              </span>
              <StatusBadge status={isActive ? 'Active' : isSuspended ? 'Suspended' : isPending ? 'Pending' : 'Inactive'} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
            <Edit size={16} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E2E8F0', padding: '0 32px', backgroundColor: '#F8FAFC' }}>
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'roles', label: 'Roles & Permissions' },
            { id: 'modules', label: 'Module Access' },
            { id: 'activity', label: 'Activity Logs' },
          ]}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '32px', flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC' }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Basic Info */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Basic Information</h4>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Full Name</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.name || member.fullName || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Email</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.email || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Phone</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.phone || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Employee ID</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.employeeId || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Department</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.department || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Designation</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.designation || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Role</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{roleName}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Status</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{isActive ? 'Active' : isSuspended ? 'Suspended' : 'Inactive'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Reporting Manager</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.reportingManager || '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Joined On</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.joinedOn ? new Date(member.joinedOn).toLocaleDateString() : '—'}</div></div>
                <div><div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Last Active</div><div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{member.lastActive ? new Date(member.lastActive).toLocaleDateString() : 'Never'}</div></div>
              </div>
            </div>

            {/* Access Summary */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Access Scope</h4>
                <button style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Access</button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Admin Modules:</h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {member.adminModuleAccess && member.adminModuleAccess.length > 0 ? member.adminModuleAccess.map((m: string) => (
                      <span key={m} style={{ padding: '4px 10px', backgroundColor: '#F1F5F9', color: '#334155', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>{m}</span>
                    )) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>None</span>}
                  </div>
                </div>
                <div style={{ height: '1px', backgroundColor: '#F1F5F9' }}></div>
                <div>
                  <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Exam Scope:</h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {member.examScope && member.examScope.length > 0 ? member.examScope.map((e: string) => (
                      <span key={e} style={{ padding: '4px 10px', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>{e}</span>
                    )) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>None</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Mentor Scope */}
            {isMentor && (
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Mentor Scope</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color="#2563EB" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Assigned Students</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{member.mentorStats?.assignedStudents || 0}</div></div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarCheck size={18} color="#16A34A" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Today's Check-ins</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{member.mentorStats?.todayCheckins || 0}</div></div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} color="#DC2626" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Pending Follow-ups</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{member.mentorStats?.pendingFollowups || 0}</div></div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={18} color="#C026D3" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Weekly Reviews Done</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{member.mentorStats?.weeklyReviews || 0}</div></div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={18} color="#EA580C" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Exam Scope</div><div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{(member.examScope || []).join(', ') || 'None'}</div></div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color="#475569" /></div>
                    <div><div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Mentorship Mode</div><div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{member.mentorProfile?.mentorshipMode || '1-to-1'}</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Recent Activity</h4>
                <button style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '16px', top: '16px', bottom: '16px', width: '2px', backgroundColor: '#E2E8F0', zIndex: 0 }}></div>
                  
                  {[
                    { desc: 'Logged into admin panel', date: 'Today', time: '09:41 AM', icon: Activity, color: '#3B82F6', bg: '#EFF6FF' },
                    { desc: 'Completed 3 student check-ins', date: 'Yesterday', time: '04:30 PM', icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
                    { desc: 'Added mentor note for Ananya R', date: 'Yesterday', time: '11:15 AM', icon: Edit, color: '#F59E0B', bg: '#FFFBEB' },
                    { desc: 'Reviewed KAS Study Plan', date: '22 Sep 2026', time: '02:00 PM', icon: Briefcase, color: '#8B5CF6', bg: '#F5F3FF' },
                  ].map((act, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', zIndex: 1, alignItems: 'flex-start' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: act.bg, border: '4px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <act.icon size={14} color={act.color} />
                      </div>
                      <div style={{ paddingTop: '4px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{act.desc}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{act.date} at {act.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab !== 'overview' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#64748B', fontSize: '14px' }}>This section is partially populated in the Overview tab for this demo.</p>
          </div>
        )}
      </div>

      {/* Footer Actions - Sticky */}
      <div style={{ padding: '20px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '16px', backgroundColor: '#FFFFFF' }}>
        {isPending ? (
          <>
            <Button variant="primary" style={{ flex: 1 }} onClick={() => onResendInvite(member.id)}>Resend Invite</Button>
            <Button variant="danger" style={{ flex: 1 }} onClick={() => onCancelInvite(member.id)}>Cancel Invite</Button>
          </>
        ) : isActive ? (
          <>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setActiveTab('activity')}>View Activity Logs</Button>
            <Button variant="secondary" style={{ flex: 1, color: '#EF4444', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }} onClick={() => onSuspend(member.id)}>Suspend Member</Button>
            <Button variant="danger" style={{ flex: 'none', padding: '0 20px' }} onClick={() => onDeactivate(member.id)}>Deactivate</Button>
          </>
        ) : isSuspended ? (
          <>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setActiveTab('activity')}>View Activity Logs</Button>
            <Button variant="primary" style={{ flex: 1 }} onClick={() => onReactivate(member.id)}>Reactivate</Button>
            <Button variant="danger" style={{ flex: 'none', padding: '0 20px' }} onClick={() => onDeactivate(member.id)}>Deactivate</Button>
          </>
        ) : (
          <div style={{ color: '#64748B', fontSize: '14px', width: '100%', textAlign: 'center' }}>Member is inactive</div>
        )}
      </div>
    </div>
  );
};
