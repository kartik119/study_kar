import React, { useEffect } from 'react';
import { Drawer, Badge, Tabs, Table } from '@study-karnataka/ui';
import { useRoles } from '../../hooks/useRoles';

interface RoleDetailsDrawerProps {
  roleId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoleDetailsDrawer: React.FC<RoleDetailsDrawerProps> = ({ roleId, isOpen, onClose }) => {
  const { getRole, loading } = useRoles();
  const [role, setRole] = React.useState<any>(null);

  useEffect(() => {
    if (roleId && isOpen) {
      getRole(roleId).then(data => setRole(data));
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
              {role.isSystem && <Badge variant="blue">System Role</Badge>}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontFamily: 'monospace' }}>Code: {role.code}</p>
          </div>
          <Badge variant={role.isActive ? 'green' : 'red'}>{role.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>

        <Tabs
          tabs={[
            {
              label: 'Overview',
              content: (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Description</label>
                    <p style={{ margin: '4px 0 0 0', color: '#1E293B' }}>{role.description || 'No description provided.'}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Scope Policy</label>
                      <p style={{ margin: '4px 0 0 0', color: '#1E293B' }}>{role.scopePolicy}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Permission Count</label>
                      <p style={{ margin: '4px 0 0 0', color: '#1E293B' }}>{role.permissions?.length || 0}</p>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px', display: 'block' }}>Allowed Modules</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {role.modules?.map((m: string) => <Badge key={m} variant="light">{m}</Badge>)}
                      {(!role.modules || role.modules.length === 0) && <span style={{ color: '#64748B', fontSize: '14px' }}>None</span>}
                    </div>
                  </div>
                </div>
              )
            },
            {
              label: 'Permissions',
              content: (
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
              label: 'Assigned Members',
              content: (
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
            }
          ]}
        />
      </div>
    </Drawer>
  );
};
