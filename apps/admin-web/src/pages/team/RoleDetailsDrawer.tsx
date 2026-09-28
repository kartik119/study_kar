// @ts-nocheck
import React, { useEffect } from 'react';
import { Drawer, Badge, Tabs, Table } from '@study-karnataka/ui';
import { useRoles } from '../../hooks/useRoles';

interface RoleDetailsDrawerProps {
  roleId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoleDetailsDrawer: React.FC<RoleDetailsDrawerProps> = ({ roleId, isOpen, onClose }) => {
  const { getRole, getRoleActivity, loading } = useRoles();
  const [role, setRole] = React.useState<any>(null);
  const [activities, setActivities] = React.useState<any[]>([]);

  useEffect(() => {
    if (roleId && isOpen) {
      getRole(roleId).then(data => setRole(data));
      getRoleActivity(roleId).then(data => setActivities(data?.data || []));
    }
  }, [roleId, isOpen]);

  if (!role) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Role Details" size="lg">
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {role.name}
              {role.isSystem && <Badge variant="info">System Role</Badge>}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontFamily: 'monospace' }}>Code: {role.code}</p>
          </div>
          <Badge variant={role.isActive ? 'green' : 'red'}>{role.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>

        <Tabs
          tabs={[
            {
              label: 'Overview',
              children: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Description</label>
                    <p style={{ margin: '4px 0 0 0', color: '#1E293B' }}>{role.description || 'No description provided.'}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Permission Count</label>
                      <p style={{ margin: '4px 0 0 0', color: '#1E293B' }}>{role.permissions?.length || 0}</p>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px', display: 'block' }}>Allowed Modules</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {role.modules?.map((m: string) => <Badge key={m} variant="neutral">{m}</Badge>)}
                      {(!role.modules || role.modules.length === 0) && <span style={{ color: '#64748B', fontSize: '14px' }}>None</span>}
                    </div>
                  </div>
                </div>
              )
            },
            {
              label: 'Permissions',
              children: (
                <div style={{ marginTop: '24px' }}>
                  {role.permissions && role.permissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {role.permissions.map((p: any) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', fontSize: '10px' }}>✓</div>
                          <span style={{ color: '#334155', fontSize: '14px' }}>{p.name} <span style={{ color: '#94A3B8', fontSize: '12px' }}>({p.code})</span></span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748B' }}>No permissions assigned.</p>
                  )}
                </div>
              )
            },
            {
              label: 'Scope Policy',
              children: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Global Scope Policy</h5>
                    <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{role.scopePolicy || 'No policy defined'}</p>
                  </div>
                  {role.scopePolicy === 'RESTRICTED' && (
                    <div style={{ backgroundColor: '#FFFBEB', padding: '16px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#92400E' }}>Restriction Rules</h5>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400E', fontSize: '13px' }}>
                        {role.restrictions?.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        )) || <li>No explicit restrictions listed.</li>}
                      </ul>
                    </div>
                  )}
                  <div style={{ backgroundColor: '#F0F9FF', padding: '16px', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#0369A1' }}>Module Access</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {role.modules?.map((m: string) => (
                        <Badge key={m} variant="blue">{m}</Badge>
                      )) || <span style={{ color: '#0369A1', fontSize: '13px' }}>No modules allowed</span>}
                    </div>
                  </div>
                </div>
              )
            },
            {
              label: 'Assigned Members',
              children: (
                <div style={{ marginTop: '24px' }}>
                  {role.assignedMembers && role.assignedMembers.length > 0 ? (
                    <Table
                      columns={[
                        { key: 'name', label: 'Name', render: (r: any) => <span style={{ fontWeight: 500, color: '#1E293B' }}>{r.name}</span> },
                        { key: 'email', label: 'Email', render: (r: any) => <span style={{ color: '#64748B' }}>{r.email}</span> },
                        { key: 'status', label: 'Status', render: (r: any) => <Badge variant={r.status === 'ACTIVE' ? 'green' : 'gray'}>{r.status}</Badge> }
                      ]}
                      data={role.assignedMembers}
                      keyField="id"
                    />
                  ) : (
                    <p style={{ color: '#64748B' }}>No members currently assigned to this role.</p>
                  )}
                </div>
              )
            },
            {
              label: 'Activity',
              children: (
                <div style={{ marginTop: '24px' }}>
                  {activities && activities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activities.map((act: any) => (
                        <div key={act.id} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <Badge variant="blue">{act.action}</Badge>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              {new Date(act.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1E293B' }}>
                            Performed by: <span style={{ fontWeight: 600 }}>{act.adminUser?.fullName || 'System'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748B' }}>No recent activity for this role.</p>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>
    </Drawer>
  );
};
