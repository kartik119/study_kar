import React, { useEffect, useState } from 'react';
import { Drawer, Badge, Tabs, Button } from '@study-karnataka/ui';
import { useTeam } from '../../hooks/useTeam';
import { useNavigate } from 'react-router-dom';

interface MemberDetailsDrawerProps {
  memberId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailsDrawer: React.FC<MemberDetailsDrawerProps> = ({ memberId, isOpen, onClose }) => {
  const { getMemberDetails } = useTeam();
  const navigate = useNavigate();
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    if (memberId && isOpen) {
      getMemberDetails(memberId).then(data => setMember(data));
    }
  }, [memberId, isOpen]);

  if (!member) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Team Member Details" size="lg">
      <div style={{ padding: '24px' }}>
        <Tabs
          tabs={[
            {
              label: 'Overview',
              content: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, color: '#475569' }}>
                      {member.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 600, color: '#1E293B' }}>{member.fullName}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>{member.email}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Phone</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.phone}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Employee ID</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.employeeId}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Department</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.department}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Designation</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.designation}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Role</span><Badge variant="blue">{member.role}</Badge></div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Status</span>
                      <Badge variant={member.status === 'ACTIVE' ? 'green' : (member.status === 'PENDING_INVITE' || member.status === 'Pending Invite' ? 'yellow' : 'gray')}>
                        {member.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Reporting Manager</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.reportingManager || '—'}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Joined On</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{new Date(member.joinedAt).toLocaleDateString()}</span></div>
                    <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Last Active</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.lastActive ? new Date(member.lastActive).toLocaleString() : 'Never'}</span></div>
                  </div>

                  {member.mentorProfile && (
                    <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Mentor Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Mentorship Mode</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.mentorProfile.mentorshipMode}</span></div>
                        <div><span style={{ fontSize: '13px', color: '#64748B', display: 'block' }}>Capacity</span><span style={{ fontWeight: 500, color: '#1E293B' }}>{member.mentorProfile.activeStudentCount} / {member.mentorProfile.maxCapacity}</span></div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Exam Scope</span>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {member.examScopes?.map((e: string) => <Badge key={e} variant="gray">{e}</Badge>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            },
            {
              label: 'Role & Permissions',
              content: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1E293B' }}>Assigned Role: {member.role}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Permissions are inherited directly from this role.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/team/roles-permissions`)}>View Role Details</Button>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Inherited Permissions (Read Only)</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {member.rolePermissions?.map((p: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ color: '#10B981', fontSize: '14px' }}>✓</div>
                          <span style={{ color: '#334155', fontSize: '13px' }}>{p}</span>
                        </div>
                      ))}
                      {(!member.rolePermissions || member.rolePermissions.length === 0) && (
                        <span style={{ color: '#64748B', fontSize: '13px' }}>No permissions assigned to this role.</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            },
            {
              label: 'Module Access',
              content: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Member Module Scope</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {member.adminModuleAccess?.length > 0 
                        ? member.adminModuleAccess.map((m: string) => <Badge key={m} variant="light">{m.replace('_', ' ')}</Badge>)
                        : <span style={{ color: '#64748B', fontSize: '13px' }}>No modules selected</span>
                      }
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Exam Scope</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {member.examScopes?.length > 0
                        ? member.examScopes.map((e: string) => <Badge key={e} variant="gray">{e}</Badge>)
                        : <span style={{ color: '#64748B', fontSize: '13px' }}>No exams selected</span>
                      }
                    </div>
                  </div>
                </div>
              )
            },
            {
              label: 'Activity Logs',
              content: (
                <div style={{ marginTop: '24px' }}>
                  <p style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
                    Activity logs will be displayed here.
                  </p>
                </div>
              )
            }
          ]}
        />
      </div>
    </Drawer>
  );
};
